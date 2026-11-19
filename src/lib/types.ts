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

export const NB_MATCHS_PAR_SPORT = 5;
export const NB_PARIS_PAR_JOUR = 5;

export interface Pari {
  equipes: string;
  /** Mise en euros, null si non renseignée. */
  mise: number | null;
  /** Cote décimale, null si non renseignée. */
  cote: number | null;
  resultat: Resultat;
}

export type TypeJour = "simple" | "combine";

export interface Jour {
  /** Date ISO « AAAA-MM-JJ ». */
  date: string;
  matchs: Record<SportId, Resultat[]>;
  paris: Pari[];
  type: TypeJour;
  miseCombine: number | null;
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
  return { equipes: "", mise: null, cote: null, resultat: "" };
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
  };
}

export function donneesVides(dateDebut: string = DATE_DEBUT_DEFAUT): AppData {
  return { version: 1, dateDebut, jours: {} };
}

/** Un jour ne contient aucune saisie (inutile de le stocker). */
export function estJourVide(j: Jour): boolean {
  const matchsVides = SPORTS.every((s) => j.matchs[s.id].every((r) => r === ""));
  const parisVides = j.paris.every(
    (p) => p.equipes.trim() === "" && p.mise === null && p.cote === null && p.resultat === "",
  );
  return matchsVides && parisVides && j.type === "simple" && j.miseCombine === null;
}
