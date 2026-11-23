/**
 * Module « Rentabilité » : ROI global, par type de pari et par sport, mois par mois.
 * Fonctions pures, sans dépendance à l'interface.
 *
 *   ROI = bénéfice net ÷ total des mises (des paris tranchés)
 *
 * Seuls les paris TRANCHÉS (gagnés ou perdus) entrent dans le ROI : la mise d'un pari
 * encore sans résultat est comptée à part (« en cours »). Ainsi :
 *   gains encaissés − total des mises = bénéfice net.
 *
 * Les montants suivent les règles du classeur (voir calculs.ts) : un pari simple gagné
 * sans cote rapporte −mise, un combiné compte pour un seul pari.
 */
import { beneficeCombine, beneficePariSimple, combineGagne, combinePerdu, coteCombinee, pourcentage } from "./calculs";
import { cleMois, joursActifs, moisDeLaPeriode } from "./dates";
import { type AppData, type Jour, type Pari, type SportPariId, type TypeJour, SPORTS_PARIS } from "./types";

const val = (n: number | null | undefined): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Sport d'un ticket : un sport, « multi » (combiné multi-sports) ou « nc » (non renseigné). */
export type SportTicket = SportPariId | "multi" | "nc";

export const NOMS_SPORTS_TICKET: Record<SportTicket, string> = {
  ...(Object.fromEntries(SPORTS_PARIS.map((s) => [s.id, s.nom])) as Record<SportPariId, string>),
  multi: "Multi-sports",
  nc: "Sport non renseigné",
};

/** Un pari simple ou un combiné entier, tranché. */
export interface Ticket {
  date: string;
  type: TypeJour;
  sport: SportTicket;
  mise: number;
  benefice: number;
  /** Cote du pari (cote combinée pour un combiné), null si non renseignée. */
  cote: number | null;
  gagne: boolean;
}

/** Un pari a été renseigné (au moins un champ). */
const pariRenseigne = (p: Pari) =>
  p.equipes.trim() !== "" || p.mise !== null || p.cote !== null || p.resultat !== "" || p.sport !== "";

/** Sport d'un combiné : commun à toutes les sélections renseignées, sinon « multi ». */
export function sportCombine(paris: Pari[]): SportTicket {
  const sports = new Set(paris.filter(pariRenseigne).map((p) => p.sport));
  sports.delete("");
  if (sports.size === 0) return "nc";
  if (sports.size > 1) return "multi";
  return [...sports][0] as SportPariId;
}

/** Tickets tranchés d'un jour et mise des paris encore sans résultat. */
export function ticketsJour(jour: Jour): { tickets: Ticket[]; enCours: number } {
  const tickets: Ticket[] = [];
  let enCours = 0;
  if (jour.type === "combine") {
    const gagne = combineGagne(jour.paris);
    if (gagne || combinePerdu(jour.paris)) {
      tickets.push({
        date: jour.date,
        type: "combine",
        sport: sportCombine(jour.paris),
        mise: val(jour.miseCombine),
        benefice: beneficeCombine(jour.paris, jour.miseCombine),
        cote: coteCombinee(jour.paris),
        gagne,
      });
    } else {
      enCours += val(jour.miseCombine);
    }
    return { tickets, enCours };
  }
  for (const p of jour.paris) {
    if (p.resultat === "") {
      enCours += val(p.mise);
      continue;
    }
    tickets.push({
      date: jour.date,
      type: "simple",
      sport: p.sport === "" ? "nc" : p.sport,
      mise: val(p.mise),
      benefice: beneficePariSimple(p),
      cote: p.cote,
      gagne: p.resultat === "G",
    });
  }
  return { tickets, enCours };
}

/* ------------------------------------------------------------------ */
/* Indicateurs                                                         */
/* ------------------------------------------------------------------ */

