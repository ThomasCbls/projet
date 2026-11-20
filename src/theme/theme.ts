"use client";

import { frFR } from "@mui/material/locale";
import { createTheme } from "@mui/material/styles";
import { frFR as frFRGraphiques } from "@mui/x-charts/locales";
import { JETONS, MARQUE } from "./constantes";

type Jetons = { [K in keyof (typeof JETONS)["dark"]]: string };

declare module "@mui/material/styles" {
  interface Palette {
    /** Jetons de la charte BetTracker (bg, surface, line, violetText…). */
    bt: Jetons;
    marque: typeof MARQUE;
  }
  interface PaletteOptions {
    bt?: Jetons;
    marque?: typeof MARQUE;
  }
}

/** Polices chargées par next/font dans app/layout.tsx. */
export const POLICE_TITRE = 'var(--font-exo2), "Exo 2", system-ui, sans-serif';
export const POLICE_TEXTE =
  'var(--font-inter), Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Halo néon `glow-violet` : un seul par écran (bouton principal ou bouton « + » de la barre). */
export const HALO_VIOLET = "0 0 0 1px rgba(218, 96, 255, 0.25), 0 6px 24px -4px rgba(139, 44, 245, 0.65)";

const v = (nom: string) => `var(--mui-palette-bt-${nom})`;

const palette = (j: (typeof JETONS)["dark" | "light"]) => ({
  bt: { ...j },
  marque: MARQUE,
  primary: { main: j.violet, contrastText: MARQUE.surViolet },
  secondary: { main: MARQUE.gold, contrastText: MARQUE.surGold },
  success: { main: j.win },
  error: { main: j.loss },
  warning: { main: j.pending },
  info: { main: j === JETONS.dark ? "#3FC8FF" : "#0B7FB0" },
  background: { default: j.bg, paper: j.surface },
  text: { primary: j.ink, secondary: j.inkMuted, disabled: j.void },
  divider: j.line,
});

