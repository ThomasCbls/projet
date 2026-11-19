/**
 * Synchronisation « local d'abord » avec un serveur (Supabase en production).
 *
 * - Les données restent dans le localStorage : l'application marche hors ligne.
 * - Chaque jour modifié est noté dans une file d'envoi, avec l'heure de la modification.
 * - Une synchronisation reçoit d'abord ce qui a changé sur le serveur depuis la
 *   dernière fois (curseur `synchro_le`, horloge du serveur), puis envoie la file.
 * - Conflit sur un même jour : la modification la plus récente gagne (`modifie_le`).
 */
import { estDateIso } from "./dates";
import {
  type AccesDonnees,
  type Cles,
  type StorageAdapter,
  CLE_STOCKAGE,
  clesNavigateur,
  compacter,
  ecrireDonneesLocales,
  localStorageAdapter,
  lireDonneesLocales,
  normaliserJour,
} from "./storage";
import { distantSupabase, supabaseDisponible } from "./supabase";
import { type AppData, type Jour, donneesVides, estJourVide } from "./types";

export const CLE_FILE = `${CLE_STOCKAGE}:a-envoyer`;
export const CLE_CURSEUR = `${CLE_STOCKAGE}:curseur`;
export const CLE_COMPTE = `${CLE_STOCKAGE}:compte`;
export const CLE_AVANT_SYNC = `${CLE_STOCKAGE}:avant-sync`;

/** Ligne de la table `jours`. `data` vaut `{}` pour un jour vidé. */
export interface LigneJour {
  date: string;
  data: unknown;
  modifie_le: string;
  synchro_le: string;
}

export interface LigneProfil {
  date_debut: string;
  modifie_le: string;
}

export interface EcritureJour {
  date: string;
  data: Jour | Record<string, never>;
  modifie_le: string;
}

/** Ce que la synchronisation attend du serveur (implémenté par lib/supabase.ts). */
export interface Distant {
  /** Identifiant du compte connecté, ou null. */
  utilisateur(): Promise<string | null>;
  /** Lignes modifiées après le curseur (toutes si null), triées par `synchro_le` croissant. */
  lireJours(depuis: string | null): Promise<LigneJour[]>;
  lireJoursDates(dates: string[]): Promise<LigneJour[]>;
  lireProfil(): Promise<LigneProfil | null>;
  /** Renvoie les dates réellement écrites (une version plus ancienne que celle du serveur est ignorée). */
  ecrireJours(uid: string, lignes: EcritureJour[]): Promise<Set<string>>;
  /** false si la version du serveur est plus récente. */
  ecrireProfil(uid: string, profil: LigneProfil): Promise<boolean>;
  /** Vide tous les jours du compte. */
  viderTout(uid: string, modifie_le: string): Promise<void>;
  deconnecter(): Promise<void>;
}

/** Modifications locales pas encore envoyées : date → heure de la modification (ms). */
export interface FileAttente {
  jours: Record<string, number>;
  profil?: number;
}

/* ------------------------------------------------------------------ */
/* Logique pure                                                        */
/* ------------------------------------------------------------------ */

/** Forme canonique d'un jour pour comparer : "" si vide ou absent. */
function signature(date: string, j: Jour | undefined): string {
  if (!j) return "";
  const n = normaliserJour(date, j);
  return estJourVide(n) ? "" : JSON.stringify(n);
}

/** Dates (et date de début) qui diffèrent entre deux états. */
export function differences(avant: AppData, apres: AppData): { jours: string[]; profil: boolean } {
  const jours: string[] = [];
  for (const d of new Set([...Object.keys(avant.jours), ...Object.keys(apres.jours)])) {
    const a = avant.jours[d];
    const b = apres.jours[d];
    if (a !== b && signature(d, a) !== signature(d, b)) jours.push(d);
  }
  return { jours: jours.sort(), profil: avant.dateDebut !== apres.dateDebut };
}

/**
 * Intègre des lignes du serveur dans les données locales.
 * Une ligne remplace le jour local, sauf si ce jour a été modifié ici plus récemment
 * (il est alors dans la file et sera envoyé). Une ligne retenue retire le jour de la file.
 */