export interface Indicateurs {
  /** Nombre de paris tranchés (un combiné = un pari). */
  nbParis: number;
  gagnes: number;
  perdus: number;
  /** Taux de réussite : gagnés ÷ tranchés. */
  reussite: number | null;
  /** Total des mises des paris tranchés. */
  mises: number;
  /** Gains encaissés : mise + bénéfice des paris tranchés (0 pour un pari perdu). */
  gainsEncaisses: number;
  /** Bénéfice net = gains encaissés − mises. */
  benefice: number;
  /** Somme des bénéfices des paris gagnés. */
  beneficesBruts: number;
  /** Somme des pertes (valeur négative ou nulle). */
  pertes: number;
  /** ROI = bénéfice net ÷ mises, null sans mise. */
  roi: number | null;
  /** Moyenne des cotes renseignées, null si aucune. */
  coteMoyenne: number | null;
}

export function indicateurs(tickets: Ticket[]): Indicateurs {
  let gagnes = 0;
  let mises = 0;
  let benefice = 0;
  let beneficesBruts = 0;
  let pertes = 0;
  let sommeCotes = 0;
  let nbCotes = 0;
  for (const t of tickets) {
    if (t.gagne) gagnes++;
    mises += t.mise;
    benefice += t.benefice;
    if (t.benefice > 0) beneficesBruts += t.benefice;
    else pertes += t.benefice;
    if (t.cote !== null && Number.isFinite(t.cote)) {
      sommeCotes += t.cote;
      nbCotes++;
    }
  }
  const perdus = tickets.length - gagnes;
  return {
    nbParis: tickets.length,
    gagnes,
    perdus,
    reussite: pourcentage(gagnes, perdus),
    mises,
    gainsEncaisses: mises + benefice,
    benefice,
    beneficesBruts,
    pertes: pertes + 0,
    roi: mises === 0 ? null : benefice / mises,
    coteMoyenne: nbCotes === 0 ? null : sommeCotes / nbCotes,
  };
}

/* ------------------------------------------------------------------ */
/* Rentabilité d'une période (un mois ou toute la période)             */
/* ------------------------------------------------------------------ */

export interface LigneSportRentabilite {
  id: SportTicket;
  nom: string;
  total: Indicateurs;
  simples: Indicateurs;
  combines: Indicateurs;
}

/** Segment sport × type (ex. « combinés de football ») pour les points forts / faibles. */
export interface Segment {
  sport: SportTicket;
  type: TypeJour;
  libelle: string;
  ind: Indicateurs;
  /** ROI global si ce segment n'avait pas été joué (null sans autre mise). */
  roiSans: number | null;
}

export interface Rentabilite {
  global: Indicateurs;
  simples: Indicateurs;
  combines: Indicateurs;
  /** Sports ayant au moins un pari tranché, par bénéfice décroissant. */
  parSport: LigneSportRentabilite[];
  /** Mises des paris sans résultat. */
  enCours: number;
  /** Segment au meilleur ROI (bénéfice positif), avec assez de paris. */
  pointFort: Segment | null;
  /** Segment qui pèse le plus sur le bénéfice (perte la plus forte). */
  pointFaible: Segment | null;
}

/** Nombre minimal de paris tranchés pour juger un segment. */
export const MIN_PARIS_SEGMENT = 3;

const libelleSegment = (sport: SportTicket, type: TypeJour) => {
  const genre = type === "simple" ? "simples" : "combinés";
  if (sport === "multi") return `Combinés multi-sports`;
  if (sport === "nc") return `Paris ${genre} sans sport`;
  return `Paris ${genre} – ${NOMS_SPORTS_TICKET[sport]}`;
};

