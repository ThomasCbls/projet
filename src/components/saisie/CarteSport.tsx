"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { pourcentage } from "@/lib/calculs";
import { formatPct } from "@/lib/format";
import type { Resultat } from "@/lib/types";
import { BoutonResultat } from "./BoutonResultat";

export function CarteSport({
  nom,
  cases,
  onChange,
}: {
  nom: string;
  cases: Resultat[];
  onChange: (index: number, v: Resultat) => void;
}) {
  const g = cases.filter((c) => c === "G").length;
  const p = cases.filter((c) => c === "P").length;
  return (
    <Card sx={{ p: 1.5, height: "100%" }}>
      <Box sx={{ mb: 1.25, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        <Typography component="h3" sx={{ fontWeight: 600 }}>
          {nom}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {g + p === 0 ? (
            "Aucun match"
          ) : (
            <>
              <Box component="span" sx={{ fontWeight: 700, color: "success.main" }}>
                {g} G
              </Box>
              {" · "}
              <Box component="span" sx={{ fontWeight: 700, color: "error.main" }}>
                {p} P
              </Box>
              {` · ${formatPct(pourcentage(g, p))}`}
            </>
          )}
        </Typography>
      </Box>
      <Box role="group" aria-label={`Matchs de ${nom}`} sx={{ display: "flex", gap: 0.75 }}>
        {cases.map((c, i) => (
          <BoutonResultat key={i} valeur={c} libelle={`${nom}, match ${i + 1}`} onChange={(v) => onChange(i, v)} />
        ))}
      </Box>
    </Card>
  );
}
