"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useDonnees } from "@/hooks/useDonnees";
import { resumeJour, statsParisJour } from "@/lib/calculs";
import { ajouterJours, aujourdhuiIso, bornerDate, estDateIso, finPeriode } from "@/lib/dates";
import { formatDateCourte, formatDateLongue, formatNombre } from "@/lib/format";
import { type Jour, type Pari, type Resultat, type SportId, type TypeJour, SPORTS } from "@/lib/types";
import { IconeDroite, IconeGauche } from "../Icones";
import { Carte, Chargement, ChampNombre, Montant, Segments } from "../ui";
import { CarteSport } from "./CarteSport";
import { LignePari } from "./LignePari";
import { RecapJour } from "./RecapJour";

const btnNav =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-bord bg-carte px-3 text-sm font-medium hover:bg-carte-2 disabled:opacity-40 disabled:hover:bg-carte";

export function SaisieJour() {
  const { data, lireJour, majJour } = useDonnees();
  const router = useRouter();
  const params = useSearchParams();

  const debut = data?.dateDebut ?? "";
  const fin = debut ? finPeriode(debut) : "";
  const demande = params.get("date");
  const date = debut ? bornerDate(estDateIso(demande) ? demande : aujourdhuiIso(), debut) : "";

  const allerA = useCallback(
    (d: string) => {
      if (!debut || !estDateIso(d)) return;
      router.replace(`/?date=${bornerDate(d, debut)}`, { scroll: false });
    },
    [router, debut],
  );

  const jour = date ? lireJour(date) : null;
  const resume = useMemo(() => (jour ? resumeJour(date, jour) : null), [jour, date]);

  if (!data || !jour || !resume) return <Chargement />;

  const maj = (fn: (j: Jour) => Jour) => majJour(date, fn);
  const setMatch = (sport: SportId, i: number, v: Resultat) =>
    maj((j) => ({ ...j, matchs: { ...j.matchs, [sport]: j.matchs[sport].map((c, k) => (k === i ? v : c)) } }));
  const setPari = (i: number, p: Pari) => maj((j) => ({ ...j, paris: j.paris.map((x, k) => (k === i ? p : x)) }));
  const combine = jour.type === "combine";
  const stats = statsParisJour(jour);
  const hors = demande !== null && estDateIso(demande) && demande !== date;

  return (
    <div className="space-y-5">
      {/* Sélecteur de date */}
      <div className="rounded-xl border border-bord bg-carte p-3">
        <h1 className="mb-3 text-center text-xl font-bold" aria-live="polite">
          <span className="sr-only">Saisie du </span>
          <span aria-hidden="true">{formatDateCourte(date)}</span>
          <span className="sr-only">{formatDateLongue(date)}</span>
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className={btnNav}
            onClick={() => allerA(ajouterJours(date, -1))}
            disabled={date <= debut}
            aria-label="Jour précédent"
          >
            <IconeGauche className="h-5 w-5" />
          </button>
          <label className="sr-only" htmlFor="date-saisie">
            Choisir une date
          </label>
          <input
            id="date-saisie"
            type="date"
            className="champ w-auto"
            value={date}
            min={debut}
            max={fin}
            onChange={(e) => allerA(e.target.value)}
          />
          <button
            type="button"
            className={btnNav}
            onClick={() => allerA(ajouterJours(date, 1))}
            disabled={date >= fin}
            aria-label="Jour suivant"
          >
            <IconeDroite className="h-5 w-5" />
          </button>
          <button type="button" className={btnNav} onClick={() => allerA(aujourdhuiIso())}>
            Aujourd&apos;hui
          </button>
        </div>
        {hors && (
          <p className="mt-2 text-center text-xs text-attenue">
            Date hors de la période de suivi : affichage du jour le plus proche.
          </p>
        )}
      </div>

      {/* Matchs */}
      <section aria-labelledby="titre-matchs">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="titre-matchs" className="text-lg font-semibold">
            Matchs
          </h2>
          <p className="text-xs text-attenue">Toucher une case : vide → G → P → vide</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SPORTS.map((s) => (
            <CarteSport
              key={s.id}
              nom={s.nom}
              cases={jour.matchs[s.id]}
              onChange={(i, v) => setMatch(s.id, i, v)}
            />
          ))}
        </div>
      </section>

      {/* Paris */}
      <section aria-labelledby="titre-paris" className="space-y-2">
        <h2 id="titre-paris" className="text-lg font-semibold">
          Paris
        </h2>
        <Carte>
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <Segments<TypeJour>
              libelle="Type du jour"
              valeur={jour.type}
              onChange={(type) => maj((j) => ({ ...j, type }))}
              options={[
                { valeur: "simple", texte: "Simple" },
                { valeur: "combine", texte: "Combiné" },
              ]}
            />
            {combine && (
              <>
                <ChampNombre
                  libelle="Mise combiné"
                  suffixe="€"
                  valeur={jour.miseCombine}
                  onChange={(miseCombine) => maj((j) => ({ ...j, miseCombine }))}
                />
                <div>
                  <span className="mb-1 block text-xs font-medium text-attenue">Cote du combiné (calculée)</span>
                  <p className="chiffres flex min-h-11 items-center rounded-lg bg-carte-2 px-3 text-lg font-bold">
                    {formatNombre(stats.coteCombinee)}
                  </p>
                </div>
              </>
            )}
          </div>
          {combine && (
            <p className="mt-3 text-xs text-attenue">
              Les cotes des sélections se multiplient. Une seule sélection perdue et tout le combiné est perdu.
              Résultat actuel : <Montant valeur={stats.benefice} className="font-semibold" />
            </p>
          )}
        </Carte>
        <div className="grid gap-2 lg:grid-cols-2">
          {jour.paris.map((p, i) => (
            <LignePari key={i} numero={i + 1} pari={p} combine={combine} onChange={(np) => setPari(i, np)} />
          ))}
        </div>
      </section>

      {/* Récap */}
      <Carte titre="Récap du jour">
        <RecapJour resume={resume} />
      </Carte>
    </div>
  );
}
