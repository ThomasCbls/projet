"use client";

import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { beneficePariSimple, pariSansCote } from "@/lib/calculs";
import { formatEuro } from "@/lib/format";
import { type Pari, type Resultat, type SportPariId, SPORTS_PARIS } from "@/lib/types";
import { styleStatut } from "@/theme/statuts";
import { ChampNombre, Montant, masqueVisuel } from "../ui";

const OPTIONS: { valeur: Resultat; texte: string; aria: string; statut?: "success" | "error" }[] = [
  { valeur: "", texte: "–", aria: "Sans résultat" },
  { valeur: "G", texte: "G", aria: "Gagné", statut: "success" },
  { valeur: "P", texte: "P", aria: "Perdu", statut: "error" },
];

/** Gagné / Perdu / sans résultat. */
export function ChoixResultat({ valeur, onChange }: { valeur: Resultat; onChange: (r: Resultat) => void }) {
  const id = useId();
  return (
    <Box>
      <Typography id={id} variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
        Résultat
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={valeur}
        onChange={(_, r: Resultat | null) => r !== null && onChange(r)}
        aria-labelledby={id}
        sx={{ height: 40 }}
      >
        {OPTIONS.map((o) => (
          <ToggleButton
            key={o.valeur || "vide"}
            value={o.valeur}
            aria-label={o.aria}
            sx={{
              fontWeight: 700,
              fontSize: "1rem",
              ...(o.statut && { "&.Mui-selected, &.Mui-selected:hover": styleStatut(o.statut) }),
            }}
          >
            {o.texte}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

export function LignePari({
  numero,
  pari,
  combine,
  onChange,
}: {
  numero: number;
  pari: Pari;
  combine: boolean;
  onChange: (p: Pari) => void;
}) {
  const maj = (champ: Partial<Pari>) => onChange({ ...pari, ...champ });
  const titre = combine ? `Sélection ${numero}` : `Pari ${numero}`;

  return (
    <Card component="fieldset" sx={{ p: 2, m: 0, minWidth: 0 }}>
      <Box component="legend" sx={masqueVisuel}>
        {titre}
      </Box>
      <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography aria-hidden="true" variant="subtitle2">
          {titre}
        </Typography>
        {!combine && pari.resultat !== "" && <Montant valeur={beneficePariSimple(pari)} sx={{ fontWeight: 700 }} />}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          alignItems: "end",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: combine ? "minmax(0,1fr) 6rem 9rem" : "minmax(0,1fr) 7rem 6rem 9rem",
          },
        }}
      >
        <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, display: "grid", gap: 1.5, gridTemplateColumns: "minmax(0,1fr) 8rem" }}>
          <TextField
            label="Équipes / pari"
            fullWidth
            placeholder="Ex. PSG – OM"
            value={pari.equipes}
            onChange={(e) => maj({ equipes: e.target.value })}
          />
          <TextField
            select
            label="Sport"
            fullWidth
            value={pari.sport}
            onChange={(e) => maj({ sport: e.target.value as SportPariId | "" })}
          >
            <MenuItem value="">–</MenuItem>
            {SPORTS_PARIS.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.nom}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {!combine && <ChampNombre libelle="Mise" suffixe="€" valeur={pari.mise} onChange={(mise) => maj({ mise })} />}
        <ChampNombre libelle="Cote" valeur={pari.cote} onChange={(cote) => maj({ cote })} />
        <Box sx={{ gridColumn: { xs: combine ? "auto" : "1 / -1", sm: "auto" } }}>
          <ChoixResultat valeur={pari.resultat} onChange={(resultat) => maj({ resultat })} />
        </Box>
      </Box>
      {!combine && pariSansCote(pari) && (
        <Typography
          variant="caption"
          sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 0.75, color: "error.main" }}
        >
          <WarningAmberRounded fontSize="small" />
          Cote manquante : comme dans Excel, ce pari gagné compte {formatEuro(0 - (pari.mise ?? 0))}.
        </Typography>
      )}
    </Card>
  );
}
