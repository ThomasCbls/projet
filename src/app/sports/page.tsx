"use client";

import { useMemo } from "react";
import { TableauMatrice } from "@/components/bilan/Tableaux";
import { Carte, Chargement, TitrePage } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { matriceSportMois } from "@/lib/calculs";

export default function PageParSport() {
  const { data } = useDonnees();
  const matrice = useMemo(() => (data ? matriceSportMois(data) : null), [data]);
  if (!matrice) return <Chargement />;

  return (
    <div className="space-y-5">
      <TitrePage sousTitre="Tout est calculé automatiquement à partir de la saisie quotidienne.">
        Détail par sport et par mois
      </TitrePage>
      <Carte titre="Matchs gagnés">
        <TableauMatrice matrice={matrice} mesure="gagnes" titre="Matchs gagnés" />
      </Carte>
      <Carte titre="Matchs perdus">
        <TableauMatrice matrice={matrice} mesure="perdus" titre="Matchs perdus" />
      </Carte>
      <Carte titre="% de réussite">
        <TableauMatrice matrice={matrice} mesure="pct" titre="% de réussite" />
      </Carte>
    </div>
  );
}
