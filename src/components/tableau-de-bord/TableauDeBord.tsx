"use client";

import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SportsScoreOutlined from "@mui/icons-material/SportsScoreOutlined";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo } from "react";
import { Chargement, EnTetePage, Montant, Section } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { aujourdhuiIso, finPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatEuroSigne, formatPct } from "@/lib/format";
import { tableauDeBord } from "@/lib/tableauDeBord";
import {
  GraphBeneficeCumule,
  GraphBeneficeParMois,
  GraphMatchsParMois,
  GraphReussiteParSport,
  JaugeReussite,
  MiniCourbe,
  useCouleurs,
} from "./Graphiques";

function Tuile({
  libelle,
  valeur,
  couleur,
  detail,
  Icone,
  children,
}: {
  libelle: string;
  valeur: React.ReactNode;
  couleur?: string;
  detail?: React.ReactNode;
  Icone: typeof TrendingUpRounded;
  children?: React.ReactNode;
}) {
  return (
    <Card sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
          {libelle}
        </Typography>
        <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: "action.hover", color: "text.secondary" }}>
          <Icone fontSize="small" />
        </Avatar>
      </Stack>
      <Typography sx={{ fontSize: { xs: "1.75rem", sm: "2rem" }, fontWeight: 700, lineHeight: 1.15, color: couleur }}>
        {valeur}
      </Typography>
      {detail && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {detail}
        </Typography>
      )}
      {children && <Box sx={{ mt: "auto", pt: 1.5 }}>{children}</Box>}
    </Card>
  );
}

function Barre({ valeur, libelle }: { valeur: number | null; libelle: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={valeur === null ? 0 : valeur * 100}
      aria-label={libelle}
      sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 4 } }}
    />
  );
}

function LienSection({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button component={Link} href={href} size="small" endIcon={<ChevronRightRounded />} sx={{ mr: -1 }}>
      {children}
    </Button>
  );
}

export function TableauDeBord() {
  const { data } = useDonnees();
  const couleurs = useCouleurs();
  const t = useMemo(() => (data ? tableauDeBord(data, aujourdhuiIso()) : null), [data]);
  if (!data || !t) return <Chargement />;

  const { synthese: s } = t;
  const ben = Math.round(s.totalBenefice * 100) / 100;
  const parisTranches = s.parisGagnes + s.parisPerdus;

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        sousTitre={`Du ${formatDateCourte(data.dateDebut)} au ${formatDateCourte(finPeriode(data.dateDebut))} · ${t.joursSaisis} jour${t.joursSaisis > 1 ? "s" : ""} saisi${t.joursSaisis > 1 ? "s" : ""}`}
        action={
          <Button component={Link} href="/saisie" variant="contained" startIcon={<EditNoteRounded />}>
            Saisir aujourd&apos;hui
          </Button>
        }
      />

      {t.joursSaisis === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Aucune saisie pour l&apos;instant. Renseignez vos matchs et vos paris dans <strong>Saisie du jour</strong> :
          les statistiques et les graphiques se rempliront d'eux-mêmes.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Indicateurs clés */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Bénéfice / perte"
            Icone={TrendingUpRounded}
            valeur={formatEuroSigne(s.totalBenefice)}
            couleur={ben > 0 ? "success.main" : ben < 0 ? "error.main" : undefined}
            detail={t.roi === null ? "Aucune mise" : `Rendement ${formatPct(t.roi)} des mises`}
          >
            <MiniCourbe valeurs={t.cumul.map((p) => p.cumul)} couleur={couleurs.serie} />
          </Tuile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Total misé"
            Icone={AccountBalanceWalletOutlined}
            valeur={formatEuro(s.totalMise)}
            detail={`${parisTranches} pari${parisTranches > 1 ? "s" : ""} tranché${parisTranches > 1 ? "s" : ""}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Réussite des matchs"
            Icone={SportsScoreOutlined}
            valeur={formatPct(s.pct)}
            detail={`${s.gagnes} gagnés · ${s.perdus} perdus`}
          >
            <Barre valeur={s.pct} libelle="Part des matchs gagnés" />
          </Tuile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Réussite des paris"
            Icone={ReceiptLongOutlined}
            valeur={formatPct(t.pctParis)}
            detail={`${s.parisGagnes} gagnés · ${s.parisPerdus} perdus`}
          >
            <Barre valeur={t.pctParis} libelle="Part des paris gagnés" />
          </Tuile>
        </Grid>

        {/* Évolution du bénéfice + réussite */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Section titre="Bénéfice cumulé" sousTitre="Évolution du bénéfice / perte total, jour après jour.">
            <GraphBeneficeCumule points={t.cumul} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Section titre="Taux de réussite" sousTitre="Sur toute la période.">
            <Stack direction="row" sx={{ justifyContent: "space-around", mb: 1 }}>
              {[
                { libelle: "Matchs", valeur: s.pct },
                { libelle: "Paris", valeur: t.pctParis },
              ].map((j) => (
                <Box key={j.libelle} sx={{ textAlign: "center" }}>
                  <JaugeReussite valeur={j.valeur} libelle={`Réussite des ${j.libelle.toLowerCase()}`} />
                  <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
                    {j.libelle}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: "action.hover", color: "text.secondary" }}>
                  <EmojiEventsOutlined fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Meilleur sport
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {t.meilleurSport ? `${t.meilleurSport.nom} · ${formatPct(t.meilleurSport.pct)}` : "–"}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: "action.hover", color: "text.secondary" }}>
                  <SportsScoreOutlined fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Matchs joués
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{s.gagnes + s.perdus}</Typography>
                </Box>
              </Stack>
            </Stack>
          </Section>
        </Grid>

        {/* Par mois */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Section
            titre="Bénéfice par mois"
            sousTitre="Gain au-dessus de zéro, perte au-dessous."
            action={<LienSection href="/bilan">Bilan</LienSection>}
          >
            <GraphBeneficeParMois mois={t.mois} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Section
            titre="Matchs par mois"
            sousTitre="Matchs gagnés et perdus chaque mois."
            action={<LienSection href="/bilan">Bilan</LienSection>}
          >
            <GraphMatchsParMois mois={t.mois} />
          </Section>
        </Grid>

        {/* Par sport + derniers jours */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Section
            titre="Réussite par sport"
            sousTitre="Part des matchs gagnés, du meilleur au moins bon."
            action={<LienSection href="/sports">Détail</LienSection>}
          >
            <GraphReussiteParSport sports={t.sports} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Section
            titre="Derniers jours saisis"
            sousTitre="Toucher un jour pour le modifier."
            action={<LienSection href="/historique">Historique</LienSection>}
          >
            {t.derniersJours.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>
                Aucun jour saisi pour l&apos;instant.
              </Typography>
            ) : (
              <List disablePadding sx={{ mx: -1 }}>
                {t.derniersJours.map((r) => (
                  <ListItemButton key={r.date} component={Link} href={`/saisie?date=${r.date}`} sx={{ borderRadius: 2 }}>
                    <ListItemText
                      primary={formatDateCourte(r.date)}
                      secondary={
                        <>
                          <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
                            {r.gagnes} G
                          </Box>
                          {" · "}
                          <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                            {r.perdus} P
                          </Box>
                          {` · ${formatPct(r.pct)} · misé ${formatEuro(r.mise)}`}
                        </>
                      }
                      slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                    />
                    <Montant valeur={r.benefice} sx={{ fontWeight: 700, ml: 2 }} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Section>
        </Grid>
      </Grid>
    </>
  );
}
