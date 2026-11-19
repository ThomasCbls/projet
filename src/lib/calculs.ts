/**
 * Fonctions de calcul PURES, fidèles aux formules du classeur
 * « suivi_sport_annuel.xlsx » (feuilles Suivi, Paris, Bilan, Par sport).
 *
 * Convention Excel reproduite : une cellule numérique vide vaut 0 dans un calcul.
 */
import { cleMois, joursActifs, moisDeLaPeriode } from "./dates";
import { type AppData, type Jour, type Pari, type Resultat, type SportId, SPORTS } from "./types";

/* ------------------------------------------------------------------ */
/* Pourcentage                                                         */
/* ------------------------------------------------------------------ */

/** =IF(G+P=0,"",G/(G+P)) → null quand non calculable. */
export function pourcentage(gagnes: number, perdus: number): number | null {
  const total = gagnes + perdus;
  return total === 0 ? null : gagnes / total;
}

const val = (n: number | null | undefined): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const compter = (resultats: Resultat[], r: Resultat) => resultats.filter((x) => x === r).length;

/* ------------------------------------------------------------------ */
/* Matchs (feuille Suivi)                                              */
/* ------------------------------------------------------------------ */

export interface StatsMatchs {
  gagnes: number;
  perdus: number;
  pct: number | null;
}

/** Suivi!AR / AS / AT : COUNTIF sur les 40 cases sport du jour. */
export function statsMatchsJour(jour: Jour | undefined): StatsMatchs {
  if (!jour) return { gagnes: 0, perdus: 0, pct: null };
  let gagnes = 0;
  let perdus = 0;
  for (const s of SPORTS) {
    const cases = jour.matchs[s.id] ?? [];
    gagnes += compter(cases, "G");
    perdus += compter(cases, "P");
  }
  return { gagnes, perdus, pct: pourcentage(gagnes, perdus) };
}

/** Gagnés / perdus d'un sport pour un jour. */
export function statsSportJour(jour: Jour | undefined, sport: SportId): { gagnes: number; perdus: number } {
  const cases = jour?.matchs[sport] ?? [];
  return { gagnes: compter(cases, "G"), perdus: compter(cases, "P") };
}

/* ------------------------------------------------------------------ */
/* Paris (feuille Paris)                                               */
/* ------------------------------------------------------------------ */

/** Bénéfice d'un pari simple : G → mise×(cote−1) ; P → −mise ; sinon 0. */
export function beneficePariSimple(p: Pari): number {
  if (p.resultat === "G") return val(p.mise) * (val(p.cote) - 1) + 0; // + 0 : évite -0
  if (p.resultat === "P") return 0 - val(p.mise);
  return 0;
}

/** Cotes renseignées (équivalent de COUNT / PRODUCT qui ignorent les vides). */
function cotesRenseignees(paris: Pari[]): number[] {
  return paris.map((p) => p.cote).filter((c): c is number => typeof c === "number" && Number.isFinite(c));
}

/** Paris!Y : produit des cotes renseignées, null si aucune. */
export function coteCombinee(paris: Pari[]): number | null {
  const cotes = cotesRenseignees(paris);
  if (cotes.length === 0) return null;
  return cotes.reduce((acc, c) => acc * c, 1);
}

interface ComptesCombine {
  nbCotes: number;
  nbG: number;
  nbP: number;
}

function comptesCombine(paris: Pari[]): ComptesCombine {
  const resultats = paris.map((p) => p.resultat);
  return {
    nbCotes: cotesRenseignees(paris).length,
    nbG: compter(resultats, "G"),
    nbP: compter(resultats, "P"),
  };
}

/** Le combiné est gagné : au moins une cote, autant de G que de cotes, aucune perte (Paris!AA). */
export function combineGagne(paris: Pari[]): boolean {
  const { nbCotes, nbG, nbP } = comptesCombine(paris);
  return nbCotes > 0 && nbG === nbCotes && nbP === 0;
}

/** Le combiné est perdu : au moins une sélection perdue (Paris!AB). */
export function combinePerdu(paris: Pari[]): boolean {
  return comptesCombine(paris).nbP > 0;
}

/**
 * Paris!AC (combiné) :
 * une perte → −mise ; sinon toutes les sélections cotées gagnées → mise×(cote combinée−1) ; sinon 0.
 */
