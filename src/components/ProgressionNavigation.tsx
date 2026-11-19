"use client";

import LinearProgress from "@mui/material/LinearProgress";
import { keyframes } from "@mui/material/styles";
import { useLinkStatus } from "next/link";

// Apparition différée : rien ne clignote quand la page s'affiche instantanément.
const apparition = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * Barre de progression en haut de l'écran pendant le chargement de la page visée.
 * À placer DANS un `<Link>` de next/link : elle reflète l'état de ce lien.
 */
export function ProgressionNavigation() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <LinearProgress
      aria-label="Chargement de la page"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: (t) => t.zIndex.tooltip + 1,
        opacity: 0,
        animation: `${apparition} 150ms ease-out 120ms forwards`,
      }}
    />
  );
}
