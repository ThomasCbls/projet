"use client";

import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useDonnees } from "@/hooks/useDonnees";
import { resumeJour, statsParisJour } from "@/lib/calculs";
import { ajouterJours, aujourdhuiIso, bornerDate, estDateIso, finPeriode } from "@/lib/dates";
import { formatDateCourte, formatDateLongue, formatNombre } from "@/lib/format";
import { type Jour, type Pari, type Resultat, type SportId, type TypeJour, SPORTS } from "@/lib/types";
import { RappelRisques } from "../Marque";
import { Chargement, ChampNombre, Montant, Section, masqueVisuel } from "../ui";
import { CarteSport } from "./CarteSport";
import { LignePari } from "./LignePari";
import { RecapJour } from "./RecapJour";

export function SaisieJour() {
  const { data, lireJour, majJour } = useDonnees();
  const router = useRouter();
  const params = useSearchParams();

  const debut = data?.dateDebut ?? "";
  const fin = debut ? finPeriode(debut) : "";
  const demande = params.get("date");
  const date = debut ? bornerDate(estDateIso(demande) ? demande : aujourdhuiIso(), debut) : "";

  const allerA = useCallback(
    (d: string) => {
      if (!debut || !estDateIso(d)) return;
      router.replace(`/saisie?date=${bornerDate(d, debut)}`, { scroll: false });
    },
    [router, debut],
  );

  const jour = date ? lireJour(date) : null;
  const resume = useMemo(() => (jour ? resumeJour(date, jour) : null), [jour, date]);

  if (!data || !jour || !resume) return <Chargement />;

  const maj = (fn: (j: Jour) => Jour) => majJour(date, fn);
  const setMatch = (sport: SportId, i: number, v: Resultat) =>
    maj((j) => ({ ...j, matchs: { ...j.matchs, [sport]: j.matchs[sport].map((c, k) => (k === i ? v : c)) } }));
  const setPari = (i: number, p: Pari) => maj((j) => ({ ...j, paris: j.paris.map((x, k) => (k === i ? p : x)) }));
  const combine = jour.type === "combine";
  const stats = statsParisJour(jour);
  const hors = demande !== null && estDateIso(demande) && demande !== date;
  const estAujourdhui = date === aujourdhuiIso();

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {/* Sélecteur de date */}
      <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box aria-live="polite">
            <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              {estAujourdhui ? "Saisie d'aujourd'hui" : "Saisie du jour"}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.5rem", sm: "1.9rem" } }}>
              <span aria-hidden="true">{formatDateCourte(date)}</span>
              <Box component="span" sx={masqueVisuel}>
                Saisie du {formatDateLongue(date)}
              </Box>
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={() => allerA(ajouterJours(date, -1))}
              disabled={date <= debut}
              aria-label="Jour précédent"
              sx={{ border: 1, borderColor: "bt.lineStrong", bgcolor: "bt.surfaceRaised" }}
            >
              <ChevronLeftRounded />
            </IconButton>
            <TextField
              type="date"
              value={date}
              onChange={(e) => allerA(e.target.value)}
              slotProps={{ htmlInput: { min: debut, max: fin, "aria-label": "Choisir une date" } }}
              sx={{ width: 170 }}
            />
            <IconButton
              onClick={() => allerA(ajouterJours(date, 1))}
              disabled={date >= fin}
              aria-label="Jour suivant"
              sx={{ border: 1, borderColor: "bt.lineStrong", bgcolor: "bt.surfaceRaised" }}
            >
              <ChevronRightRounded />
            </IconButton>
            <Button variant="outlined" startIcon={<TodayRounded />} onClick={() => allerA(aujourdhuiIso())} disabled={estAujourdhui}>
              Aujourd&apos;hui
            </Button>
          </Box>
        </Box>
        {hors && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Date hors de la période de suivi : affichage du jour le plus proche.
          </Alert>
        )}
      </Card>

      {/* Matchs */}
      <Box component="section" aria-labelledby="titre-matchs">
        <Box sx={{ mb: 1.5, display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
          <Typography id="titre-matchs" variant="h5" component="h2">
            Matchs
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Toucher une case : vide → G → P → vide
          </Typography>
        </Box>
        <Grid container spacing={1.5}>
          {SPORTS.map((s) => (
            <Grid key={s.id} size={{ xs: 12, sm: 6, xl: 3 }}>
              <CarteSport nom={s.nom} cases={jour.matchs[s.id]} onChange={(i, v) => setMatch(s.id, i, v)} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Paris */}
      <Box component="section" aria-labelledby="titre-paris">
        <Typography id="titre-paris" variant="h5" component="h2" sx={{ mb: 0.5 }}>
          Paris
        </Typography>
        <RappelRisques sx={{ mb: 1.5, display: { xs: "flex", md: "none" } }} />
        <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              alignItems: "end",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            <Box>
              <Typography id="type-jour" variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
                Type du jour
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                size="small"
                value={jour.type}
                onChange={(_, type: TypeJour | null) => type && maj((j) => ({ ...j, type }))}
                aria-labelledby="type-jour"
                sx={{ height: 40 }}
              >
                <ToggleButton value="simple">Simple</ToggleButton>
                <ToggleButton value="combine">Combiné</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {combine && (
              <>
                <ChampNombre
                  libelle="Mise combiné"
                  suffixe="€"
                  valeur={jour.miseCombine}
                  onChange={(miseCombine) => maj((j) => ({ ...j, miseCombine }))}
                />
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
                    Cote du combiné (calculée)
                  </Typography>
                  <Typography
                    sx={{
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      px: 1.5,
                      borderRadius: "12px",
                      bgcolor: "bt.surfaceRaised",
                      border: 1,
                      borderColor: "bt.lineStrong",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNombre(stats.coteCombinee)}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
          {combine && (
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Les cotes des sélections se multiplient. Une seule sélection perdue et tout le combiné est perdu. Résultat
              actuel : <Montant valeur={stats.benefice} sx={{ fontWeight: 700 }} />
            </Typography>
          )}
        </Card>
        <Grid container spacing={1.5}>
          {jour.paris.map((p, i) => (
            <Grid key={i} size={{ xs: 12, xl: 6 }}>
              <LignePari numero={i + 1} pari={p} combine={combine} onChange={(np) => setPari(i, np)} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Récap */}
      <Section titre="Récap du jour">
        <RecapJour resume={resume} />
      </Section>
    </Box>
  );
}
