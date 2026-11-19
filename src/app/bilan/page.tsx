"use client";

import { useMemo } from "react";
import {
  GraphBeneficeCumule,
  GraphGagnesPerdusParSport,
  GraphPctParMois,
  GraphPctParSport,
} from "@/components/bilan/Graphiques";
import { TableauMensuel, TableauSports } from "@/components/bilan/Tableaux";
import { Carte, Chargement, TitrePage } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { beneficeCumule, bilanParMois, bilanParSport, syntheseAnnuelle } from "@/lib/calculs";
import { finPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatEuroSigne, formatPct } from "@/lib/format";

function CarteSynthese({
  libelle,
  valeur,
  detail,
  ton = "neutre",
}: {
  libelle: string;
  valeur: string;
  detail?: string;
  ton?: "neutre" | "positif" | "negatif";
}) {
  const couleur =
    ton === "positif"
      ? "border-gagne/40 text-gagne"
      : ton === "negatif"
        ? "border-perdu/40 text-perdu"
        : "border-bord";
  return (
    <div className={`rounded-xl border bg-carte p-4 ${couleur}`}>
      <p className="text-sm text-attenue">{libelle}</p>
      <p className="chiffres mt-1 text-3xl font-bold">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-attenue">{detail}</p>}
    </div>
  );
}

export default function PageBilan() {
  const { data } = useDonnees();
  const calculs = useMemo(
    () =>
      data && {
        mensuel: bilanParMois(data),
        sports: bilanParSport(data),
        synthese: syntheseAnnuelle(data),
        cumul: beneficeCumule(data),
      },
    [data],
  );
  if (!data || !calculs) return <Chargement />;
  const { mensuel, sports, synthese, cumul } = calculs;
  const ben = Math.round(synthese.totalBenefice * 100) / 100;

  return (
    <div className="space-y-5">
      <TitrePage sousTitre={`Du ${formatDateCourte(data.dateDebut)} au ${formatDateCourte(finPeriode(data.dateDebut))}`}>
        Bilan
      </TitrePage>

      <div className="grid gap-3 sm:grid-cols-3">
        <CarteSynthese libelle="Total misé sur 1 an" valeur={formatEuro(synthese.totalMise)} />
        <CarteSynthese
          libelle="Bénéfice / perte sur 1 an"
          valeur={formatEuroSigne(synthese.totalBenefice)}
          ton={ben > 0 ? "positif" : ben < 0 ? "negatif" : "neutre"}
          detail={`Paris gagnés : ${synthese.parisGagnes} · perdus : ${synthese.parisPerdus}`}
        />
        <CarteSynthese
          libelle="% de réussite global"
          valeur={formatPct(synthese.pct)}
          detail={`${synthese.gagnes} gagnés · ${synthese.perdus} perdus`}
        />
      </div>

      <Carte titre="Bilan par mois">
        <TableauMensuel mois={mensuel.mois} total={mensuel.total} />
      </Carte>

      <Carte titre="Bilan par sport (sur l'année)">
        <TableauSports lignes={sports} />
      </Carte>

      <section aria-labelledby="titre-graphiques" className="space-y-3">
        <h2 id="titre-graphiques" className="text-lg font-semibold">
          Graphiques
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <GraphPctParMois mois={mensuel.mois} />
          <GraphBeneficeCumule points={cumul} />
          <GraphGagnesPerdusParSport sports={sports.filter((s) => s.id !== "tous")} />
          <GraphPctParSport sports={sports.filter((s) => s.id !== "tous")} />
        </div>
      </section>
    </div>
  );
}
