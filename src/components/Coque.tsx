"use client";

import BarChartRounded from "@mui/icons-material/BarChartRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SportsSoccerRounded from "@mui/icons-material/SportsSoccerRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
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
import { finPeriode } from "@/lib/dates";
import { formatDateCourte } from "@/lib/format";
import { IndicateurSauvegarde } from "./IndicateurSauvegarde";
import { BoutonTheme } from "./Theme";

const LARGEUR_MENU = 248;

const LIENS = [
  { href: "/", libelle: "Tableau de bord", court: "Accueil", Icone: DashboardRounded, mobile: true },
  { href: "/saisie", libelle: "Saisie du jour", court: "Saisie", Icone: EditNoteRounded, mobile: true },
  { href: "/historique", libelle: "Historique", court: "Historique", Icone: CalendarMonthRounded, mobile: true },
  { href: "/bilan", libelle: "Bilan", court: "Bilan", Icone: BarChartRounded, mobile: true },
  { href: "/sports", libelle: "Par sport", court: "Sports", Icone: SportsSoccerRounded, mobile: true },
  { href: "/reglages", libelle: "Réglages", court: "Réglages", Icone: SettingsRounded, mobile: false },
];

const estActif = (chemin: string, href: string) => (href === "/" ? chemin === "/" : chemin.startsWith(href));

function Logo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Avatar variant="rounded" sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
        <SportsSoccerRounded fontSize="small" />
      </Avatar>
      <Typography component="span" sx={{ fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
        Suivi{" "}
        <Box component="span" sx={{ color: "primary.main" }}>
          sport
        </Box>{" "}
        &amp; paris
      </Typography>
    </Box>
  );
}

function Periode() {
  const { data } = useDonnees();
  if (!data) return null;
  return (
    <Box sx={{ m: 2, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
        Période de suivi
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatDateCourte(data.dateDebut)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        → {formatDateCourte(finPeriode(data.dateDebut))}
      </Typography>
    </Box>
  );
}

/** Mise en page : menu latéral sur grand écran, barre d'onglets en bas sur mobile. */
export function Coque({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const actuel = LIENS.find((l) => estActif(chemin, l.href));

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
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
          borderRadius: 2,
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
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <Logo />
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
                <SettingsRounded />
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
          "& .MuiDrawer-paper": { width: LARGEUR_MENU, boxSizing: "border-box", borderColor: "divider" },
        }}
      >
        <Toolbar>
          <Logo />
        </Toolbar>
        <Box component="nav" aria-label="Navigation principale" sx={{ flex: 1 }}>
          <List sx={{ px: 1.5, pt: 1 }}>
            {LIENS.map(({ href, libelle, Icone }) => {
              const actif = estActif(chemin, href);
              return (
                <ListItemButton
                  key={href}
                  component={Link}
                  href={href}
                  selected={actif}
                  aria-current={actif ? "page" : undefined}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    "&.Mui-selected": { color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icone />
                  </ListItemIcon>
                  <ListItemText primary={libelle} slotProps={{ primary: { sx: { fontWeight: actif ? 700 : 500 } } }} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
        <Periode />
      </Drawer>

      <Box
        component="main"
        id="contenu"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3, lg: 4 },
          pt: { xs: 10, sm: 11 },
          pb: { xs: 13, md: 6 },
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
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation showLabels value={actuel?.mobile ? actuel.href : false} sx={{ height: 64 }}>
          {LIENS.filter((l) => l.mobile).map(({ href, court, Icone }) => (
            <BottomNavigationAction
              key={href}
              value={href}
              label={court}
              icon={<Icone />}
              component={Link}
              href={href}
              aria-current={actuel?.href === href ? "page" : undefined}
              sx={{ minWidth: 0, px: 0.5, "& .MuiBottomNavigationAction-label": { fontSize: "0.7rem !important" } }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
