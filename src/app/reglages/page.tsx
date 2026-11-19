"use client";

import { useRef, useState } from "react";
import { ChoixTheme } from "@/components/ThemeToggle";
import { Carte, Chargement, TitrePage } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { aujourdhuiIso, estDansPeriode, estDateIso, finPeriode, joursActifs } from "@/lib/dates";
import { formatDateCourte } from "@/lib/format";
import { ErreurImport, exporterJSON, importerJSON } from "@/lib/storage";
import type { AppData } from "@/lib/types";

const bouton =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50";
const boutonPrincipal = `${bouton} bg-accent text-accent-texte hover:opacity-90`;
const boutonSecondaire = `${bouton} border border-bord bg-carte hover:bg-carte-2`;
const boutonDanger = `${bouton} bg-perdu-fond text-white hover:opacity-90`;

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PageReglages() {
  const { data, setDateDebut, remplacer, reinitialiser } = useDonnees();
  const fichier = useRef<HTMLInputElement>(null);
  const [importEnAttente, setImportEnAttente] = useState<AppData | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [confirmerReset, setConfirmerReset] = useState(false);

  if (!data) return <Chargement />;

  const nbJoursSaisis = Object.keys(data.jours).length;
  const horsPeriode = Object.keys(data.jours).filter((d) => !estDansPeriode(d, data.dateDebut)).length;

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setImportEnAttente(importerJSON(await f.text()));
      setMessage(null);
    } catch (err) {
      setImportEnAttente(null);
      setMessage({ type: "erreur", texte: err instanceof ErreurImport ? err.message : "Import impossible." });
    }
  };

  return (
    <div className="space-y-5">
      <TitrePage>Réglages</TitrePage>

      {message && (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "erreur" ? "border-perdu text-perdu" : "border-gagne text-gagne"
          }`}
        >
          {message.texte}
        </p>
      )}

      <Carte titre="Période de suivi">
        <div className="grid gap-4 sm:grid-cols-[16rem_1fr] sm:items-end">
          <div>
            <label htmlFor="date-debut" className="mb-1 block text-xs font-medium text-attenue">
              Date de début de saisie
            </label>
            <input
              id="date-debut"
              type="date"
              className="champ"
              value={data.dateDebut}
              onChange={(e) => estDateIso(e.target.value) && setDateDebut(e.target.value)}
            />
          </div>
          <p className="text-sm text-attenue">
            Fin : <strong className="text-texte">{formatDateCourte(finPeriode(data.dateDebut))}</strong> (début + 1 an −
            1 jour) · {joursActifs(data.dateDebut).length} jours suivis.
          </p>
        </div>
        <p className="mt-3 text-xs text-attenue">
          Les saisies restent attachées à leur date : changer le début ne les décale pas. Les jours hors période sont
          conservés mais masqués{horsPeriode > 0 && ` (${horsPeriode} jour${horsPeriode > 1 ? "s" : ""} actuellement)`}.
        </p>
      </Carte>

      <Carte titre="Apparence">
        <ChoixTheme />
      </Carte>

      <Carte titre="Sauvegarde des données">
        <p className="mb-3 text-sm text-attenue">
          Les données sont enregistrées dans ce navigateur uniquement ({nbJoursSaisis} jour
          {nbJoursSaisis > 1 ? "s" : ""} saisi{nbJoursSaisis > 1 ? "s" : ""}). Exportez-les régulièrement pour les
          sauvegarder ou les transférer sur un autre appareil.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={boutonPrincipal}
            onClick={() => {
              telecharger(`suivi-sport-${aujourdhuiIso()}.json`, exporterJSON(data));
              setMessage({ type: "ok", texte: "Export JSON téléchargé." });
            }}
          >
            Exporter en JSON
          </button>
          <button type="button" className={boutonSecondaire} onClick={() => fichier.current?.click()}>
            Importer un JSON
          </button>
          <input
            ref={fichier}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Fichier JSON à importer"
            onChange={surFichier}
          />
        </div>

        {importEnAttente && (
          <div className="mt-4 rounded-lg border border-accent p-4" role="alertdialog" aria-labelledby="titre-import">
            <p id="titre-import" className="font-semibold">
              Remplacer les données actuelles ?
            </p>
            <p className="mt-1 text-sm text-attenue">
              Le fichier contient {Object.keys(importEnAttente.jours).length} jour(s) saisi(s), début le{" "}
              {formatDateCourte(importEnAttente.dateDebut)}. Les données actuelles seront remplacées.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={boutonPrincipal}
                onClick={() => {
                  remplacer(importEnAttente);
                  setImportEnAttente(null);
                  setMessage({ type: "ok", texte: "Données importées." });
                }}
              >
                Remplacer mes données
              </button>
              <button type="button" className={boutonSecondaire} onClick={() => setImportEnAttente(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </Carte>

      <Carte titre="Réinitialiser">
        <p className="mb-3 text-sm text-attenue">
          Efface toutes les saisies de ce navigateur et remet la date de début par défaut. Pensez à exporter avant.
        </p>
        {!confirmerReset ? (
          <button type="button" className={boutonSecondaire} onClick={() => setConfirmerReset(true)}>
            Réinitialiser les données…
          </button>
        ) : (
          <div className="rounded-lg border border-perdu p-4" role="alertdialog" aria-labelledby="titre-reset">
            <p id="titre-reset" className="font-semibold text-perdu">
              Supprimer définitivement {nbJoursSaisis} jour(s) de saisie ?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={boutonDanger}
                onClick={async () => {
                  await reinitialiser();
                  setConfirmerReset(false);
                  setMessage({ type: "ok", texte: "Données réinitialisées." });
                }}
              >
                Oui, tout supprimer
              </button>
              <button type="button" className={boutonSecondaire} onClick={() => setConfirmerReset(false)} autoFocus>
                Annuler
              </button>
            </div>
          </div>
        )}
      </Carte>
    </div>
  );
}
