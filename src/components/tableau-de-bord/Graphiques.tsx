"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarChart, barClasses } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { LineChart, lineClasses } from "@mui/x-charts/LineChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { useThemeSombre } from "@/components/Theme";
import type { LigneBilan, PointCumul } from "@/lib/calculs";
import { formatDateCourte, formatEuro, formatEuroSigne, formatMoisCourt, formatMoisLong, formatPct } from "@/lib/format";
import type { LigneSport } from "@/lib/tableauDeBord";
import { COULEURS_GRAPHIQUES } from "@/theme/constantes";

/** Couleurs des graphiques pour le thème affiché (chaque thème a ses propres teintes). */
export function useCouleurs() {
  return COULEURS_GRAPHIQUES[useThemeSombre() ? "dark" : "light"];
}

/** Barres fines aux extrémités arrondies, espace de 2px (couleur du fond) entre segments empilés. */
const styleBarres = {
  [`& .${barClasses.element}`]: { stroke: "var(--mui-palette-background-paper)", strokeWidth: 2 },
};

/** Grille et axes discrets. */
const styleAxes = {
  "& .MuiChartsGrid-line": { stroke: "var(--mui-palette-divider)" },
  "& .MuiChartsAxis-line": { stroke: "var(--mui-palette-divider)" },
  "& .MuiChartsAxis-tick": { stroke: "var(--mui-palette-divider)" },
  "& .MuiChartsAxis-tickLabel": { fill: "var(--mui-palette-text-secondary)" },
};

/** « +12 € » sans décimales inutiles pour les graduations. */
const euroCourt = (v: number) => formatEuro(v).replace(/,00(?=\s?€)/, "");

/** « 2026-11 » → « nov. » (l'année reste dans l'infobulle). */
const moisSeul = (cle: string) => formatMoisCourt(cle).split(" ")[0];

/** Axe des mois : nom court en graduation, mois complet dans l'infobulle. */
const axeMois = (mois: LigneBilan[]) => ({
  scaleType: "band" as const,
  data: mois.map((l) => l.mois),
  valueFormatter: (m: string, ctx: { location: string }) => (ctx.location === "tick" ? moisSeul(m) : formatMoisLong(m)),
  categoryGapRatio: 0.45,
});

