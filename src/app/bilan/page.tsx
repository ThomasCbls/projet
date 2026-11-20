"use client";

import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import SportsScoreOutlined from "@mui/icons-material/SportsScoreOutlined";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { TableauMensuel, TableauSports } from "@/components/bilan/Tableaux";
import { Chargement, EnTetePage, Section } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { bilanParMois, bilanParSport, syntheseAnnuelle } from "@/lib/calculs";
import { finPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatEuroSigne, formatPct } from "@/lib/format";

function CarteSynthese({
  libelle,
  valeur,
  detail,
  couleur,
  Icone,
}: {
  libelle: string;
  valeur: string;
  detail?: string;
  couleur?: string;
  Icone: typeof TrendingUpRounded;
}) {
  return (
    <Card sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
          {libelle}
        </Typography>
        <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: "bt.surfaceRaised", color: "text.secondary", borderRadius: "10px" }}>
          <Icone fontSize="small" />
        </Avatar>
      </Stack>
      <Typography sx={{ mt: 0.5, fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: couleur }}>{valeur}</Typography>
      {detail && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {detail}
        </Typography>
      )}
    </Card>
  );
}

export default function PageBilan() {
  const { data } = useDonnees();
  const calculs = useMemo(
    () => data && { mensuel: bilanParMois(data), sports: bilanParSport(data), synthese: syntheseAnnuelle(data) },
    [data],
  );
  if (!data || !calculs) return <Chargement />;
  const { mensuel, sports, synthese } = calculs;
  const ben = Math.round(synthese.totalBenefice * 100) / 100;

  return (
    <>
      <EnTetePage
        titre="Bilan"
        sousTitre={`Du ${formatDateCourte(data.dateDebut)} au ${formatDateCourte(finPeriode(data.dateDebut))}`}
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CarteSynthese libelle="Total misé sur 1 an" valeur={formatEuro(synthese.totalMise)} Icone={AccountBalanceWalletOutlined} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CarteSynthese
            libelle="Bénéfice / perte sur 1 an"
            valeur={formatEuroSigne(synthese.totalBenefice)}
            couleur={ben > 0 ? "success.main" : ben < 0 ? "error.main" : undefined}
            detail={`Paris gagnés : ${synthese.parisGagnes} · perdus : ${synthese.parisPerdus}`}
            Icone={TrendingUpRounded}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CarteSynthese
            libelle="% de réussite global"
            valeur={formatPct(synthese.pct)}
            detail={`${synthese.gagnes} gagnés · ${synthese.perdus} perdus`}
            Icone={SportsScoreOutlined}
          />
        </Grid>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Section titre="Bilan par mois">
            <TableauMensuel mois={mensuel.mois} total={mensuel.total} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, xl: 5 }}>
          <Section titre="Bilan par sport" sousTitre="Sur l'année.">
            <TableauSports lignes={sports} />
          </Section>
        </Grid>
      </Grid>
    </>
  );
}
