"use client";

import ButtonBase from "@mui/material/ButtonBase";
import type { Resultat } from "@/lib/types";
import { FOND_GAGNE, FOND_PERDU } from "@/theme/constantes";

const SUIVANT: Record<Resultat, Resultat> = { "": "G", G: "P", P: "" };
const LIBELLE: Record<Resultat, string> = { "": "vide", G: "gagné", P: "perdu" };

/** Case de match : vide → G (vert) → P (rouge) → vide. */
export function BoutonResultat({
  valeur,
  onChange,
  libelle,
}: {
  valeur: Resultat;
  onChange: (v: Resultat) => void;
  /** Ex. « Foot, match 3 » */
  libelle: string;
}) {
  const fond = valeur === "G" ? FOND_GAGNE : valeur === "P" ? FOND_PERDU : undefined;
  return (
    <ButtonBase
      focusRipple
      onClick={() => onChange(SUIVANT[valeur])}
      aria-label={`${libelle} : ${LIBELLE[valeur]}. Toucher pour passer à ${LIBELLE[SUIVANT[valeur]]}`}
      sx={{
        flex: 1,
        minWidth: 44,
        height: 48,
        borderRadius: 1,
        fontSize: "1.1rem",
        fontWeight: 700,
        userSelect: "none",
        transition: "background-color 120ms, transform 80ms",
        "&:active": { transform: "scale(0.95)" },
        ...(fond
          ? { bgcolor: fond, color: "#fff", border: 2, borderColor: fond }
          : {
              color: "text.secondary",
              border: 2,
              borderStyle: "dashed",
              borderColor: "divider",
              "&:hover": { borderColor: "text.secondary" },
            }),
      }}
    >
      {valeur || <span aria-hidden="true">·</span>}
    </ButtonBase>
  );
}
