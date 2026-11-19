"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { DonneesProvider } from "@/hooks/useDonnees";
import { SessionProvider } from "@/hooks/useSession";
import { CLE_MODE } from "./constantes";
import { theme } from "./theme";

export function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme} defaultMode="system" modeStorageKey={CLE_MODE} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      <SessionProvider>
        <DonneesProvider>{children}</DonneesProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
