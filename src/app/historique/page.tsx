"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Carte, Chargement, DefilementTableau, Montant, TitrePage } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { pourcentage, resumesPeriode } from "@/lib/calculs";
import { aujourdhuiIso, cleMois, finPeriode, moisDeLaPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatMoisLong, formatPct, jourSemaine } from "@/lib/format";

export default function PageHistorique() {
  const { data } = useDonnees();
  const router = useRouter();
  const [mois, setMois] = useState("tous");
  const [masquerVides, setMasquerVides] = useState(false);

  const resumes = useMemo(() => (data ? resumesPeriode(data) : []), [data]);
  if (!data) return <Chargement />;

  const listeMois = moisDeLaPeriode(data.dateDebut);
  const aujourdhui = aujourdhuiIso();
  const lignes = resumes.filter((r) => {
    if (mois !== "tous" && cleMois(r.date) !== mois) return false;
    if (masquerVides && r.gagnes + r.perdus === 0 && r.mise === 0 && r.benefice === 0) return false;
    return true;
  });
  const somme = (k: "gagnes" | "perdus" | "mise" | "benefice") => lignes.reduce((s, r) => s + r[k], 0);
  const tg = somme("gagnes");
  const tp = somme("perdus");

  return (
    <div>
      <TitrePage sousTitre={`Du ${formatDateCourte(data.dateDebut)} au ${formatDateCourte(finPeriode(data.dateDebut))}`}>
        Historique
      </TitrePage>

      <Carte className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1 sm:flex-none">
            <label htmlFor="filtre-mois" className="mb-1 block text-xs font-medium text-attenue">
              Mois
            </label>
            <select id="filtre-mois" className="champ" value={mois} onChange={(e) => setMois(e.target.value)}>
              <option value="tous">Toute la période</option>
              {listeMois.map((m) => (
                <option key={m} value={m}>
                  {formatMoisLong(m)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={masquerVides}
              onChange={(e) => setMasquerVides(e.target.checked)}
            />
            Masquer les jours sans saisie
          </label>
        </div>
      </Carte>

      <Carte>
        {lignes.length === 0 ? (
          <p className="py-6 text-center text-attenue">Aucun jour à afficher.</p>
        ) : (
          <DefilementTableau libelle="Historique des jours">
            <table className="tableau">
              <caption className="sr-only">
                Historique jour par jour : matchs gagnés, perdus, pourcentage de réussite, mise et bénéfice. Cliquer
                sur une date pour ouvrir le jour.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="fige">
                    Date
                  </th>
                  <th scope="col" className="hidden !text-left sm:table-cell">
                    Jour
                  </th>
                  <th scope="col">Gagnés</th>
                  <th scope="col">Perdus</th>
                  <th scope="col">% réussite</th>
                  <th scope="col">Misé</th>
                  <th scope="col">Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((r) => (
                  <tr
                    key={r.date}
                    className="cliquable"
                    onClick={() => router.push(`/?date=${r.date}`)}
                    aria-current={r.date === aujourdhui ? "date" : undefined}
                  >
                    <th scope="row" className="fige">
                      <Link
                        href={`/?date=${r.date}`}
                        className={`underline-offset-2 hover:underline ${r.date === aujourdhui ? "font-bold text-accent" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="sm:hidden">{formatDateCourte(r.date).slice(0, -5)}</span>
                        <span className="hidden sm:inline">{formatDateCourte(r.date).slice(4)}</span>
                      </Link>
                    </th>
                    <td className="hidden !text-left text-attenue sm:table-cell">{jourSemaine(r.date)}</td>
                    <td className={r.gagnes ? "text-gagne" : "text-attenue"}>{r.gagnes}</td>
                    <td className={r.perdus ? "text-perdu" : "text-attenue"}>{r.perdus}</td>
                    <td>{formatPct(r.pct)}</td>
                    <td className={r.mise ? "" : "text-attenue"}>{formatEuro(r.mise)}</td>
                    <td>{r.benefice === 0 ? <span className="text-attenue">{formatEuro(0)}</span> : <Montant valeur={r.benefice} />}</td>
                  </tr>
                ))}
                <tr className="total">
                  <th scope="row" className="fige">
                    Total
                  </th>
                  <td className="hidden sm:table-cell" />
                  <td>{tg}</td>
                  <td>{tp}</td>
                  <td>{formatPct(pourcentage(tg, tp))}</td>
                  <td>{formatEuro(somme("mise"))}</td>
                  <td>
                    <Montant valeur={somme("benefice")} />
                  </td>
                </tr>
              </tbody>
            </table>
          </DefilementTableau>
        )}
      </Carte>
    </div>
  );
}