export function beneficeCombine(paris: Pari[], miseCombine: number | null): number {
  const { nbCotes, nbG, nbP } = comptesCombine(paris);
  const mise = val(miseCombine);
  if (nbP > 0) return 0 - mise;
  if (nbCotes > 0 && nbG === nbCotes) return mise * (val(coteCombinee(paris)) - 1) + 0;
  return 0;
}

export interface StatsParis {
  /** Paris!Z — total misé du jour. */
  mise: number;
  /** Paris!AC — bénéfice / perte du jour. */
  benefice: number;
  /** Paris!AA — paris gagnés du jour (0/1 pour un combiné). */
  parisGagnes: number;
  /** Paris!AB — paris perdus du jour (0/1 pour un combiné). */
  parisPerdus: number;
  /** Paris!Y — cote combinée (null en simple ou sans cote). */
  coteCombinee: number | null;
}

export function statsParisJour(jour: Jour | undefined): StatsParis {
  if (!jour) return { mise: 0, benefice: 0, parisGagnes: 0, parisPerdus: 0, coteCombinee: null };
  const paris = jour.paris;
  if (jour.type === "combine") {
    return {
      mise: val(jour.miseCombine),
      benefice: beneficeCombine(paris, jour.miseCombine),
      parisGagnes: combineGagne(paris) ? 1 : 0,
      parisPerdus: combinePerdu(paris) ? 1 : 0,
      coteCombinee: coteCombinee(paris),
    };
  }
  // Simple (y compris type vide dans Excel)
  const resultats = paris.map((p) => p.resultat);
  return {
    mise: paris.reduce((s, p) => s + val(p.mise), 0),
    benefice: paris.reduce((s, p) => s + beneficePariSimple(p), 0),
    parisGagnes: compter(resultats, "G"),
    parisPerdus: compter(resultats, "P"),
    coteCombinee: null,
  };
}

/** Pari simple gagné sans cote : Excel le compte comme −mise (cote vide = 0). */
export function pariSansCote(p: Pari): boolean {
  return p.resultat === "G" && p.cote === null && val(p.mise) !== 0;
}

/* ------------------------------------------------------------------ */
/* Résumé d'un jour                                                    */
/* ------------------------------------------------------------------ */

export interface ResumeJour extends StatsMatchs, StatsParis {
  date: string;
}

export function resumeJour(date: string, jour: Jour | undefined): ResumeJour {
  return { date, ...statsMatchsJour(jour), ...statsParisJour(jour) };
}

/** Résumés de tous les jours actifs de la période (Suivi + Paris). */
export function resumesPeriode(data: AppData): ResumeJour[] {
  return joursActifs(data.dateDebut).map((d) => resumeJour(d, data.jours[d]));
}

/* ------------------------------------------------------------------ */
/* Bilan par mois (feuille Bilan, A6:G20)                              */
/* ------------------------------------------------------------------ */

export interface LigneBilan {
  /** Clé « AAAA-MM », ou "total". */
  mois: string;
  gagnes: number;
  perdus: number;
  total: number;
  pct: number | null;
  mise: number;
  benefice: number;
}

function ligne(mois: string, gagnes: number, perdus: number, mise: number, benefice: number): LigneBilan {
  return { mois, gagnes, perdus, total: gagnes + perdus, pct: pourcentage(gagnes, perdus), mise, benefice };
}

export function bilanParMois(data: AppData): { mois: LigneBilan[]; total: LigneBilan } {
  const cles = moisDeLaPeriode(data.dateDebut);
  const acc = new Map(cles.map((m) => [m, { g: 0, p: 0, mise: 0, ben: 0 }]));
  for (const r of resumesPeriode(data)) {
    const a = acc.get(cleMois(r.date));
    if (!a) continue;
    a.g += r.gagnes;
    a.p += r.perdus;
    a.mise += r.mise;
    a.ben += r.benefice;
  }
  const mois = cles.map((m) => {
    const a = acc.get(m)!;
    return ligne(m, a.g, a.p, a.mise, a.ben);
  });
  const somme = (k: "gagnes" | "perdus" | "mise" | "benefice") => mois.reduce((s, l) => s + l[k], 0);
  return { mois, total: ligne("total", somme("gagnes"), somme("perdus"), somme("mise"), somme("benefice")) };
}

/* ------------------------------------------------------------------ */
/* Par sport (feuille Par sport + Bilan A23:E32)                       */
/* ------------------------------------------------------------------ */

export interface CelluleSport {
  gagnes: number;
  perdus: number;
  pct: number | null;
}

