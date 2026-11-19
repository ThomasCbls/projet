"use client";

import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import Chip from "@mui/material/Chip";
import { useDonnees } from "@/hooks/useDonnees";

const ETATS = {
  chargement: { texte: "Chargement…", Icone: CloudSyncOutlined, couleur: "default" },
  "en-cours": { texte: "Enregistrement…", Icone: CloudSyncOutlined, couleur: "default" },
  enregistre: { texte: "Enregistré", Icone: CloudDoneOutlined, couleur: "default" },
  erreur: { texte: "Erreur d'enregistrement", Icone: ErrorOutlineRounded, couleur: "error" },
} as const;

export function IndicateurSauvegarde() {
  const { statut } = useDonnees();
  const { texte, Icone, couleur } = ETATS[statut];
  return (
    <Chip
      role="status"
      aria-live="polite"
      size="small"
      variant="outlined"
      color={couleur}
      icon={<Icone />}
      label={texte}
      sx={{
        borderColor: couleur === "default" ? "divider" : undefined,
        color: couleur === "default" ? "text.secondary" : undefined,
        // Sur petit écran : l'icône seule, sauf en cas d'erreur.
        ...(couleur !== "error" && {
          "& .MuiChip-label": { display: { xs: "none", sm: "block" } },
          "& .MuiChip-icon": { mx: { xs: "4px", sm: "4px -2px" } },
        }),
      }}
    />
  );
}
