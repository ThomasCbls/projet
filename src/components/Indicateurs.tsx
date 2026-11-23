"use client";

/** Briques d'indicateurs partagées : tuile KPI, barre de progression, lien de section. */
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import type TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { DEGRADE_MARQUE } from "@/theme/constantes";

export function Tuile({
  libelle,
  valeur,
  couleur,
  detail,
  Icone,
  hero,
  children,
}: {
  libelle: string;
  valeur: React.ReactNode;
  couleur?: string;
  detail?: React.ReactNode;
  Icone: typeof TrendingUpRounded;
  /** Variante héros (dégradé de marque) : une seule tuile par écran. */
  hero?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card
      sx={{
        p: 2.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...(hero && { background: DEGRADE_MARQUE, borderColor: "transparent", color: "#fff" }),
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2" sx={{ color: hero ? "rgba(255,255,255,.88)" : "text.secondary", fontWeight: 600 }}>
          {libelle}
        </Typography>
        <Avatar
          variant="rounded"
          sx={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            bgcolor: hero ? "rgba(255,255,255,.16)" : "bt.surfaceRaised",
            color: hero ? "#fff" : "text.secondary",
          }}
        >
          <Icone fontSize="small" />
        </Avatar>
      </Stack>
      {/* stat-xl : Inter 800, chiffres tabulaires */}
      <Typography
        sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 36 / 32, fontVariantNumeric: "tabular-nums", color: hero ? "#fff" : couleur }}
      >
        {valeur}
      </Typography>
      {detail && (
        <Typography variant="body2" sx={{ color: hero ? "rgba(255,255,255,.88)" : "text.secondary", mt: 0.5 }}>
          {detail}
        </Typography>
      )}
      {children && <Box sx={{ mt: "auto", pt: 1.5 }}>{children}</Box>}
    </Card>
  );
}

export function Barre({ valeur, libelle }: { valeur: number | null; libelle: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={valeur === null ? 0 : valeur * 100}
      aria-label={libelle}
      sx={{ height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { borderRadius: 4 } }}
    />
  );
}

export function LienSection({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button component={Link} href={href} size="small" endIcon={<ChevronRightRounded />} sx={{ mr: -1 }}>
      {children}
    </Button>
  );
}
