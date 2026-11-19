"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useMemo, useState } from "react";
import { TableauMatrice } from "@/components/bilan/Tableaux";
import { Chargement, EnTetePage } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { matriceSportMois } from "@/lib/calculs";

const MESURES = [
  { id: "gagnes", titre: "Matchs gagnés" },
  { id: "perdus", titre: "Matchs perdus" },
  { id: "pct", titre: "% de réussite" },
] as const;

export default function PageParSport() {
  const { data } = useDonnees();
  const [onglet, setOnglet] = useState(0);
  const matrice = useMemo(() => (data ? matriceSportMois(data) : null), [data]);
  if (!matrice) return <Chargement />;
  const mesure = MESURES[onglet];

  return (
    <>
      <EnTetePage
        titre="Détail par sport et par mois"
        sousTitre="Tout est calculé automatiquement à partir de la saisie quotidienne."
      />
      <Card>
        <Tabs
          value={onglet}
          onChange={(_, v: number) => setOnglet(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Mesure affichée"
          sx={{ px: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {MESURES.map((m, i) => (
            <Tab key={m.id} label={m.titre} id={`onglet-${m.id}`} aria-controls={`panneau-${m.id}`} value={i} />
          ))}
        </Tabs>
        <Box role="tabpanel" id={`panneau-${mesure.id}`} aria-labelledby={`onglet-${mesure.id}`} sx={{ p: { xs: 2, sm: 2.5 } }}>
          <TableauMatrice matrice={matrice} mesure={mesure.id} titre={mesure.titre} />
        </Box>
      </Card>
    </>
  );
}
