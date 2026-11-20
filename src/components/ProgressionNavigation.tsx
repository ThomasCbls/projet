"use client";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Portal from "@mui/material/Portal";
import { keyframes } from "@mui/material/styles";
import { useLinkStatus } from "next/link";

/** Affichée après 150 ms seulement : rien ne clignote quand la page s'affiche aussitôt. */
const apparition = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/**
 * Loader classique pendant un changement de page : fine barre en haut de l'écran.
 * (Le logo animé est réservé au lancement de l'application : EcranChargement, dans Coque.)
 * À placer DANS un `<Link>` de next/link : il reflète l'état de ce lien.
 * Rendu dans un portail : l'en-tête et la barre d'onglets (backdrop-filter) piégeraient un élément fixe.
 */
export function ProgressionNavigation() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          pointerEvents: "none",
          opacity: 0,
          animation: `${apparition} 150ms ease-out 150ms forwards`,
        }}
      >
        <LinearProgress
          aria-label="Chargement de la page"
          sx={{ height: 3, bgcolor: "transparent", "& .MuiLinearProgress-bar": { borderRadius: 3 } }}
        />
      </Box>
    </Portal>
  );
}
