"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chargement, DefilementTableau, EnTetePage, Montant, celluleFigee, ligneTotal } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { pourcentage, resumesPeriode } from "@/lib/calculs";
import { aujourdhuiIso, cleMois, finPeriode, moisDeLaPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatMoisLong, formatPct, jourSemaine } from "@/lib/format";
import { aActivite } from "@/lib/tableauDeBord";

const attenue = { color: "text.secondary" };

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
    if (masquerVides && !aActivite(r)) return false;
    return true;
  });
  const somme = (k: "gagnes" | "perdus" | "mise" | "benefice") => lignes.reduce((s, r) => s + r[k], 0);
  const tg = somme("gagnes");
  const tp = somme("perdus");

  return (
    <>
      <EnTetePage
        titre="Historique"
        sousTitre={`Du ${formatDateCourte(data.dateDebut)} au ${formatDateCourte(finPeriode(data.dateDebut))}`}
      />

      <Card sx={{ mb: 2.5, p: { xs: 2, sm: 2.5 }, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <TextField
          select
          label="Mois"
          value={mois}
          onChange={(e) => setMois(e.target.value)}
          sx={{ minWidth: 220, flex: { xs: 1, sm: "none" } }}
        >
          <MenuItem value="tous">Toute la période</MenuItem>
          {listeMois.map((m) => (
            <MenuItem key={m} value={m}>
              {formatMoisLong(m)}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={masquerVides} onChange={(e) => setMasquerVides(e.target.checked)} />}
          label="Masquer les jours sans saisie"
        />
      </Card>

      <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
        {lignes.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: "center", ...attenue }}>Aucun jour à afficher.</Typography>
        ) : (
          <DefilementTableau libelle="Historique des jours">
            <Table size="small" aria-label="Historique jour par jour. Cliquer sur une date pour ouvrir le jour.">
              <TableHead>
                <TableRow>
                  <TableCell sx={celluleFigee}>Date</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Jour</TableCell>
                  <TableCell align="right">Gagnés</TableCell>
                  <TableCell align="right">Perdus</TableCell>
                  <TableCell align="right">% réussite</TableCell>
                  <TableCell align="right">Misé</TableCell>
                  <TableCell align="right">Bénéfice</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.map((r) => {
                  const estAujourdhui = r.date === aujourdhui;
                  return (
                    <TableRow
                      key={r.date}
                      hover
                      onClick={() => router.push(`/saisie?date=${r.date}`)}
                      aria-current={estAujourdhui ? "date" : undefined}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell component="th" scope="row" sx={celluleFigee}>
                        <Box
                          component={Link}
                          href={`/saisie?date=${r.date}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          sx={{
                            color: estAujourdhui ? "primary.main" : "inherit",
                            fontWeight: estAujourdhui ? 700 : 500,
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          <Box component="span" sx={{ display: { sm: "none" } }}>
                            {formatDateCourte(r.date).slice(0, -5)}
                          </Box>
                          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                            {formatDateCourte(r.date).slice(4)}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, ...attenue }}>{jourSemaine(r.date)}</TableCell>
                      <TableCell align="right" sx={r.gagnes ? { color: "success.main" } : attenue}>
                        {r.gagnes}
                      </TableCell>
                      <TableCell align="right" sx={r.perdus ? { color: "error.main" } : attenue}>
                        {r.perdus}
                      </TableCell>
                      <TableCell align="right">{formatPct(r.pct)}</TableCell>
                      <TableCell align="right" sx={r.mise ? undefined : attenue}>
                        {formatEuro(r.mise)}
                      </TableCell>
                      <TableCell align="right">
                        {r.benefice === 0 ? <Box component="span" sx={attenue}>{formatEuro(0)}</Box> : <Montant valeur={r.benefice} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={ligneTotal}>
                  <TableCell component="th" scope="row" sx={celluleFigee}>
                    Total
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }} />
                  <TableCell align="right">{tg}</TableCell>
                  <TableCell align="right">{tp}</TableCell>
                  <TableCell align="right">{formatPct(pourcentage(tg, tp))}</TableCell>
                  <TableCell align="right">{formatEuro(somme("mise"))}</TableCell>
                  <TableCell align="right">
                    <Montant valeur={somme("benefice")} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DefilementTableau>
        )}
      </Card>
    </>
  );
}
