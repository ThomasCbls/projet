import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ResumeJour } from "@/lib/calculs";
import { formatEuro, formatPct } from "@/lib/format";
import { Montant } from "../ui";

function Stat({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <Box sx={{ borderRadius: "12px", bgcolor: "bt.surfaceRaised", px: 1.5, py: 1.25 }}>
      <Typography component="dt" variant="caption" sx={{ color: "text.secondary" }}>
        {libelle}
      </Typography>
      <Typography component="dd" sx={{ m: 0, fontSize: "1.2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </Typography>
    </Box>
  );
}

const G = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ color: "success.main" }}>
    {children}
  </Box>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ color: "error.main" }}>
    {children}
  </Box>
);

export function RecapJour({ resume }: { resume: ResumeJour }) {
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}
    >
      <Stat libelle="Matchs gagnés">
        <G>{resume.gagnes}</G>
      </Stat>
      <Stat libelle="Matchs perdus">
        <P>{resume.perdus}</P>
      </Stat>
      <Stat libelle="% réussite">{formatPct(resume.pct)}</Stat>
      <Stat libelle="Paris G / P">
        <G>{resume.parisGagnes}</G> / <P>{resume.parisPerdus}</P>
      </Stat>
      <Stat libelle="Total misé">{formatEuro(resume.mise)}</Stat>
      <Stat libelle="Bénéfice / perte">
        <Montant valeur={resume.benefice} />
      </Stat>
    </Box>
  );
}
