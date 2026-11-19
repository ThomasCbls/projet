"use client";

import { useDonnees } from "@/hooks/useDonnees";

const TEXTES = {
  chargement: "Chargement…",
  "en-cours": "Enregistrement…",
  enregistre: "Enregistré",
  erreur: "Erreur d'enregistrement",
} as const;

export function IndicateurSauvegarde() {
  const { statut } = useDonnees();
  return (
    <span
      role="status"
      aria-live="polite"
      className={`hidden text-xs sm:inline ${statut === "erreur" ? "font-semibold text-perdu" : "text-attenue"}`}
    >
      {TEXTES[statut]}
    </span>
  );
}
