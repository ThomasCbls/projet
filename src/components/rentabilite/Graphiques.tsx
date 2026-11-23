"use client";

import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import {
  GraphiqueVide,
  axeMois,
  styleAxes,
  styleBarres,
  useCouleurs,
} from "@/components/tableau-de-bord/Graphiques";
import { formatEuroSigne, formatPctSigne } from "@/lib/format";
import type { LigneMoisRentabilite, LigneSportRentabilite } from "@/lib/rentabilite";

const pourCent = (roi: number | null) => (roi === null ? null : Math.round(roi * 1000) / 10);
const graduationPct = (v: number) => `${v} %`;

/** ROI de chaque mois : au-dessus de zéro = rentable. */
export function GraphRoiParMois({ lignes, hauteur = 260 }: { lignes: LigneMoisRentabilite[]; hauteur?: number }) {
  const c = useCouleurs();
  if (lignes.every((l) => l.global.nbParis === 0)) {
    return <GraphiqueVide hauteur={hauteur} texte="Aucun pari tranché pour l'instant." />;
  }
  return (
    <BarChart
      height={hauteur}
      margin={{ left: 0, right: 8, top: 16, bottom: 0 }}
      grid={{ horizontal: true }}
      hideLegend
      skipAnimation
      borderRadius={4}
      xAxis={[axeMois(lignes)]}
      yAxis={[{ width: 56, valueFormatter: graduationPct }]}
      series={[
        {
          data: lignes.map((l) => pourCent(l.global.roi)),
          label: "ROI",
          colorGetter: ({ value }) => ((value ?? 0) < 0 ? c.perdu : c.gagne),
          valueFormatter: (v, { dataIndex }) => {
            const l = lignes[dataIndex].global;
            return v === null ? "Aucun pari tranché" : `${formatPctSigne(v / 100)} (${formatEuroSigne(l.benefice)})`;
          },
        },
      ]}
      sx={{ ...styleAxes, ...styleBarres }}
    >
      <ChartsReferenceLine y={0} lineStyle={{ stroke: "var(--mui-palette-bt-lineStrong)" }} />
    </BarChart>
  );
}

/** ROI par sport, du plus rentable au moins rentable. */
export function GraphRoiParSport({ lignes }: { lignes: LigneSportRentabilite[] }) {
  const c = useCouleurs();
  const hauteur = Math.max(180, lignes.length * 40 + 40);
  if (lignes.length === 0) return <GraphiqueVide hauteur={hauteur} texte="Aucun pari tranché pour l'instant." />;
  const tries = [...lignes].sort((a, b) => (b.total.roi ?? -Infinity) - (a.total.roi ?? -Infinity));
  return (
    <BarChart
      height={hauteur}
      layout="horizontal"
      margin={{ left: 0, right: 64, top: 0, bottom: 0 }}
      grid={{ vertical: true }}
      hideLegend
      skipAnimation
      borderRadius={4}
      yAxis={[
        {
          scaleType: "band",
          data: tries.map((s) => s.nom),
          width: 132,
          categoryGapRatio: 0.4,
          disableTicks: true,
        },
      ]}
      xAxis={[{ valueFormatter: graduationPct }]}
      series={[
        {
          data: tries.map((s) => pourCent(s.total.roi)),
          label: "ROI",
          colorGetter: ({ value }) => ((value ?? 0) < 0 ? c.perdu : c.gagne),
          valueFormatter: (v, { dataIndex }) => {
            const s = tries[dataIndex].total;
            return v === null
              ? "Aucune mise"
              : `${formatPctSigne(v / 100)} · ${formatEuroSigne(s.benefice)} sur ${s.nbParis} pari${s.nbParis > 1 ? "s" : ""}`;
          },
          barLabel: (item) => (item.value === null ? null : formatPctSigne(item.value / 100)),
          barLabelPlacement: "outside",
        },
      ]}
      sx={{
        ...styleAxes,
        ...styleBarres,
        "& .MuiBarLabel-root": { fill: "var(--mui-palette-text-primary)", fontSize: 12, fontWeight: 600 },
      }}
    >
      <ChartsReferenceLine x={0} lineStyle={{ stroke: "var(--mui-palette-bt-lineStrong)" }} />
    </BarChart>
  );
}
