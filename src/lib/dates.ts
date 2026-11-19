/**
 * Arithmétique de dates sur des chaînes ISO « AAAA-MM-JJ », calculée en UTC
 * pour éviter tout décalage lié au fuseau horaire ou à l'heure d'été.
 */

/** Nombre maximal de lignes de la feuille « Suivi » (lignes 6 à 371). */
export const NB_LIGNES_MAX = 366;
/** Nombre de mois du bilan (feuille « Bilan », lignes 7 à 19). */
export const NB_MOIS = 13;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function estDateIso(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function versUtc(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

export function depuisUtc(d: Date): string {
  const a = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const j = String(d.getUTCDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

/** Équivalent d'Excel DATE(a, m, j) : débordements de mois/jours normalisés. */
export function dateExcel(annee: number, mois: number, jour: number): string {
  return depuisUtc(new Date(Date.UTC(annee, mois - 1, jour)));
}

export function ajouterJours(iso: string, n: number): string {
  const d = versUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return depuisUtc(d);
}

/** Bilan!B4 : =DATE(YEAR(B3)+1, MONTH(B3), DAY(B3)) - 1 */
export function finPeriode(debut: string): string {
  const [a, m, j] = debut.split("-").map(Number);
  return ajouterJours(dateExcel(a + 1, m, j), -1);
}

/**
 * Colonne A de « Suivi » : à partir du début, +1 jour par ligne tant que
 * la date reste ≤ fin, sur 366 lignes maximum.
 */
export function joursActifs(debut: string): string[] {
  const fin = finPeriode(debut);
  const jours: string[] = [];
  let d = debut;
  for (let i = 0; i < NB_LIGNES_MAX && d <= fin; i++) {
    jours.push(d);
    d = ajouterJours(d, 1);
  }
  return jours;
}

/** Clé de mois « AAAA-MM » (colonne C de « Suivi » : 1er du mois). */
export function cleMois(iso: string): string {
  return iso.slice(0, 7);
}

/** Bilan!A7:A19 : 13 mois à partir du mois de début. */
export function moisDeLaPeriode(debut: string): string[] {
  const [a, m] = debut.split("-").map(Number);
  return Array.from({ length: NB_MOIS }, (_, i) => cleMois(dateExcel(a, m + i, 1)));
}

export function estDansPeriode(iso: string, debut: string): boolean {
  return iso >= debut && iso <= finPeriode(debut);
}

/** Date du jour (fuseau local de l'appareil) au format ISO. */
export function aujourdhuiIso(maintenant: Date = new Date()): string {
  const a = maintenant.getFullYear();
  const m = String(maintenant.getMonth() + 1).padStart(2, "0");
  const j = String(maintenant.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

/** Ramène une date dans les bornes [début, fin]. */
export function bornerDate(iso: string, debut: string): string {
  const fin = finPeriode(debut);
  if (iso < debut) return debut;
  if (iso > fin) return fin;
  return iso;
}
