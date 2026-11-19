"use client";

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import type { CelluleSport, LigneBilan, MatriceSportMois as Matrice } from "@/lib/calculs";
import { formatEuro, formatMoisCourt, formatMoisLong, formatPct } from "@/lib/format";
import { DefilementTableau, Montant, celluleFigee, ligneTotal } from "../ui";

const attenue = { color: "text.secondary" };
const couleurSi = (n: number, couleur: string) => (n ? { color: couleur } : attenue);

/** Bilan par mois : 13 mois + « Total (1 an) ». */
export function TableauMensuel({ mois, total }: { mois: LigneBilan[]; total: LigneBilan }) {
  const ligne = (l: LigneBilan, entete: string, estTotal = false) => (
    <TableRow key={l.mois} hover={!estTotal} sx={estTotal ? ligneTotal : undefined}>
      <TableCell component="th" scope="row" sx={celluleFigee}>
        {entete}
      </TableCell>
      <TableCell align="right" sx={couleurSi(l.gagnes, "success.main")}>
        {l.gagnes}
      </TableCell>
      <TableCell align="right" sx={couleurSi(l.perdus, "error.main")}>
        {l.perdus}
      </TableCell>
      <TableCell align="right">{l.total}</TableCell>
      <TableCell align="right">{formatPct(l.pct)}</TableCell>
      <TableCell align="right" sx={l.mise ? undefined : attenue}>
        {formatEuro(l.mise)}
      </TableCell>
      <TableCell align="right">
        <Montant valeur={l.benefice} />
      </TableCell>
    </TableRow>
  );
  return (
    <DefilementTableau libelle="Bilan par mois">
      <Table size="small" aria-label="Bilan par mois">
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Mois</TableCell>
            <TableCell align="right">Gagnés</TableCell>
            <TableCell align="right">Perdus</TableCell>
            <TableCell align="right">Total matchs</TableCell>
            <TableCell align="right">% réussite</TableCell>
            <TableCell align="right">Misé</TableCell>
            <TableCell align="right">Bénéfice / perte</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mois.map((l) => ligne(l, formatMoisLong(l.mois)))}
          {ligne(total, "Total (1 an)", true)}
        </TableBody>
      </Table>
    </DefilementTableau>
  );
}

/** Bilan par sport sur l'année, dernière ligne « Tous sports ». */
export function TableauSports({ lignes }: { lignes: (CelluleSport & { id: string; nom: string; total: number })[] }) {
  return (
    <DefilementTableau libelle="Bilan par sport">
      <Table size="small" aria-label="Bilan par sport sur l'année">
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Sport</TableCell>
            <TableCell align="right">Gagnés</TableCell>
            <TableCell align="right">Perdus</TableCell>
            <TableCell align="right">Total matchs</TableCell>
            <TableCell align="right">% réussite</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.id} hover={l.id !== "tous"} sx={l.id === "tous" ? ligneTotal : undefined}>
              <TableCell component="th" scope="row" sx={celluleFigee}>
                {l.nom}
              </TableCell>
              <TableCell align="right" sx={couleurSi(l.gagnes, "success.main")}>
                {l.gagnes}
              </TableCell>
              <TableCell align="right" sx={couleurSi(l.perdus, "error.main")}>
                {l.perdus}
              </TableCell>
              <TableCell align="right">{l.total}</TableCell>
              <TableCell align="right">{formatPct(l.pct)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    return n === 0 ? (
      <Box component="span" sx={attenue}>
        0
      </Box>
    ) : (
      n
    );
  };
  return (
    <DefilementTableau libelle={titre}>
      <Table size="small" aria-label={`${titre} par sport et par mois`}>
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Sport</TableCell>
            {matrice.mois.map((m) => (
              <TableCell key={m} align="right">
                <Tooltip title={formatMoisLong(m)}>
                  <abbr title={formatMoisLong(m)} style={{ textDecoration: "none" }}>
                    {formatMoisCourt(m)}
                  </abbr>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrice.lignes.map((l) => (
            <TableRow key={l.id} hover={l.id !== "tous"} sx={l.id === "tous" ? ligneTotal : undefined}>
              <TableCell component="th" scope="row" sx={celluleFigee}>
                {l.nom}
              </TableCell>
              {l.parMois.map((c, i) => (
                <TableCell key={matrice.mois[i]} align="right">
                  {valeur(c)}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {valeur(l.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DefilementTableau>
  );
}