/** Tickets et mises en cours des jours de la période, filtrés sur un mois (« AAAA-MM ») ou non. */
export function ticketsPeriode(data: AppData, mois: string | null = null): { tickets: Ticket[]; enCours: number } {
  const tickets: Ticket[] = [];
  let enCours = 0;
  for (const date of joursActifs(data.dateDebut)) {
    if (mois !== null && cleMois(date) !== mois) continue;
    const jour = data.jours[date];
    if (!jour) continue;
    const r = ticketsJour(jour);
    tickets.push(...r.tickets);
    enCours += r.enCours;
  }
  return { tickets, enCours };
}

export function rentabilite(data: AppData, mois: string | null = null): Rentabilite {
  const { tickets, enCours } = ticketsPeriode(data, mois);
  const global = indicateurs(tickets);
  const simples = tickets.filter((t) => t.type === "simple");
  const combines = tickets.filter((t) => t.type === "combine");

  const ordre: SportTicket[] = [...SPORTS_PARIS.map((s) => s.id), "multi", "nc"];
  const parSport: LigneSportRentabilite[] = ordre
    .map((id) => {
      const duSport = tickets.filter((t) => t.sport === id);
      return {
        id,
        nom: NOMS_SPORTS_TICKET[id],
        total: indicateurs(duSport),
        simples: indicateurs(duSport.filter((t) => t.type === "simple")),
        combines: indicateurs(duSport.filter((t) => t.type === "combine")),
      };
    })
    .filter((l) => l.total.nbParis > 0)
    .sort((a, b) => b.total.benefice - a.total.benefice);

  const segments: Segment[] = [];
  for (const l of parSport) {
    for (const type of ["simple", "combine"] as const) {
      const ind = type === "simple" ? l.simples : l.combines;
      if (ind.nbParis < MIN_PARIS_SEGMENT) continue;
      const misesSans = global.mises - ind.mises;
      segments.push({
        sport: l.id,
        type,
        libelle: libelleSegment(l.id, type),
        ind,
        roiSans: misesSans === 0 ? null : (global.benefice - ind.benefice) / misesSans,
      });
    }
  }
  const gagnants = segments.filter((s) => s.ind.benefice > 0 && s.ind.roi !== null);
  const perdants = segments.filter((s) => s.ind.benefice < 0);
  const pointFort = gagnants.sort((a, b) => b.ind.roi! - a.ind.roi! || b.ind.benefice - a.ind.benefice)[0] ?? null;
  const pointFaible = perdants.sort((a, b) => a.ind.benefice - b.ind.benefice)[0] ?? null;

  return {
    global,
    simples: indicateurs(simples),
    combines: indicateurs(combines),
    parSport,
    enCours,
    pointFort,
    pointFaible,
  };
}

/* ------------------------------------------------------------------ */
/* Mois par mois                                                       */
/* ------------------------------------------------------------------ */

export interface LigneMoisRentabilite {
  /** Clé « AAAA-MM ». */
  mois: string;
  global: Indicateurs;
  simples: Indicateurs;
  combines: Indicateurs;
}

/**
 * Rentabilité de chaque mois de la période, jusqu'au mois en cours
 * (ou jusqu'au dernier mois comportant un pari tranché, s'il est plus tard).
 */
export function rentabiliteParMois(data: AppData, aujourdhui: string): LigneMoisRentabilite[] {
  const { tickets } = ticketsPeriode(data);
  const tous = moisDeLaPeriode(data.dateDebut);
  const parMois = new Map<string, Ticket[]>(tous.map((m) => [m, []]));
  for (const t of tickets) parMois.get(cleMois(t.date))?.push(t);
  const courant = cleMois(aujourdhui);
  let dernier = 0;
  tous.forEach((m, i) => {
    if (m <= courant || parMois.get(m)!.length > 0) dernier = i;
  });
  return tous.slice(0, dernier + 1).map((m) => {
    const ts = parMois.get(m)!;
    return {
      mois: m,
      global: indicateurs(ts),
      simples: indicateurs(ts.filter((t) => t.type === "simple")),
      combines: indicateurs(ts.filter((t) => t.type === "combine")),
    };
  });
}
