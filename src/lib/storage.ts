/**
 * Couche d'accès aux données, isolée du reste de l'application.
 *
 * Par défaut : localStorage du navigateur. Pour passer à Vercel KV, Supabase…,
 * il suffit d'écrire un autre `StorageAdapter` (charger / sauvegarder) et de
 * le renvoyer depuis `creerStockage()`.
 */
import { estDateIso } from "./dates";
import {
  type AppData,
  type Jour,
  type Pari,
  type Resultat,
  DATE_DEBUT_DEFAUT,
  NB_MATCHS_PAR_SPORT,
  NB_PARIS_PAR_JOUR,
  SPORTS,
  donneesVides,
  estJourVide,
  jourVide,
} from "./types";

export interface StorageAdapter {
  charger(): Promise<AppData>;
  sauvegarder(data: AppData): Promise<void>;
  effacer(): Promise<void>;
}

export const CLE_STOCKAGE = "suivi-sport:v1";

export class ErreurImport extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurImport";
  }
}

/* ------------------------------------------------------------------ */
/* Validation / normalisation (import JSON, données stockées)          */
/* ------------------------------------------------------------------ */

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function normResultat(v: unknown): Resultat {
  if (typeof v !== "string") return "";
  const s = v.trim().toUpperCase();
  return s === "G" || s === "P" ? s : "";
}

function normNombre(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", ".").replace(/\s/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normPari(v: unknown): Pari {
  const o = estObjet(v) ? v : {};
  return {
    equipes: typeof o.equipes === "string" ? o.equipes : "",
    mise: normNombre(o.mise),
    cote: normNombre(o.cote),
    resultat: normResultat(o.resultat),
  };
}

function normJour(date: string, v: unknown): Jour {
  const base = jourVide(date);
  if (!estObjet(v)) return base;
  const matchs = estObjet(v.matchs) ? v.matchs : {};
  for (const s of SPORTS) {
    const cases = Array.isArray(matchs[s.id]) ? (matchs[s.id] as unknown[]) : [];
    base.matchs[s.id] = Array.from({ length: NB_MATCHS_PAR_SPORT }, (_, i) => normResultat(cases[i]));
  }
  const paris = Array.isArray(v.paris) ? v.paris : [];
  base.paris = Array.from({ length: NB_PARIS_PAR_JOUR }, (_, i) => normPari(paris[i]));
  const type = typeof v.type === "string" ? v.type.toLowerCase() : "";
  base.type = type === "combine" || type === "combiné" ? "combine" : "simple";
  base.miseCombine = normNombre(v.miseCombine);
  return base;
}

/**
 * Valide et répare des données inconnues (JSON importé, localStorage).
 * Lève `ErreurImport` si la structure n'est pas reconnaissable.
 */
export function normaliserDonnees(brut: unknown): AppData {
  if (!estObjet(brut)) throw new ErreurImport("Le fichier ne contient pas un objet JSON.");
  if (!("jours" in brut) || !estObjet(brut.jours)) {
    throw new ErreurImport("Format inconnu : la clé « jours » est absente.");
  }
  const dateDebut = estDateIso(brut.dateDebut) ? brut.dateDebut : DATE_DEBUT_DEFAUT;
  const jours: Record<string, Jour> = {};
  for (const [date, j] of Object.entries(brut.jours)) {
    if (!estDateIso(date)) continue;
    const jour = normJour(date, j);
    if (!estJourVide(jour)) jours[date] = jour;
  }
  return { version: 1, dateDebut, jours };
}

/** Retire les jours vides pour garder un stockage compact. */
export function compacter(data: AppData): AppData {
  const jours: Record<string, Jour> = {};
  for (const [d, j] of Object.entries(data.jours)) if (!estJourVide(j)) jours[d] = j;
  return { ...data, jours };
}

/* ------------------------------------------------------------------ */
/* Export / import JSON                                                */
/* ------------------------------------------------------------------ */

export function exporterJSON(data: AppData): string {
  const jours = Object.fromEntries(Object.entries(compacter(data).jours).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({ ...data, jours }, null, 2);
}

export function importerJSON(texte: string): AppData {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new ErreurImport("Fichier JSON illisible.");
  }
  return normaliserDonnees(brut);
}

/* ------------------------------------------------------------------ */
/* Adaptateur localStorage                                             */
/* ------------------------------------------------------------------ */

export const localStorageAdapter: StorageAdapter = {
  async charger() {
    let texte: string | null = null;
    try {
      texte = window.localStorage.getItem(CLE_STOCKAGE);
      if (!texte) return donneesVides();
      return normaliserDonnees(JSON.parse(texte));
    } catch {
      // Données illisibles : on garde une copie de secours avant qu'elles ne soient écrasées.
      try {
        if (texte) window.localStorage.setItem(`${CLE_STOCKAGE}:secours`, texte);
      } catch {
        /* stockage indisponible */
      }
      return donneesVides();
    }
  },
  async sauvegarder(data) {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(compacter(data)));
  },
  async effacer() {
    window.localStorage.removeItem(CLE_STOCKAGE);
  },
};

/** Point unique de choix du stockage. */
export function creerStockage(): StorageAdapter {
  return localStorageAdapter;
}
