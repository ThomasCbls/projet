"use client";

import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import Chip from "@mui/material/Chip";
import { useDonnees } from "@/hooks/useDonnees";

const ETATS = {
  chargement: { texte: "Chargement…", Icone: CloudSyncOutlined, couleur: "default" },
  "en-cours": { texte: "Enregistrement…", Icone: CloudSyncOutlined, couleur: "default" },
  // Sans compte connecté : enregistré sur cet appareil seulement.
  enregistre: { texte: "Enregistré", Icone: CheckCircleOutlineRounded, couleur: "default" },
  synchro: { texte: "Synchronisation…", Icone: CloudSyncOutlined, couleur: "default" },
  synchronise: { texte: "Synchronisé", Icone: CloudDoneOutlined, couleur: "default" },
  "hors-ligne": { texte: "Hors ligne", Icone: CloudOffOutlined, couleur: "default" },
  erreur: { texte: "Erreur d'enregistrement", Icone: ErrorOutlineRounded, couleur: "error" },
} as const;

export function IndicateurSauvegarde() {
  const { statut, synchro } = useDonnees();
  const etat =
    statut !== "enregistre"
      ? statut
      : synchro === "en-cours"
        ? "synchro"
        : synchro === "a-jour"
          ? "synchronise"
          : synchro === "hors-ligne"
            ? "hors-ligne"
            : "enregistre";
  const { texte, Icone, couleur } = ETATS[etat];
  return (
    <Chip
      role="status"
      aria-live="polite"
      size="small"
      variant="outlined"
      color={couleur}
      icon={<Icone />}
      label={texte}
      title={etat === "hors-ligne" ? "Enregistré sur cet appareil, envoi dès le retour de la connexion" : undefined}
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
