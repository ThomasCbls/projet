"use client";

import { LineChart, lineClasses } from "@mui/x-charts/LineChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import {
  GraphiqueVide,
  euroCourt,
  moisSeul,
  styleAxes,
  useCouleurs,
} from "@/components/tableau-de-bord/Graphiques";
import type { LigneMoisCapital } from "@/lib/capital";
import { formatEuro, formatMoisLong } from "@/lib/format";

/**
 * Patrimoine en fin de mois : capital actif + sécurisé + retiré (aires empilées),
 * comparé aux dépôts cumulés (trait pointillé). Au-dessus des dépôts : le patrimoine progresse.
 */
export function GraphPatrimoine({ mois, hauteur = 300 }: { mois: LigneMoisCapital[]; hauteur?: number }) {
  const c = useCouleurs();
  if (mois.every((l) => l.fin.depots === 0 && l.fin.gagne === 0 && l.fin.retire === 0 && l.fin.securise === 0)) {
    return <GraphiqueVide hauteur={hauteur} texte="Aucun mouvement ni pari pour l'instant." />;
  }
  const arrondi = (n: number) => Math.round(n * 100) / 100;
  const format = (v: number | null) => (v === null ? "–" : formatEuro(v));
  return (
    <LineChart
      height={hauteur}
      margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
      grid={{ horizontal: true }}
      skipAnimation
      xAxis={[
        {
          scaleType: "point",
          data: mois.map((l) => l.mois),
          valueFormatter: (m: string, ctx) => (ctx.location === "tick" ? moisSeul(m) : formatMoisLong(m)),
        },
      ]}
      yAxis={[{ width: 64, valueFormatter: (v: number) => euroCourt(v) }]}
      series={[
        {
          id: "actif",
          data: mois.map((l) => arrondi(l.fin.capitalActif)),
          label: "Capital actif",
          stack: "patrimoine",
          area: true,
          color: c.serie,
          showMark: false,
          valueFormatter: format,
        },
        {
          id: "securise",
          data: mois.map((l) => arrondi(l.fin.securise)),
          label: "Sécurisé",
          stack: "patrimoine",
          area: true,
          color: c.gagne,
          showMark: false,
          valueFormatter: format,
        },
        {
          id: "retire",
          data: mois.map((l) => arrondi(l.fin.retire)),
          label: "Retiré",
          stack: "patrimoine",
          area: true,
          color: c.objectif,
          showMark: false,
          valueFormatter: format,
        },
        {
          id: "depots",
          data: mois.map((l) => arrondi(l.fin.depots)),
          label: "Dépôts cumulés",
          color: c.neutre,
          showMark: false,
          valueFormatter: format,
        },
      ]}
      slotProps={{ legend: { position: { vertical: "top", horizontal: "start" } } }}
      sx={{
        ...styleAxes,
        [`& .${lineClasses.area}`]: { fillOpacity: 0.28 },
        [`& .${lineClasses.line}`]: { strokeWidth: 2 },
        [`& .${lineClasses.line}[data-series="depots"]`]: { strokeDasharray: "6 4", strokeWidth: 2 },
      }}
    >
      <ChartsReferenceLine y={0} lineStyle={{ stroke: "var(--mui-palette-bt-lineStrong)" }} />
    </LineChart>
  );
}
