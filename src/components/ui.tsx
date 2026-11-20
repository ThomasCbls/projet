"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import type { SxProps, Theme } from "@mui/material/styles";
import TableContainer from "@mui/material/TableContainer";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { formatEuroSigne, formatNombre, parseNombre } from "@/lib/format";

/** Titre de page, sous-titre et action à droite. */
export function EnTetePage({
  titre,
  sousTitre,
  action,
}: {
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexWrap: "wrap",
        alignItems: { xs: "flex-start", sm: "flex-end" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.6rem", sm: "2rem" } }}>
          {titre}
        </Typography>
        {sousTitre && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {sousTitre}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

/** Carte de contenu avec titre, sous-titre et action. */
export function Section({
  titre,
  sousTitre,
  action,
  children,
  sx,
  idTitre,
}: {
  titre?: React.ReactNode;
  sousTitre?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  idTitre?: string;
}) {
  return (
    <Card component="section" aria-labelledby={idTitre} sx={{ p: { xs: 2, sm: 2.5 }, height: "100%", ...sx }}>
      {(titre || action) && (
        <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box>
            {titre && (
              <Typography variant="h6" component="h2" id={idTitre}>
                {titre}
              </Typography>
            )}
            {sousTitre && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {sousTitre}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Card>
  );
}

/** Montant signé, vert si positif, rouge si négatif. */
export function Montant({ valeur, sx }: { valeur: number; sx?: SxProps<Theme> }) {
  const arrondi = Math.round(valeur * 100) / 100;
  return (
    <Box
      component="span"
      sx={{
        fontVariantNumeric: "tabular-nums",
        color: arrondi > 0 ? "success.main" : arrondi < 0 ? "error.main" : "inherit",
        ...sx,
      }}
    >
      {formatEuroSigne(valeur)}
    </Box>
  );
}

/**
 * Rien à afficher pendant le chargement initial : l'écran de chargement au logo (EcranChargement,
 * dans Coque) couvre la page tant que les données et la session ne sont pas prêtes.
 */
export function Chargement() {
  return null;
}

/** Tableau défilant horizontalement, première colonne figée (voir `celluleFigee`). */
export function DefilementTableau({ children, libelle }: { children: React.ReactNode; libelle: string }) {
  return (
    <TableContainer role="region" aria-label={libelle} tabIndex={0} sx={{ mx: { xs: -2, sm: 0 }, width: "auto" }}>
      {children}
    </TableContainer>
  );
}

/** Masqué à l'écran, lu par les lecteurs d'écran (valeurs en px : en sx, `width: 1` vaut 100 %). */
export const masqueVisuel: SxProps<Theme> = {
  position: "absolute",
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Première colonne figée lors du défilement horizontal. */
export const celluleFigee = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  bgcolor: "background.paper",
} as const satisfies SxProps<Theme>;

/** Ligne de total : en gras, teinte superposée (reste opaque sur la colonne figée). */
export const ligneTotal = {
  "& > .MuiTableCell-root": {
    fontWeight: 700,
    backgroundImage: "linear-gradient(var(--mui-palette-action-hover), var(--mui-palette-action-hover))",
  },
} as const satisfies SxProps<Theme>;

/**
 * Champ numérique tolérant (« 1,85 », « 10 € »).
 * Garde le texte saisi localement pour ne pas gêner la frappe (« 1, »).
 */
export function ChampNombre({
  libelle,
  valeur,
  onChange,
  suffixe,
  placeholder,
  disabled,
}: {
  libelle: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  suffixe?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const versTexte = (v: number | null) => (v === null ? "" : formatNombre(v).replace(/\s/g, ""));
  const [texte, setTexte] = useState(versTexte(valeur));

  // Resynchronise si la valeur change de l'extérieur (changement de jour, import…).
  useEffect(() => {
    setTexte((t) => (parseNombre(t) === valeur ? t : versTexte(valeur)));
  }, [valeur]);

  const invalide = texte.trim() !== "" && parseNombre(texte) === null;

  return (
    <TextField
      label={libelle}
      fullWidth
      value={texte}
      placeholder={placeholder}
      disabled={disabled}
      error={invalide}
      autoComplete="off"
      onChange={(e) => {
        setTexte(e.target.value);
        const n = parseNombre(e.target.value);
        if (e.target.value.trim() === "" || n !== null) onChange(n);
      }}
      onBlur={() => {
        if (!invalide) setTexte(versTexte(parseNombre(texte)));
      }}
      slotProps={{
        htmlInput: { inputMode: "decimal", style: { fontVariantNumeric: "tabular-nums" } },
        input: suffixe ? { endAdornment: <InputAdornment position="end">{suffixe}</InputAdornment> } : undefined,
      }}
    />
  );
}
