/**
 * Couche d'accès aux données, isolée du reste de l'application.
 *
 * Les données vivent toujours dans le localStorage du navigateur (l'application
 * fonctionne hors ligne). Si Supabase est configuré, `creerStockage()` (lib/sync.ts)
 * renvoie un adaptateur qui synchronise en plus ces données avec le compte de
 * l'utilisateur.
 */
import { estDateIso } from "./dates";
import {
  type AppData,
  type Jour,
  type Mouvement,
  type Pari,
  type Resultat,
  type TypeMouvement,
  DATE_DEBUT_DEFAUT,
  NB_MATCHS_PAR_SPORT,
  NB_PARIS_PAR_JOUR,
  SPORTS,
  TYPES_MOUVEMENT,
  donneesVides,
  estJourVide,
  estSportPari,
  jourVide,
} from "./types";

/** Accès de l'adaptateur à l'état affiché par l'interface (voir hooks/useDonnees). */
export interface AccesDonnees {
  /** Dernières données de l'interface, y compris une saisie pas encore sauvegardée. */
  lire(): AppData | null;
  /** Remplace les données de l'interface (modifications reçues d'un autre appareil). */
  appliquer(data: AppData): void;
}

/** Synchronisation en ligne, présente seulement si elle est configurée. */
export interface Synchronisation {
  /** Échange avec le serveur. `false` si personne n'est connecté ; lève une erreur si le réseau échoue. */
  synchroniser(acces: AccesDonnees): Promise<boolean>;
  /** Nombre de modifications pas encore envoyées. */
  nbEnAttente(): number;
  /** Déconnecte le compte et efface les données de cet appareil. */
  oublier(): Promise<void>;
}

export interface StorageAdapter {
  charger(): Promise<AppData>;
  sauvegarder(data: AppData): Promise<void>;
  effacer(): Promise<void>;
  synchro?: Synchronisation;
}

/** Stockage clé / valeur (localStorage dans le navigateur, une Map dans les tests). */
export interface Cles {
  lire(cle: string): string | null;
  ecrire(cle: string, valeur: string): void;
  supprimer(cle: string): void;
}

export const clesNavigateur: Cles = {
  lire: (cle) => window.localStorage.getItem(cle),
  ecrire: (cle, valeur) => window.localStorage.setItem(cle, valeur),
  supprimer: (cle) => window.localStorage.removeItem(cle),
};

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
    sport: estSportPari(o.sport) ? o.sport : "",
  };
}

const estTypeMouvement = (v: unknown): v is TypeMouvement => TYPES_MOUVEMENT.some((t) => t.id === v);

/** Mouvement de capital valide, ou null (type inconnu, montant absent ou ≤ 0). */
function normMouvement(v: unknown, i: number): Mouvement | null {
  if (!estObjet(v) || !estTypeMouvement(v.type)) return null;
  const montant = normNombre(v.montant);
  if (montant === null || montant <= 0) return null;
  return {
    id: typeof v.id === "string" && v.id !== "" ? v.id : `m${i}`,
    type: v.type,
    montant,
    note: typeof v.note === "string" ? v.note : "",
  };
}

export function normaliserJour(date: string, v: unknown): Jour {
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
  const mouvements = Array.isArray(v.mouvements) ? v.mouvements : [];
  base.mouvements = mouvements.map(normMouvement).filter((m): m is Mouvement => m !== null);
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
    const jour = normaliserJour(date, j);
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

export function lireDonneesLocales(cles: Cles): AppData {
  let texte: string | null = null;
  try {
    texte = cles.lire(CLE_STOCKAGE);
    if (!texte) return donneesVides();
    return normaliserDonnees(JSON.parse(texte));
  } catch {
    // Données illisibles : on garde une copie de secours avant qu'elles ne soient écrasées.
    try {
      if (texte) cles.ecrire(`${CLE_STOCKAGE}:secours`, texte);
    } catch {
      /* stockage indisponible */
    }
    return donneesVides();
  }
}

export function ecrireDonneesLocales(cles: Cles, data: AppData): void {
  cles.ecrire(CLE_STOCKAGE, JSON.stringify(compacter(data)));
}

export const localStorageAdapter: StorageAdapter = {
  async charger() {
    return lireDonneesLocales(clesNavigateur);
  },
  async sauvegarder(data) {
    ecrireDonneesLocales(clesNavigateur, data);
  },
  async effacer() {
    clesNavigateur.supprimer(CLE_STOCKAGE);
  },
};