export function fusionner(
  base: AppData,
  lignes: LigneJour[],
  profil: LigneProfil | null,
  file: FileAttente,
): { data: AppData; file: FileAttente; change: boolean } {
  let jours = base.jours;
  let dateDebut = base.dateDebut;
  const fileJours = { ...file.jours };
  let fileProfil = file.profil;

  for (const l of lignes) {
    if (!estDateIso(l.date)) continue;
    const local = fileJours[l.date];
    if (local !== undefined) {
      if (local > Date.parse(l.modifie_le)) continue;
      delete fileJours[l.date];
    }
    const jour = normaliserJour(l.date, l.data);
    if (signature(l.date, jours[l.date]) === signature(l.date, jour)) continue;
    if (jours === base.jours) jours = { ...jours };
    if (estJourVide(jour)) delete jours[l.date];
    else jours[l.date] = jour;
  }

  if (profil && estDateIso(profil.date_debut) && !(fileProfil !== undefined && fileProfil > Date.parse(profil.modifie_le))) {
    fileProfil = undefined;
    dateDebut = profil.date_debut;
  }

  const change = jours !== base.jours || dateDebut !== base.dateDebut;
  return {
    data: change ? { ...base, dateDebut, jours } : base,
    file: fileProfil === undefined ? { jours: fileJours } : { jours: fileJours, profil: fileProfil },
    change,
  };
}

/* ------------------------------------------------------------------ */
/* Adaptateur synchronisé                                              */
/* ------------------------------------------------------------------ */

function lireFile(cles: Cles): FileAttente {
  try {
    const brut: unknown = JSON.parse(cles.lire(CLE_FILE) ?? "null");
    if (typeof brut !== "object" || brut === null) return { jours: {} };
    const o = brut as { jours?: unknown; profil?: unknown };
    const jours: Record<string, number> = {};
    if (typeof o.jours === "object" && o.jours !== null) {
      for (const [d, t] of Object.entries(o.jours)) if (estDateIso(d) && typeof t === "number") jours[d] = t;
    }
    return typeof o.profil === "number" ? { jours, profil: o.profil } : { jours };
  } catch {
    return { jours: {} };
  }
}

const iso = (ms: number) => new Date(ms).toISOString();

