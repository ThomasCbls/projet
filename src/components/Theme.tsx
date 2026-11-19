"use client";

import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRounded from "@mui/icons-material/SettingsBrightnessRounded";
import IconButton from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";

type Mode = "system" | "light" | "dark";
const ORDRE: Mode[] = ["system", "light", "dark"];
const LIBELLES: Record<Mode, string> = { system: "Système", light: "Clair", dark: "Sombre" };
const ICONES = { system: SettingsBrightnessRounded, light: LightModeRounded, dark: DarkModeRounded };

/** true si le thème réellement affiché est sombre (false avant le montage). */
export function useThemeSombre(): boolean {
  const { mode, systemMode } = useColorScheme();
  return (mode === "system" ? systemMode : mode) === "dark";
}

/** Bouton compact de l'en-tête : Système → Clair → Sombre. */
export function BoutonTheme() {
  const { mode, setMode } = useColorScheme();
  // Le mode n'est connu qu'après le montage : bouton neutre en attendant.
  const actuel: Mode = mode ?? "system";
  const suivant = ORDRE[(ORDRE.indexOf(actuel) + 1) % ORDRE.length];
  const Icone = ICONES[actuel];
  return (
    <Tooltip title={`Thème : ${LIBELLES[actuel]}`}>
      <IconButton
        onClick={() => setMode(suivant)}
        disabled={!mode}
        aria-label={`Thème : ${LIBELLES[actuel]}. Passer au thème ${LIBELLES[suivant]}`}
      >
        <Icone />
      </IconButton>
    </Tooltip>
  );
}

/** Sélecteur complet (page Réglages). */
export function ChoixTheme() {
  const { mode, setMode } = useColorScheme();
  return (
    <ToggleButtonGroup
      exclusive
      color="primary"
      value={mode ?? null}
      onChange={(_, m: Mode | null) => m && setMode(m)}
      aria-label="Thème"
    >
      {ORDRE.map((m) => {
        const Icone = ICONES[m];
        return (
          <ToggleButton key={m} value={m} sx={{ px: 2, gap: 1 }}>
            <Icone fontSize="small" />
            {LIBELLES[m]}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