/** Message centré quand un graphique n'a rien à montrer. */
export function GraphiqueVide({ hauteur, texte }: { hauteur: number; texte: string }) {
  return (
    <Box
      sx={{
        height: hauteur,
        display: "grid",
        placeItems: "center",
        border: 1,
        borderStyle: "dashed",
        borderColor: "bt.lineStrong",
        borderRadius: "12px",
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {texte}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Bénéfice cumulé                                                     */
/* ------------------------------------------------------------------ */

export function GraphBeneficeCumule({ points, hauteur = 300 }: { points: PointCumul[]; hauteur?: number }) {
  const c = useCouleurs();
  if (points.length === 0) return <GraphiqueVide hauteur={hauteur} texte="Aucun pari saisi pour l'instant." />;
  const dernier = points.length - 1;
  const dates = points.map((p) => p.date);
  // Une graduation au premier jour saisi de chaque mois ; sur un seul mois, ~6 graduations.
  const plusieursMois = new Set(dates.map((d) => d.slice(0, 7))).size > 1;
  const pas = Math.max(1, Math.ceil(dates.length / 6));
  return (
    <LineChart
      height={hauteur}
      margin={{ left: 0, right: 16, top: 16, bottom: 0 }}
      grid={{ horizontal: true }}
      hideLegend
      skipAnimation
      xAxis={[
        {
          scaleType: "point",
          data: dates,
          tickInterval: (d: string, i: number) =>
            plusieursMois ? i === 0 || d.slice(0, 7) !== dates[i - 1].slice(0, 7) : i % pas === 0,
          valueFormatter: (d: string, ctx) =>
            ctx.location !== "tick"
              ? formatDateCourte(d)
              : plusieursMois
                ? moisSeul(d.slice(0, 7))
                : formatDateCourte(d).slice(4, -5),
          tickLabelMinGap: 16,
        },
      ]}
      yAxis={[{ width: 64, valueFormatter: (v: number) => euroCourt(v) }]}
      series={[
        {
          data: points.map((p) => p.cumul),
          label: "Bénéfice cumulé",
          color: c.serie,
          area: true,
          curve: "monotoneX",
          showMark: ({ index }) => index === dernier,
          valueFormatter: (v) => (v === null ? "–" : formatEuroSigne(v)),
        },
      ]}
      sx={{
        ...styleAxes,
        [`& .${lineClasses.area}`]: { fillOpacity: 0.16 },
        [`& .${lineClasses.line}`]: { strokeWidth: 2.5 },
        [`& .${lineClasses.mark}`]: { stroke: "var(--mui-palette-background-paper)", strokeWidth: 2 },
      }}
    >
      <ChartsReferenceLine y={0} lineStyle={{ stroke: "var(--mui-palette-bt-lineStrong)", strokeDasharray: "4 4" }} />
    </LineChart>
  );
}

/* ------------------------------------------------------------------ */
/* Bénéfice par mois                                                   */
/* ------------------------------------------------------------------ */

export function GraphBeneficeParMois({ mois, hauteur = 280 }: { mois: LigneBilan[]; hauteur?: number }) {
  const c = useCouleurs();
  if (mois.every((l) => l.mise === 0 && l.benefice === 0)) {
    return <GraphiqueVide hauteur={hauteur} texte="Aucun pari saisi pour l'instant." />;
  }
  return (
    <BarChart
      height={hauteur}
      margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
      grid={{ horizontal: true }}
      hideLegend
      skipAnimation
      borderRadius={4}
      xAxis={[axeMois(mois)]}
      yAxis={[{ width: 64, valueFormatter: (v: number) => euroCourt(v) }]}
      series={[
        {
          data: mois.map((l) => Math.round(l.benefice * 100) / 100),
          label: "Bénéfice / perte",
          // Le signe est aussi porté par le sens de la barre (au-dessus / au-dessous de zéro).
          colorGetter: ({ value }) => ((value ?? 0) < 0 ? c.perdu : c.gagne),
          valueFormatter: (v) => (v === null ? "–" : formatEuroSigne(v)),
        },
      ]}
      sx={{ ...styleAxes, ...styleBarres }}
    >
      <ChartsReferenceLine y={0} lineStyle={{ stroke: "var(--mui-palette-bt-lineStrong)" }} />
    </BarChart>
  );
}

/* ------------------------------------------------------------------ */
/* Matchs gagnés / perdus par mois                                     */
/* ------------------------------------------------------------------ */

export function GraphMatchsParMois({ mois, hauteur = 280 }: { mois: LigneBilan[]; hauteur?: number }) {
  const c = useCouleurs();
  if (mois.every((l) => l.total === 0)) {
    return <GraphiqueVide hauteur={hauteur} texte="Aucun match saisi pour l'instant." />;
  }
  return (
    <BarChart
      height={hauteur}
      margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
      grid={{ horizontal: true }}
      skipAnimation
      borderRadius={4}
      xAxis={[axeMois(mois)]}
      yAxis={[{ width: 40, tickMinStep: 1 }]}
      series={[
        { data: mois.map((l) => l.gagnes), label: "Gagnés", stack: "matchs", color: c.gagne },
        { data: mois.map((l) => l.perdus), label: "Perdus", stack: "matchs", color: c.perdu },
      ]}
      slotProps={{ legend: { position: { vertical: "top", horizontal: "start" } } }}
      sx={{ ...styleAxes, ...styleBarres }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* % de réussite par sport                                             */
/* ------------------------------------------------------------------ */

export function GraphReussiteParSport({ sports }: { sports: LigneSport[] }) {
  const c = useCouleurs();
  const joues = sports.filter((s) => s.total > 0);
  const hauteur = Math.max(220, sports.length * 36 + 40);
  if (joues.length === 0) return <GraphiqueVide hauteur={hauteur} texte="Aucun match saisi pour l'instant." />;
  // Classement : du meilleur au moins bon ; les sports sans match en fin de liste.
  const tries = [...joues].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.gagnes - a.gagnes);
  const sansMatch = sports.filter((s) => s.total === 0);
  const lignes = [...tries, ...sansMatch];
  return (
    <BarChart
      height={hauteur}
      layout="horizontal"
      margin={{ left: 0, right: 56, top: 0, bottom: 0 }}
      grid={{ vertical: true }}
      hideLegend
      skipAnimation
      borderRadius={4}
      yAxis={[
        {
          scaleType: "band",
          data: lignes.map((s) => s.nom),
          width: 116,
          categoryGapRatio: 0.4,
          disableTicks: true,
        },
      ]}
      xAxis={[{ min: 0, max: 100, tickInterval: [0, 25, 50, 75, 100], valueFormatter: (v: number) => `${v} %` }]}
      series={[
        {
          data: lignes.map((s) => (s.pct === null ? null : Math.round(s.pct * 1000) / 10)),
          label: "Réussite",
          color: c.serie,
          valueFormatter: (v, { dataIndex }) => {
            const s = lignes[dataIndex];
            return v === null ? "Aucun match" : `${formatPct(v / 100)} (${s.gagnes} G · ${s.perdus} P)`;
          },
          barLabel: (item) => (item.value === null ? null : formatPct(item.value / 100)),
          barLabelPlacement: "outside",
        },
      ]}
      sx={{
        ...styleAxes,
        "& .MuiBarLabel-root": { fill: "var(--mui-palette-text-primary)", fontSize: 12, fontWeight: 600 },
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Jauge et mini-courbe                                                */
/* ------------------------------------------------------------------ */

export function JaugeReussite({ valeur, libelle }: { valeur: number | null; libelle: string }) {
  const c = useCouleurs();
  return (
    <Gauge
      width={150}
      height={110}
      value={valeur === null ? 0 : Math.round(valeur * 1000) / 10}
      startAngle={-110}
      endAngle={110}
      innerRadius="76%"
      outerRadius="100%"
      cornerRadius="50%"
      cy="70%"
      text={formatPct(valeur)}
      aria-label={`${libelle} : ${formatPct(valeur)}`}
      sx={{
        [`& .${gaugeClasses.valueArc}`]: { fill: c.serie },
        [`& .${gaugeClasses.referenceArc}`]: { fill: "var(--mui-palette-bt-surfaceRaised)" },
        [`& .${gaugeClasses.valueText} text`]: {
          fontSize: 22,
          fontWeight: 800,
          fill: "var(--mui-palette-text-primary)",
        },
      }}
    />
  );
}

export function MiniCourbe({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
  if (valeurs.length < 2) return null;
  return (
    <SparkLineChart
      data={valeurs}
      height={44}
      area
      curve="monotoneX"
      color={couleur}
      margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
      sx={{ [`& .${lineClasses.area}`]: { fillOpacity: 0.14 } }}
      aria-hidden
    />
  );
}
