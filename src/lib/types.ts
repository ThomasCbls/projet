/** Résultat d'un match ou d'un pari : vide, Gagné ou Perdu. */
export type Resultat = "" | "G" | "P";

export const SPORTS = [
  { id: "foot", nom: "Foot" },
  { id: "volley", nom: "Volley" },
  { id: "tennisDeTable", nom: "Tennis de table" },
  { id: "tennis", nom: "Tennis" },
  { id: "basket", nom: "Basket" },
  { id: "hockey", nom: "Hockey" },
  { id: "badminton", nom: "Badminton" },
  { id: "combat", nom: "Sport de combat" },
] as const;

export type SportId = (typeof SPORTS)[number]["id"];

/**
 * Sports proposés pour un pari : ceux du suivi des matchs, plus le rugby et « Autre ».
 * (La grille des matchs reste limitée à `SPORTS`, fidèle au classeur Excel.)
 */
export const SPORTS_PARIS = [...SPORTS, { id: "rugby", nom: "Rugby" }, { id: "autre", nom: "Autre" }] as const;

export type SportPariId = (typeof SPORTS_PARIS)[number]["id"];

export function estSportPari(v: unknown): v is SportPariId {
  return SPORTS_PARIS.some((s) => s.id === v);
}

export function nomSportPari(id: SportPariId): string {
  return SPORTS_PARIS.find((s) => s.id === id)?.nom ?? id;
}

export const NB_MATCHS_PAR_SPORT = 5;
export const NB_PARIS_PAR_JOUR = 5;

export interface Pari {
  equipes: string;
  /** Mise en euros, null si non renseignée. */
  mise: number | null;
  /** Cote décimale, null si non renseignée. */
  cote: number | null;
  resultat: Resultat;
  /** Sport du pari (ou de la sélection d'un combiné), "" si non renseigné. */
  sport: SportPariId | "";
}

export type TypeJour = "simple" | "combine";

export interface Jour {
  /** Date ISO « AAAA-MM-JJ ». */
  date: string;
  matchs: Record<SportId, Resultat[]>;
  paris: Pari[];
  type: TypeJour;
  miseCombine: number | null;
  /** Mouvements de capital du jour (dépôts, retraits, mises en sécurité…). */
  mouvements: Mouvement[];
}

/**
 * Mouvement de capital (module « Capital ») :
 * - depot : argent personnel apporté au capital de jeu ;
 * - retrait : argent réellement retiré (vers le compte bancaire) ;
 * - securisation : gains mis de côté, hors du capital de jeu ;
 * - reinjection : somme sécurisée remise dans le capital de jeu.
 */
export type TypeMouvement = "depot" | "retrait" | "securisation" | "reinjection";

export const TYPES_MOUVEMENT: { id: TypeMouvement; nom: string; description: string }[] = [
  { id: "depot", nom: "Dépôt", description: "Argent personnel ajouté au capital de jeu." },
  { id: "retrait", nom: "Retrait", description: "Argent réellement retiré vers ton compte." },
  { id: "securisation", nom: "Mise en sécurité", description: "Gains mis de côté, hors du capital de jeu." },
  { id: "reinjection", nom: "Réinjection", description: "Somme sécurisée remise dans le capital de jeu." },
];

export interface Mouvement {
  /** Identifiant stable (clé d'affichage, suppression). */
  id: string;
  type: TypeMouvement;
  /** Montant positif, en euros. */
  montant: number;
  note: string;
}

export interface AppData {
  version: 1;
  /** Date de début de saisie, ISO « AAAA-MM-JJ ». */
  dateDebut: string;
  /** Jours saisis, indexés par date ISO (stockage creux). */
  jours: Record<string, Jour>;
}

export const DATE_DEBUT_DEFAUT = "2026-11-18";

export function pariVide(): Pari {
  return { equipes: "", mise: null, cote: null, resultat: "", sport: "" };
}

export function jourVide(date: string): Jour {
  const matchs = {} as Record<SportId, Resultat[]>;
  for (const s of SPORTS) {
    matchs[s.id] = Array.from({ length: NB_MATCHS_PAR_SPORT }, () => "" as Resultat);
  }
  return {
    date,
    matchs,
    paris: Array.from({ length: NB_PARIS_PAR_JOUR }, pariVide),
    type: "simple",
    miseCombine: null,
    mouvements: [],
  };
}

export function donneesVides(dateDebut: string = DATE_DEBUT_DEFAUT): AppData {
  return { version: 1, dateDebut, jours: {} };
}

/** Un jour ne contient aucune saisie (inutile de le stocker). */
export function estJourVide(j: Jour): boolean {
  const matchsVides = SPORTS.every((s) => j.matchs[s.id].every((r) => r === ""));
  const parisVides = j.paris.every(
    (p) => p.equipes.trim() === "" && p.mise === null && p.cote === null && p.resultat === "" && p.sport === "",
  );
  return matchsVides && parisVides && j.type === "simple" && j.miseCombine === null && j.mouvements.length === 0;
}
