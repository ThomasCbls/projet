"use client";

import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import type { SxProps, Theme } from "@mui/material/styles";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";
import { Chargement, DefilementTableau, EnTetePage, celluleFigee } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { type ResumeJour, pourcentage, resumesPeriode } from "@/lib/calculs";
import { aujourdhuiIso, cleMois, finPeriode, moisDeLaPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatEuroSigne, formatMoisLong, formatPct, jourSemaine } from "@/lib/format";
import { aActivite } from "@/lib/tableauDeBord";

/** Surcouche teintée qui garde opaque la colonne figée. */
const teinte = "linear-gradient(var(--mui-palette-action-hover), var(--mui-palette-action-hover))";

/**
 * Le corps du tableau (jusqu'à 366 lignes) est en HTML simple : ses styles, calqués
 * sur les cellules MUI de l'en-tête, sont déclarés une seule fois ici. Instancier
 * ~2 900 composants TableRow / TableCell coûtait près d'une seconde sur mobile.
 */
const styleTableau: SxProps<Theme> = {
  "& tbody th, & tbody td": {
    py: "6px",
    px: 2,
    borderBottom: "1px solid var(--mui-palette-TableCell-border)",
    typography: "body2",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  "& tbody th, & tbody td.jour": { textAlign: "left", fontWeight: 400 },
  "& tbody tr.cliquable:hover > *": { backgroundImage: teinte },
  "& tbody tr.total > *": { fontWeight: 700, backgroundImage: teinte },
  "& .fige": celluleFigee,
  "& .jour": { display: { xs: "none", sm: "table-cell" }, color: "text.secondary" },
  "& .attenue": { color: "text.secondary" },
  "& .gagne": { color: "success.main" },
  "& .perdu": { color: "error.main" },
  "& tbody tr.cliquable": { cursor: "pointer" },
  "& .lien": {
    color: "inherit",
    fontWeight: 500,
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" },
  },
  "& .lien.aujourdhui": { color: "primary.main", fontWeight: 700 },
  "& .date-courte": { display: { sm: "none" } },
  "& .date-longue": { display: { xs: "none", sm: "inline" } },
};

const classeMontant = (n: number) => {
  const arrondi = Math.round(n * 100) / 100;
  return arrondi > 0 ? "gagne" : arrondi < 0 ? "perdu" : "attenue";
};

const LigneJour = memo(function LigneJour({
  r,
  estAujourdhui,
  ouvrir,
}: {
  r: ResumeJour;
  estAujourdhui: boolean;
  ouvrir: (date: string) => void;
}) {
  const date = formatDateCourte(r.date);
  return (
    <tr className="cliquable" onClick={() => ouvrir(r.date)} aria-current={estAujourdhui ? "date" : undefined}>
      <th scope="row" className="fige">
        <Link
          href={`/saisie?date=${r.date}`}
          prefetch={false}
          className={estAujourdhui ? "lien aujourdhui" : "lien"}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="date-courte">{date.slice(0, -5)}</span>
          <span className="date-longue">{date.slice(4)}</span>
        </Link>
      </th>
      <td className="jour">{jourSemaine(r.date)}</td>
      <td className={r.gagnes ? "gagne" : "attenue"}>{r.gagnes}</td>
      <td className={r.perdus ? "perdu" : "attenue"}>{r.perdus}</td>
      <td>{formatPct(r.pct)}</td>
      <td className={r.mise ? undefined : "attenue"}>{formatEuro(r.mise)}</td>
      <td className={classeMontant(r.benefice)}>{r.benefice === 0 ? formatEuro(0) : formatEuroSigne(r.benefice)}</td>
    </tr>
  );
});

export default function PageHistorique() {
  const { data } = useDonnees();
  const router = useRouter();
  const [mois, setMois] = useState("tous");
  const [masquerVides, setMasquerVides] = useState(false);

  const resumes = useMemo(() => (data ? resumesPeriode(data) : []), [data]);
  const lignes = useMemo(
    () =>
      resumes.filter((r) => {
        if (mois !== "tous" && cleMois(r.date) !== mois) return false;
        if (masquerVides && !aActivite(r)) return false;
        return true;
      }),
    [resumes, mois, masquerVides],
  );
  // Fonction stable : les lignes mémorisées ne se réaffichent pas inutilement.
  const ouvrir = useMemo(() => (date: string) => router.push(`/saisie?date=${date}`), [router]);

  if (!data) return <Chargement />;

  const listeMois = moisDeLaPeriode(data.dateDebut);
  const aujourdhui = aujourdhuiIso();
  const somme = (k: "gagnes" | "perdus" | "mise" | "benefice") => lignes.reduce((s, r) => s + r[k], 0);
  const tg = somme("gagnes");
  const tp = somme("perdus");
  const tb = somme("benefice");

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
          <Typography sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>Aucun jour à afficher.</Typography>
        ) : (
          <DefilementTableau libelle="Historique des jours">
            <Table
              size="small"
              aria-label="Historique jour par jour. Cliquer sur une date pour ouvrir le jour."
              sx={styleTableau}
            >
              <TableHead>
                <TableRow>
                  <TableCell className="fige">Date</TableCell>
                  <TableCell className="jour">Jour</TableCell>
                  <TableCell align="right">Gagnés</TableCell>
                  <TableCell align="right">Perdus</TableCell>
                  <TableCell align="right">% réussite</TableCell>
                  <TableCell align="right">Misé</TableCell>
                  <TableCell align="right">Bénéfice</TableCell>
                </TableRow>
              </TableHead>
              <tbody>
                {lignes.map((r) => (
                  <LigneJour key={r.date} r={r} estAujourdhui={r.date === aujourdhui} ouvrir={ouvrir} />
                ))}
                <tr className="total">
                  <th scope="row" className="fige">
                    Total
                  </th>
                  <td className="jour" />
                  <td>{tg}</td>
                  <td>{tp}</td>
                  <td>{formatPct(pourcentage(tg, tp))}</td>
                  <td>{formatEuro(somme("mise"))}</td>
                  <td className={classeMontant(tb)}>{formatEuroSigne(tb)}</td>
                </tr>
              </tbody>
            </Table>
          </DefilementTableau>
        )}
      </Card>
    </>
  );
}
