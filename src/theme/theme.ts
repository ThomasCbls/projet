"use client";

import { frFR } from "@mui/material/locale";
import { createTheme } from "@mui/material/styles";
import { frFR as frFRGraphiques } from "@mui/x-charts/locales";

const police = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme(
  {
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: "#1d4ed8" },
          success: { main: "#15803d" },
          error: { main: "#b91c1c" },
          background: { default: "#f4f5f7", paper: "#ffffff" },
          text: { primary: "#111827", secondary: "#525b69" },
          divider: "#e1e4e9",
        },
      },
      dark: {
        palette: {
          primary: { main: "#60a5fa" },
          success: { main: "#4ade80" },
          error: { main: "#f87171" },
          background: { default: "#0d1117", paper: "#161b22" },
          text: { primary: "#e6e8eb", secondary: "#a3acb9" },
          divider: "#2a313b",
        },
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: police,
      h4: { fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700, letterSpacing: "-0.01em" },
      h6: { fontWeight: 600, fontSize: "1.05rem" },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiCard: { defaultProps: { variant: "outlined" } },
      MuiPaper: { styleOverrides: { outlined: { borderColor: "var(--mui-palette-divider)" } } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
      MuiToggleButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 600 } } },
      MuiTableCell: {
        styleOverrides: {
          root: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
          head: { fontWeight: 600, color: "var(--mui-palette-text-secondary)" },
        },
      },
      MuiTextField: { defaultProps: { size: "small" } },
      MuiSelect: { defaultProps: { size: "small" } },
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitTapHighlightColor: "transparent" },
          /* ≥ 16px dans les champs : pas de zoom automatique sur iOS */
          "input, select, textarea": { fontSize: "16px !important" },
        },
      },
    },
  },
  frFR,
  frFRGraphiques,
);
