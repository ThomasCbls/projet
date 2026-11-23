/**
 * Module « Capital » : taux de capitalisation et suivi du patrimoine issu des paris.
 * Fonctions pures, sans dépendance à l'interface.
 *
 * - Gagné          : bénéfice net des paris (mêmes règles que le bilan).
 * - Sécurisé       : mises en sécurité − réinjections (gains mis de côté, hors jeu).
 * - Retiré         : retraits réels vers le compte bancaire.
 * - Capital actif  : dépôts + gagné − retiré − sécurisé (l'argent encore en jeu).
 * - Patrimoine     : capital actif + sécurisé.
 * - Capitalisé     : part des gains mise à l'abri (sécurisée ou retirée), au plus le gain.
 * - Réinvesti      : part des gains laissée en jeu = gagné − capitalisé.
 * - Taux de capitalisation = capitalisé ÷ gagné.
 * - Progression    : (patrimoine + retiré − dépôts) ÷ dépôts = gagné ÷ dépôts.
 */
import { statsParisJour } from "./calculs";
import { cleMois, joursActifs, moisDeLaPeriode } from "./dates";
import type { AppData, Mouvement } from "./types";

export interface EtatCapital {
  depots: number;
  gagne: number;
  retire: number;
  securise: number;
  capitalActif: number;
  patrimoine: number;
  capitalise: number;
  reinvesti: number;
  /** capitalisé ÷ gagné, null sans gain. */
  tauxCapitalisation: number | null;
  /** capital actif ÷ patrimoine, null sans patrimoine positif. */
  partActif: number | null;
  /** gagné ÷ dépôts, null sans dépôt. */
  progression: number | null;
}

interface Flux {
  depots: number;
  gagne: number;
  retire: number;
  securise: number;
}

const fluxVide = (): Flux => ({ depots: 0, gagne: 0, retire: 0, securise: 0 });

function ajouterMouvement(f: Flux, m: Mouvement) {
  if (m.type === "depot") f.depots += m.montant;
  else if (m.type === "retrait") f.retire += m.montant;
  else if (m.type === "securisation") f.securise += m.montant;
  else f.securise -= m.montant;
}

export function etatCapital(f: Flux): EtatCapital {
  const { depots, gagne, retire, securise } = f;
  const capitalActif = depots + gagne - retire - securise;
  const patrimoine = capitalActif + securise;
  const capitalise = gagne > 0 ? Math.min(gagne, Math.max(0, securise + retire)) : 0;
  return {
    depots,
    gagne,
    retire,
    securise,
    capitalActif,
    patrimoine,
    capitalise,
    reinvesti: gagne > 0 ? gagne - capitalise : 0,
    tauxCapitalisation: gagne > 0 ? capitalise / gagne : null,
    partActif: patrimoine > 0 ? capitalActif / patrimoine : null,
    progression: depots > 0 ? gagne / depots : null,
  };
}

export interface LigneMoisCapital {
  /** Clé « AAAA-MM ». */
  mois: string;
  /** Mouvements et bénéfice du mois. */
  flux: Flux;
  /** Situation en fin de mois (cumul depuis le début de la période). */
  fin: EtatCapital;
}

export interface MouvementDate extends Mouvement {
  date: string;
}

export interface Capital {
  /** Situation actuelle (toute la période). */
  etat: EtatCapital;
  /** Mois de la période jusqu'au mois en cours (ou au dernier mois saisi s'il est plus tard). */
  mois: LigneMoisCapital[];
  /** Mouvements de la période, du plus récent au plus ancien. */
  mouvements: MouvementDate[];
}

export function capital(data: AppData, aujourdhui: string): Capital {
  const tousMois = moisDeLaPeriode(data.dateDebut);
  const parMois = new Map(tousMois.map((m) => [m, fluxVide()]));
  const actifs = new Set<string>();
  const mouvements: MouvementDate[] = [];

  for (const date of joursActifs(data.dateDebut)) {
    const jour = data.jours[date];
    if (!jour) continue;
    const f = parMois.get(cleMois(date));
    if (!f) continue;
    const benefice = statsParisJour(jour).benefice;
    f.gagne += benefice;
    for (const m of jour.mouvements) {
      ajouterMouvement(f, m);
      mouvements.push({ ...m, date });
    }
    if (benefice !== 0 || jour.mouvements.length > 0) actifs.add(cleMois(date));
  }

  const courant = cleMois(aujourdhui);
  let dernier = 0;
  tousMois.forEach((m, i) => {
    if (m <= courant || actifs.has(m)) dernier = i;
  });

  const cumul = fluxVide();
  const mois: LigneMoisCapital[] = tousMois.map((m) => {
    const f = parMois.get(m)!;
    cumul.depots += f.depots;
    cumul.gagne += f.gagne;
    cumul.retire += f.retire;
    cumul.securise += f.securise;
    return { mois: m, flux: f, fin: etatCapital({ ...cumul }) };
  });

  return {
    etat: etatCapital(cumul),
    mois: mois.slice(0, dernier + 1),
    mouvements: mouvements.reverse(),
  };
}

/** Identifiant de mouvement suffisamment unique pour un même jour. */
export function nouvelIdMouvement(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
