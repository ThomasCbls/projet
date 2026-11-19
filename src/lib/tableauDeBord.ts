/**
 * Indicateurs du tableau de bord, calculés à partir des fonctions de `calculs.ts`.
 * Fonctions pures : aucune dépendance à l'interface.
 */
import {
  type CelluleSport,
  type LigneBilan,
  type PointCumul,
  type ResumeJour,
  type Synthese,
  beneficeCumule,
  bilanParMois,
  bilanParSport,
  pourcentage,
  resumesPeriode,
  syntheseAnnuelle,
} from "./calculs";
import { cleMois } from "./dates";
import type { AppData, SportId } from "./types";

/** Un jour comporte au moins un match joué ou un pari (mise, résultat). */
export function aActivite(r: ResumeJour): boolean {
  return r.gagnes + r.perdus > 0 || r.mise !== 0 || r.benefice !== 0 || r.parisGagnes + r.parisPerdus > 0;
}

export type LigneSport = CelluleSport & { id: SportId; nom: string; total: number };

export interface TableauDeBord {
  synthese: Synthese;
  /** Rendement : bénéfice ÷ total misé, null sans mise. */
  roi: number | null;
  /** Paris gagnés ÷ (gagnés + perdus), null sans pari tranché. */
  pctParis: number | null;
  /** Nombre de jours de la période comportant une saisie. */
  joursSaisis: number;
  /** Mois de la période jusqu'au mois en cours (ou au dernier mois saisi s'il est plus tard). */
  mois: LigneBilan[];
  /** Bilan annuel par sport, sans la ligne « Tous sports ». */
  sports: LigneSport[];
  cumul: PointCumul[];
  /** Les jours saisis les plus récents, du plus récent au plus ancien. */
  derniersJours: ResumeJour[];
  /** Sport au meilleur % de réussite (à égalité : le plus de matchs gagnés). */
  meilleurSport: { nom: string; pct: number } | null;
}

export const NB_DERNIERS_JOURS = 7;

export function tableauDeBord(data: AppData, aujourdhui: string): TableauDeBord {
  const actifs = resumesPeriode(data).filter(aActivite);
  const synthese = syntheseAnnuelle(data);

  const moisSaisis = new Set(actifs.map((r) => cleMois(r.date)));
  const moisCourant = cleMois(aujourdhui);
  const tousMois = bilanParMois(data).mois;
  let dernier = 0;
  tousMois.forEach((l, i) => {
    if (l.mois <= moisCourant || moisSaisis.has(l.mois)) dernier = i;
  });

  const sports = bilanParSport(data).filter((s): s is LigneSport => s.id !== "tous");
  let meilleurSport: TableauDeBord["meilleurSport"] = null;
  let meilleurGagnes = -1;
  for (const s of sports) {
    if (s.pct === null) continue;
    if (!meilleurSport || s.pct > meilleurSport.pct || (s.pct === meilleurSport.pct && s.gagnes > meilleurGagnes)) {
      meilleurSport = { nom: s.nom, pct: s.pct };
      meilleurGagnes = s.gagnes;
    }
  }

  return {
    synthese,
    roi: synthese.totalMise === 0 ? null : synthese.totalBenefice / synthese.totalMise,
    pctParis: pourcentage(synthese.parisGagnes, synthese.parisPerdus),
    joursSaisis: actifs.length,
    mois: tousMois.slice(0, dernier + 1),
    sports,
    cumul: beneficeCumule(data),
    derniersJours: actifs.slice(-NB_DERNIERS_JOURS).reverse(),
    meilleurSport,
  };
}