export interface LigneMatrice {
  /** Identifiant du sport, ou "tous". */
  id: SportId | "tous";
  nom: string;
  parMois: CelluleSport[];
  total: CelluleSport;
}

export interface MatriceSportMois {
  mois: string[];
  lignes: LigneMatrice[];
}

const cellule = (gagnes: number, perdus: number): CelluleSport => ({ gagnes, perdus, pct: pourcentage(gagnes, perdus) });

/** Matrices sport × mois (gagnés, perdus, %) avec ligne « Tous sports » et colonne Total. */
export function matriceSportMois(data: AppData): MatriceSportMois {
  const mois = moisDeLaPeriode(data.dateDebut);
  const indexMois = new Map(mois.map((m, i) => [m, i]));
  const g: Record<string, number[]> = {};
  const p: Record<string, number[]> = {};
  for (const s of SPORTS) {
    g[s.id] = mois.map(() => 0);
    p[s.id] = mois.map(() => 0);
  }
  for (const date of joursActifs(data.dateDebut)) {
    const jour = data.jours[date];
    if (!jour) continue;
    const i = indexMois.get(cleMois(date));
    if (i === undefined) continue;
    for (const s of SPORTS) {
      const st = statsSportJour(jour, s.id);
      g[s.id][i] += st.gagnes;
      p[s.id][i] += st.perdus;
    }
  }
  const lignes: LigneMatrice[] = SPORTS.map((s) => {
    const parMois = mois.map((_, i) => cellule(g[s.id][i], p[s.id][i]));
    const tg = g[s.id].reduce((a, b) => a + b, 0);
    const tp = p[s.id].reduce((a, b) => a + b, 0);
    return { id: s.id, nom: s.nom, parMois, total: cellule(tg, tp) };
  });
  const tous: LigneMatrice = {
    id: "tous",
    nom: "Tous sports",
    parMois: mois.map((_, i) =>
      cellule(
        lignes.reduce((s, l) => s + l.parMois[i].gagnes, 0),
        lignes.reduce((s, l) => s + l.parMois[i].perdus, 0),
      ),
    ),
    total: cellule(
      lignes.reduce((s, l) => s + l.total.gagnes, 0),
      lignes.reduce((s, l) => s + l.total.perdus, 0),
    ),
  };
  return { mois, lignes: [...lignes, tous] };
}

/** Bilan par sport sur l'année (+ « Tous sports » en dernière ligne). */
export function bilanParSport(data: AppData): (CelluleSport & { id: SportId | "tous"; nom: string; total: number })[] {
  return matriceSportMois(data).lignes.map((l) => ({
    id: l.id,
    nom: l.nom,
    ...l.total,
    total: l.total.gagnes + l.total.perdus,
  }));
}

/* ------------------------------------------------------------------ */
/* Synthèse & séries                                                   */
/* ------------------------------------------------------------------ */

export interface Synthese {
  totalMise: number;
  totalBenefice: number;
  gagnes: number;
  perdus: number;
  pct: number | null;
  parisGagnes: number;
  parisPerdus: number;
}

export function syntheseAnnuelle(data: AppData): Synthese {
  const resumes = resumesPeriode(data);
  const s = (k: keyof Omit<ResumeJour, "date" | "pct" | "coteCombinee">) =>
    resumes.reduce((acc, r) => acc + r[k], 0);
  const gagnes = s("gagnes");
  const perdus = s("perdus");
  return {
    totalMise: s("mise"),
    totalBenefice: s("benefice"),
    gagnes,
    perdus,
    pct: pourcentage(gagnes, perdus),
    parisGagnes: s("parisGagnes"),
    parisPerdus: s("parisPerdus"),
  };
}

export interface PointCumul {
  date: string;
  benefice: number;
  cumul: number;
}

/** Bénéfice cumulé jour par jour, jusqu'au dernier jour comportant une mise ou un résultat. */
export function beneficeCumule(data: AppData): PointCumul[] {
  const resumes = resumesPeriode(data);
  let dernier = -1;
  resumes.forEach((r, i) => {
    if (r.mise !== 0 || r.benefice !== 0 || r.parisGagnes + r.parisPerdus > 0) dernier = i;
  });
  let cumul = 0;
  return resumes.slice(0, dernier + 1).map((r) => {
    cumul += r.benefice;
    return { date: r.date, benefice: r.benefice, cumul };
  });
}