export function creerStockageSynchronise(distant: Distant, cles: Cles): StorageAdapter {
  /** Dernier état enregistré : sert à repérer les jours modifiés. */
  let dernier: AppData = donneesVides();
  let file: FileAttente = { jours: {} };
  let horloge = 0;
  // Heures strictement croissantes : une modification pendant un envoi garde une heure différente.
  const maintenant = () => (horloge = Math.max(Date.now(), horloge + 1));

  const ecrireFile = () => {
    if (Object.keys(file.jours).length === 0 && file.profil === undefined) cles.supprimer(CLE_FILE);
    else cles.ecrire(CLE_FILE, JSON.stringify(file));
  };

  /** Enregistre localement et met les différences dans la file. */
  function enregistrer(data: AppData | null) {
    if (!data || data === dernier) return;
    const diff = differences(dernier, data);
    dernier = data;
    ecrireDonneesLocales(cles, data);
    if (diff.jours.length > 0 || diff.profil) {
      const t = maintenant();
      for (const d of diff.jours) file.jours[d] = t;
      if (diff.profil) file.profil = t;
      ecrireFile();
    }
  }

  /** Intègre des données du serveur, puis met l'interface à jour. */
  function integrer(acces: AccesDonnees, lignes: LigneJour[], profil: LigneProfil | null) {
    enregistrer(acces.lire()); // une saisie en cours d'enregistrement n'est pas perdue
    const r = fusionner(dernier, lignes, profil, file);
    file = r.file;
    ecrireFile();
    if (r.change) {
      dernier = r.data;
      ecrireDonneesLocales(cles, dernier);
      acces.appliquer(dernier);
    }
  }

  /** Changement de compte sur cet appareil. */
  function changerDeCompte(acces: AccesDonnees, ancien: string | null, uid: string) {
    enregistrer(acces.lire());
    if (ancien) {
      // Les données d'un autre compte ne doivent pas s'y mélanger : on repart de zéro.
      dernier = donneesVides();
      ecrireDonneesLocales(cles, dernier);
      file = { jours: {} };
      acces.appliquer(dernier);
    } else {
      // Première connexion : les jours saisis ici rejoignent le compte. En cas de conflit,
      // la version déjà en ligne gagne (heure 0) ; une copie de sécurité est gardée.
      if (Object.keys(dernier.jours).length > 0) cles.ecrire(CLE_AVANT_SYNC, JSON.stringify(compacter(dernier)));
      file = { jours: Object.fromEntries(Object.keys(dernier.jours).map((d) => [d, 0])), profil: 0 };
    }
    ecrireFile();
    cles.supprimer(CLE_CURSEUR);
    cles.ecrire(CLE_COMPTE, uid);
  }

  async function envoyer(acces: AccesDonnees, uid: string) {
    enregistrer(acces.lire());

    const jours = Object.entries(file.jours);
    if (jours.length > 0) {
      const lignes = jours.map(([date, t]) => ({ date, data: dernier.jours[date] ?? {}, modifie_le: iso(t) }));
      const acceptees = await distant.ecrireJours(uid, lignes);
      for (const [d, t] of jours) if (file.jours[d] === t) delete file.jours[d];
      ecrireFile();
      const refusees = jours.map(([d]) => d).filter((d) => !acceptees.has(d));
      if (refusees.length > 0) integrer(acces, await distant.lireJoursDates(refusees), null);
    }

    const profil = file.profil;
    if (profil !== undefined) {
      const accepte = await distant.ecrireProfil(uid, { date_debut: dernier.dateDebut, modifie_le: iso(profil) });
      if (file.profil === profil) {
        delete file.profil;
        ecrireFile();
      }
      if (!accepte) integrer(acces, [], await distant.lireProfil());
    }
  }

  async function cycle(acces: AccesDonnees): Promise<boolean> {
    const uid = await distant.utilisateur();
    if (!uid) return false;
    const compte = cles.lire(CLE_COMPTE);
    if (compte !== uid) changerDeCompte(acces, compte, uid);

    // 1. Réception de ce qui a changé ailleurs.
    const [lignes, profil] = await Promise.all([distant.lireJours(cles.lire(CLE_CURSEUR)), distant.lireProfil()]);
    integrer(acces, lignes, profil);
    if (lignes.length > 0) cles.ecrire(CLE_CURSEUR, lignes[lignes.length - 1].synchro_le);

    // 2. Envoi des modifications faites ici.
    await envoyer(acces, uid);
    return true;
  }

  let enCours: Promise<boolean> | null = null;
  let relancer = false;

  return {
    async charger() {
      dernier = lireDonneesLocales(cles);
      file = lireFile(cles);
      return dernier;
    },

    async sauvegarder(data) {
      enregistrer(data);
    },

    async effacer() {
      // Chaque jour connu est envoyé vide, pour que les autres appareils l'effacent aussi.
      enregistrer(donneesVides());
      file.profil = maintenant();
      ecrireFile();
      try {
        const uid = await distant.utilisateur();
        if (uid) await distant.viderTout(uid, iso(maintenant()));
      } catch {
        /* hors ligne : la file sera envoyée plus tard */
      }
    },

    synchro: {
      synchroniser(acces) {
        // Une seule synchronisation à la fois ; une demande pendant l'échange en relance une.
        if (enCours) {
          relancer = true;
          return enCours;
        }
        enCours = (async () => {
          try {
            let ok: boolean;
            do {
              relancer = false;
              ok = await cycle(acces);
            } while (relancer && ok);
            return ok;
          } finally {
            enCours = null;
          }
        })();
        return enCours;
      },

      nbEnAttente: () => Object.keys(file.jours).length + (file.profil === undefined ? 0 : 1),

      async oublier() {
        await distant.deconnecter();
        for (const cle of [CLE_STOCKAGE, CLE_FILE, CLE_CURSEUR, CLE_COMPTE, CLE_AVANT_SYNC]) cles.supprimer(cle);
        dernier = donneesVides();
        file = { jours: {} };
      },
    },
  };
}

/** Point unique de choix du stockage. */
export function creerStockage(): StorageAdapter {
  return supabaseDisponible ? creerStockageSynchronise(distantSupabase(), clesNavigateur) : localStorageAdapter;
}