export const theme = createTheme(
  {
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
      dark: { palette: palette(JETONS.dark) },
      light: { palette: palette(JETONS.light) },
    },
    // radius-md : boutons, champs, chips.
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: POLICE_TEXTE,
      // display / h1 : Exo 2 800 italique, comme l'inclinaison du wordmark.
      h3: { fontFamily: POLICE_TITRE, fontWeight: 800, fontStyle: "italic", fontSize: "2.5rem", lineHeight: 44 / 40 },
      h4: { fontFamily: POLICE_TITRE, fontWeight: 800, fontStyle: "italic", fontSize: "1.75rem", lineHeight: 34 / 28 },
      // h2 / h3 de la charte.
      h5: { fontFamily: POLICE_TITRE, fontWeight: 700, fontSize: "1.375rem", lineHeight: 28 / 22 },
      h6: { fontFamily: POLICE_TITRE, fontWeight: 700, fontSize: "1.125rem", lineHeight: 24 / 18 },
      body1: { fontSize: "1rem", lineHeight: 1.5 },
      body2: { fontSize: "0.875rem", lineHeight: 20 / 14 },
      subtitle2: { fontWeight: 600, fontSize: "0.8125rem", lineHeight: 16 / 13 },
      caption: { fontWeight: 500, fontSize: "0.75rem", lineHeight: 16 / 12 },
      overline: { fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.12em" },
      button: { textTransform: "none", fontWeight: 600, fontSize: "0.9375rem" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (t) => ({
          body: {
            // Teinte des fonds de statut (voir theme/statuts.ts). Sur body et non :root :
            // le sélecteur sombre (« .dark & ») vise un descendant de <html class="dark">.
            "--bt-teinte-statut": "8%",
            WebkitTapHighlightColor: "transparent",
            fontFeatureSettings: '"cv11"',
            backgroundColor: v("bg"),
            ...t.applyStyles("dark", {
              "--bt-teinte-statut": "16%",
              // Fond nuit baigné d'un halo indigo, comme le logo.
              backgroundImage:
                "radial-gradient(900px 520px at 100% -8%, rgba(58, 18, 201, 0.28), transparent 65%), radial-gradient(700px 420px at -10% 110%, rgba(139, 44, 245, 0.10), transparent 60%)",
              backgroundAttachment: "fixed",
            }),
          },
          /* ≥ 16px dans les champs : pas de zoom automatique sur iOS */
          "input, select, textarea": { fontSize: "16px !important" },
          // Focus clavier : anneau focus-ring 2 px, décalé de 2 px.
          ":focus-visible, .Mui-focusVisible": { outline: `2px solid ${v("focusRing")}`, outlineOffset: 2 },
          "::selection": { backgroundColor: v("violetSoft") },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
            },
          },
        }),
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: v("line") },
        },
      },
      // Cartes et tickets : surface, rayon radius-lg, bordure line.
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: { root: { borderRadius: 16, backgroundColor: v("surface") } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            minHeight: 44,
            paddingInline: 18,
            transition: "all 150ms ease-out",
            variants: [
              { props: { size: "large" }, style: { minHeight: 48 } },
              { props: { size: "small" }, style: { minHeight: 36, paddingInline: 10 } },
              // Primary : violet plein + halo, une seule fois par écran.
              {
                props: { variant: "contained", color: "primary" },
                style: { boxShadow: HALO_VIOLET, "&:hover": { boxShadow: HALO_VIOLET, backgroundColor: "#7A1FE6" } },
              },
              // Gold : réservé au Premium.
              { props: { variant: "contained", color: "secondary" }, style: { "&:hover": { backgroundColor: "#F5B90F" } } },
              // Secondary de la charte : surface relevée, bordure line-strong.
              { props: { variant: "outlined" }, style: { backgroundColor: v("surfaceRaised"), borderColor: v("lineStrong") } },
              {
                props: { variant: "outlined", color: "primary" },
                style: { color: v("ink"), "&:hover": { borderColor: v("violetText"), backgroundColor: v("violetSoft") } },
              },
              // Ghost : lien d'action en violet-text.
              {
                props: { variant: "text", color: "primary" },
                style: { color: v("violetText"), "&:hover": { backgroundColor: v("violetSoft") } },
              },
            ],
          },
        },
      },
      MuiIconButton: {
        styleOverrides: { colorPrimary: { color: v("violetText") } },
      },
      MuiToggleButtonGroup: {
        styleOverrides: { root: { backgroundColor: v("surfaceRaised"), borderRadius: 12 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            color: v("inkMuted"),
            borderColor: v("lineStrong"),
            "&.Mui-selected": { color: v("violetText"), backgroundColor: v("violetSoft") },
            "&.Mui-selected:hover": { backgroundColor: v("violetSoft") },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600 },
          outlined: { backgroundColor: v("surfaceRaised"), borderColor: v("line") },
        },
      },
      // Champs : fond surface-raised, bordure line-strong, focus focus-ring.
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: v("surfaceRaised"),
            borderRadius: 12,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: v("lineStrong") },
            "&:hover:not(.Mui-disabled, .Mui-error) .MuiOutlinedInput-notchedOutline": { borderColor: v("inkMuted") },
            "&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": { borderColor: v("focusRing"), borderWidth: 2 },
          },
          input: { fontVariantNumeric: "tabular-nums" },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: v("inkMuted"), "&.Mui-focused:not(.Mui-error)": { color: v("violetText") } },
        },
      },
      MuiInputAdornment: { styleOverrides: { root: { color: v("inkMuted") } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: v("violetSoft"), color: v("violetText") },
            "&.Mui-selected .MuiListItemIcon-root": { color: v("violetText") },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: v("surfaceRaised") } },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: { "&.Mui-checked + .MuiSwitch-track": { opacity: 1 } },
          track: { backgroundColor: v("lineStrong"), opacity: 1 },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 }, standard: { border: "1px solid", borderColor: v("line") } },
      },
      // Feuilles modales : radius-xl.
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 24, backgroundColor: v("surface"), border: `1px solid ${v("line")}` } },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontFamily: POLICE_TITRE, fontWeight: 700 } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: v("surfaceRaised"), color: v("ink"), border: `1px solid ${v("line")}`, fontSize: 12 },
        },
      },
      MuiDrawer: { styleOverrides: { paper: { backgroundColor: v("surface"), borderColor: v("line") } } },
      MuiDivider: { styleOverrides: { root: { borderColor: v("line") } } },
      MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
      MuiTableCell: {
        styleOverrides: {
          root: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", borderColor: v("line") },
          head: { fontWeight: 600, color: v("inkMuted") },
        },
      },
      MuiTextField: { defaultProps: { size: "small" } },
      MuiSelect: { defaultProps: { size: "small" } },
    },
  },
  frFR,
  frFRGraphiques,
);
