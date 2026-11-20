"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SportsSoccerOutlined from "@mui/icons-material/SportsSoccerOutlined";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDonnees } from "@/hooks/useDonnees";
import { useSession } from "@/hooks/useSession";
import { finPeriode } from "@/lib/dates";
import { formatDateCourte } from "@/lib/format";
import { HALO_VIOLET } from "@/theme/theme";
import { IndicateurSauvegarde } from "./IndicateurSauvegarde";
import { EcranChargement, LogoComplet, RappelRisques } from "./Marque";
import { ProgressionNavigation } from "./ProgressionNavigation";
import { Pwa } from "./Pwa";
import { BoutonTheme } from "./Theme";

const LARGEUR_MENU = 256;

/** Marges de sécurité (encoche, coins arrondis) quand l'application occupe tout l'écran. */
const margesLaterales = {
  pl: "env(safe-area-inset-left)",
  pr: "env(safe-area-inset-right)",
} as const;

/** Fond translucide flouté pour l'en-tête et la barre d'onglets. */
const verre = {
  backgroundColor: "color-mix(in srgb, var(--mui-palette-bt-bg) 82%, transparent)",
  backdropFilter: "blur(14px) saturate(140%)",
  WebkitBackdropFilter: "blur(14px) saturate(140%)",
} as const;

/** Ordre de la barre d'onglets mobile : « Saisie » au centre, en bouton « + ». */
const LIENS = [
  { href: "/", libelle: "Tableau de bord", court: "Accueil", Icone: HomeOutlined, mobile: true },
  { href: "/historique", libelle: "Historique", court: "Historique", Icone: CalendarMonthOutlined, mobile: true },
  { href: "/saisie", libelle: "Saisie du jour", court: "Saisie", Icone: AddRounded, mobile: true, central: true },
  { href: "/bilan", libelle: "Bilan", court: "Bilan", Icone: BarChartRounded, mobile: true },
  { href: "/sports", libelle: "Par sport", court: "Sports", Icone: SportsSoccerOutlined, mobile: true },
  { href: "/reglages", libelle: "Réglages", court: "Réglages", Icone: SettingsOutlined, mobile: false },
];

/** Menu latéral : saisie en premier après l'accueil. */
const ORDRE_MENU = ["/", "/saisie", "/historique", "/bilan", "/sports", "/reglages"];

const estActif = (chemin: string, href: string) => (href === "/" ? chemin === "/" : chemin.startsWith(href));

function Periode() {
  const { data } = useDonnees();
  if (!data) return null;
  return (
    <Box sx={{ mx: 2, mb: 1.5, p: 1.5, borderRadius: "12px", bgcolor: "bt.surfaceRaised", border: 1, borderColor: "divider" }}>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
        Période de suivi
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {formatDateCourte(data.dateDebut)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        → {formatDateCourte(finPeriode(data.dateDebut))}
      </Typography>
    </Box>
  );
}

/** Mise en page : menu latéral sur grand écran, barre d'onglets en bas sur mobile. */
export function Coque({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const { data } = useDonnees();
  const { pret: sessionPrete } = useSession();
  const actuel = LIENS.find((l) => estActif(chemin, l.href));

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", ...margesLaterales }}>
      {/* Logo animé à chaque chargement / rechargement, jusqu'à ce que les données soient prêtes. */}
      <EcranChargement pret={data !== null && sessionPrete} />
      <Pwa />
      <Box
        component="a"
        href="#contenu"
        sx={{
          position: "fixed",
          left: 8,
          top: -48,
          zIndex: 2000,
          px: 2,
          py: 1,
          borderRadius: "12px",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:focus": { top: 8 },
        }}
      >
        Aller au contenu
      </Box>

      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${LARGEUR_MENU}px)` },
          ml: { md: `${LARGEUR_MENU}px` },
          borderBottom: 1,
          borderColor: "divider",
          ...verre,
          pt: "env(safe-area-inset-top)",
          ...margesLaterales,
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 64 } }}>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <LogoComplet />
          </Box>
          <Typography variant="h6" component="p" sx={{ display: { xs: "none", md: "block" } }}>
            {actuel?.libelle}
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
            <IndicateurSauvegarde />
            <BoutonTheme />
            <Tooltip title="Réglages">
              <IconButton
                component={Link}
                href="/reglages"
                aria-label="Réglages"
                sx={{ display: { md: "none" } }}
                color={chemin.startsWith("/reglages") ? "primary" : "default"}
              >
                <SettingsOutlined />
                <ProgressionNavigation />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: LARGEUR_MENU,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: LARGEUR_MENU, boxSizing: "border-box" },
        }}
      >
        <Toolbar sx={{ minHeight: { md: 72 } }}>
          <LogoComplet />
        </Toolbar>
        <Box component="nav" aria-label="Navigation principale" sx={{ flex: 1 }}>
          <List sx={{ px: 1.5, pt: 1 }}>
            {ORDRE_MENU.map((h) => LIENS.find((l) => l.href === h)!).map(({ href, libelle, Icone }) => {
              const actif = estActif(chemin, href);
              return (
                <ListItemButton
                  key={href}
                  component={Link}
                  href={href}
                  selected={actif}
                  aria-current={actif ? "page" : undefined}
                  sx={{ borderRadius: "12px", mb: 0.5, minHeight: 44 }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
                    <Icone />
                  </ListItemIcon>
                  <ListItemText primary={libelle} slotProps={{ primary: { sx: { fontWeight: actif ? 700 : 500 } } }} />
                  <ProgressionNavigation />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        <Periode />
        <RappelRisques sx={{ mx: 2, mb: 2 }} />
      </Drawer>

      <Box
        component="main"
        id="contenu"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3, lg: 4 },
          pt: { xs: "calc(88px + env(safe-area-inset-top))", sm: "calc(96px + env(safe-area-inset-top))" },
          pb: { xs: "calc(112px + env(safe-area-inset-bottom))", md: 6 },
          outline: "none",
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>{children}</Box>
      </Box>

      <Paper
        component="nav"
        aria-label="Navigation principale"
        square
        elevation={0}
        sx={{
          display: { md: "none" },
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderTop: 1,
          borderColor: "divider",
          ...verre,
          pb: "env(safe-area-inset-bottom)",
          ...margesLaterales,
        }}
      >
        <BottomNavigation
          showLabels
          value={actuel?.mobile ? actuel.href : false}
          sx={{ height: 68, bgcolor: "transparent", overflow: "visible" }}
        >
          {LIENS.filter((l) => l.mobile).map(({ href, court, Icone, central }) => (
            <BottomNavigationAction
              key={href}
              value={href}
              label={court}
              icon={
                <>
                  {central ? (
                    // Bouton « + » : seul élément violet plein de la barre, avec son halo.
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        mt: -3.5,
                        mb: 0.25,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        boxShadow: HALO_VIOLET,
                        border: "3px solid var(--mui-palette-bt-bg)",
                        transition: "transform 150ms ease-out",
                      }}
                    >
                      <Icone sx={{ fontSize: 30 }} />
                    </Box>
                  ) : (
                    <Icone />
                  )}
                  <ProgressionNavigation />
                </>
              }
              component={Link}
              href={href}
              aria-current={actuel?.href === href ? "page" : undefined}
              sx={{
                minWidth: 0,
                px: 0.5,
                color: "text.secondary",
                "&.Mui-selected": { color: "bt.violetText" },
                "& .MuiBottomNavigationAction-label": { fontSize: "0.72rem !important", fontWeight: 600, mt: 0.25 },
                ...(central && { overflow: "visible", "&:active > div": { transform: "scale(0.94)" } }),
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
