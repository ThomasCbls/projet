"use client";

import ButtonBase from "@mui/material/ButtonBase";
import { styled } from "@mui/material/styles";
import { memo } from "react";
import type { Resultat } from "@/lib/types";
import { styleStatut } from "@/theme/statuts";

const SUIVANT: Record<Resultat, Resultat> = { "": "G", G: "P", P: "" };
const LIBELLE: Record<Resultat, string> = { "": "vide", G: "gagné", P: "perdu" };

/** Styles calculés une seule fois pour les 40 cases ; l'état passe par `data-resultat`. */
const Case = styled(ButtonBase)(({ theme }) => ({
  flex: 1,
  minWidth: 44,
  height: 48,
  borderRadius: theme.shape.borderRadius,
  fontSize: "1.1rem",
  fontWeight: 700,
  userSelect: "none",
  border: "2px dashed",
  borderColor: "var(--mui-palette-bt-lineStrong)",
  color: (theme.vars ?? theme).palette.text.secondary,
  transition: "background-color 120ms, transform 80ms",
  "&:active": { transform: "scale(0.95)" },
  "&:hover": { borderColor: (theme.vars ?? theme).palette.text.secondary },
  '&[data-resultat="G"]': styleStatut("success"),
  '&[data-resultat="P"]': styleStatut("error"),
}));

/** Case de match : vide → G (win) → P (loss) → vide. La lettre porte le statut, pas seulement la couleur. */
export const BoutonResultat = memo(function BoutonResultat({
  valeur,
  onChange,
  libelle,
}: {
  valeur: Resultat;
  onChange: (v: Resultat) => void;
  /** Ex. « Foot, match 3 » */
  libelle: string;
}) {
  return (
    <Case
      focusRipple
      data-resultat={valeur}
      onClick={() => onChange(SUIVANT[valeur])}
      aria-label={`${libelle} : ${LIBELLE[valeur]}. Toucher pour passer à ${LIBELLE[SUIVANT[valeur]]}`}
    >
      {valeur || <span aria-hidden="true">·</span>}
    </Case>
  );
});
