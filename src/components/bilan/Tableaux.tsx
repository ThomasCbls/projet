import type { CelluleSport, LigneBilan, MatriceSportMois as Matrice } from "@/lib/calculs";
import { formatEuro, formatMoisCourt, formatMoisLong, formatPct } from "@/lib/format";
import { DefilementTableau, Montant } from "../ui";

/** Bilan par mois : 13 mois + « Total (1 an) ». */
export function TableauMensuel({ mois, total }: { mois: LigneBilan[]; total: LigneBilan }) {
  const ligne = (l: LigneBilan, entete: string, estTotal = false) => (
    <tr key={l.mois} className={estTotal ? "total" : undefined}>
      <th scope="row" className="fige">
        {entete}
      </th>
      <td className={l.gagnes ? "text-gagne" : ""}>{l.gagnes}</td>
      <td className={l.perdus ? "text-perdu" : ""}>{l.perdus}</td>
      <td>{l.total}</td>
      <td>{formatPct(l.pct)}</td>
      <td>{formatEuro(l.mise)}</td>
      <td>
        <Montant valeur={l.benefice} />
      </td>
    </tr>
  );
  return (
    <DefilementTableau libelle="Bilan par mois">
      <table className="tableau">
        <caption className="sr-only">Bilan par mois</caption>
        <thead>
          <tr>
            <th scope="col" className="fige">
              Mois
            </th>
            <th scope="col">Gagnés</th>
            <th scope="col">Perdus</th>
            <th scope="col">Total matchs</th>
            <th scope="col">% réussite</th>
            <th scope="col">Misé</th>
            <th scope="col">Bénéfice / perte</th>
          </tr>
        </thead>
        <tbody>
          {mois.map((l) => ligne(l, formatMoisLong(l.mois)))}
          {ligne(total, "Total (1 an)", true)}
        </tbody>
      </table>
    </DefilementTableau>
  );
}

/** Bilan par sport sur l'année, dernière ligne « Tous sports ». */
export function TableauSports({ lignes }: { lignes: (CelluleSport & { id: string; nom: string; total: number })[] }) {
  return (
    <DefilementTableau libelle="Bilan par sport">
      <table className="tableau">
        <caption className="sr-only">Bilan par sport sur l&apos;année</caption>
        <thead>
          <tr>
            <th scope="col" className="fige">
              Sport
            </th>
            <th scope="col">Gagnés</th>
            <th scope="col">Perdus</th>
            <th scope="col">Total matchs</th>
            <th scope="col">% réussite</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} className={l.id === "tous" ? "total" : undefined}>
              <th scope="row" className="fige">
                {l.nom}
              </th>
              <td className={l.gagnes ? "text-gagne" : ""}>{l.gagnes}</td>
              <td className={l.perdus ? "text-perdu" : ""}>{l.perdus}</td>
              <td>{l.total}</td>
              <td>{formatPct(l.pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DefilementTableau>
  );
}

/** Matrice sport × mois pour une mesure (gagnés, perdus ou %). */
export function TableauMatrice({
  matrice,
  mesure,
  titre,
}: {
  matrice: Matrice;
  mesure: "gagnes" | "perdus" | "pct";
  titre: string;
}) {
  const valeur = (c: CelluleSport) => {
    if (mesure === "pct") return formatPct(c.pct);
    const n = c[mesure];
    return n === 0 ? <span className="text-attenue">0</span> : n;
  };
  return (
    <DefilementTableau libelle={titre}>
      <table className="tableau">
        <caption className="sr-only">{titre} par sport et par mois</caption>
        <thead>
          <tr>
            <th scope="col" className="fige">
              Sport
            </th>
            {matrice.mois.map((m) => (
              <th key={m} scope="col">
                <abbr title={formatMoisLong(m)} className="no-underline">
                  {formatMoisCourt(m)}
                </abbr>
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrice.lignes.map((l) => (
            <tr key={l.id} className={l.id === "tous" ? "total" : undefined}>
              <th scope="row" className="fige">
                {l.nom}
              </th>
              {l.parMois.map((c, i) => (
                <td key={matrice.mois[i]}>{valeur(c)}</td>
              ))}
              <td className="font-semibold">{valeur(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DefilementTableau>
  );
}
