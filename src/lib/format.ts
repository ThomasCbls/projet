/** Formatage à la française (montants, pourcentages, dates). */
import { versUtc } from "./dates";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euroSigne = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", signDisplay: "exceptZero" });
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Évite l'affichage de « -0,00 € » pour des résidus flottants. */
const nettoyer = (n: number) => (Math.abs(n) < 0.005 ? 0 : n);

/** 1234.5 → « 1 234,50 € » */
export function formatEuro(n: number): string {
  return euro.format(nettoyer(n));
}

/** 12.5 → « +12,50 € », −3 → « −3,00 € », 0 → « 0,00 € » */
export function formatEuroSigne(n: number): string {
  return euroSigne.format(nettoyer(n));
}

/** 0.6667 → « 66,7 % » ; null → « – » */
export function formatPct(p: number | null): string {
  return p === null || !Number.isFinite(p) ? "–" : pct.format(p);
}

const pctSigne = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

/** 0.15 → « +15 % », −0.04 → « −4 % » ; null → « – » (ROI, progression) */
export function formatPctSigne(p: number | null): string {
  return p === null || !Number.isFinite(p) ? "–" : pctSigne.format(Math.abs(p) < 0.0005 ? 0 : p);
}

/** 1.8512 → « 1,85 » ; null → « – » */
export function formatNombre(n: number | null): string {
  return n === null || !Number.isFinite(n) ? "–" : nombre.format(n);
}

export const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 2026-11-18 » → « Mer » (colonne B de Suivi) */
export function jourSemaine(iso: string): string {
  return JOURS_COURTS[versUtc(iso).getUTCDay()];
}

/** « 2026-11-18 » → « Mer 18 nov. 2026 » */
export function formatDateCourte(iso: string): string {
  const d = versUtc(iso);
  return `${JOURS_COURTS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** « 2026-11-18 » → « mercredi 18 novembre 2026 » (pour les lecteurs d'écran) */
export function formatDateLongue(iso: string): string {
  const d = versUtc(iso);
  return `${JOURS_LONGS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** « 2026-11 » → « nov. 2026 » */
export function formatMoisCourt(cle: string): string {
  const [a, m] = cle.split("-").map(Number);
  return `${MOIS_COURTS[m - 1]} ${a}`;
}

/** « 2026-11 » → « Novembre 2026 » */
export function formatMoisLong(cle: string): string {
  const [a, m] = cle.split("-").map(Number);
  const nom = MOIS_LONGS[m - 1];
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${a}`;
}

/** Saisie utilisateur → nombre : accepte « 1,85 », « 1.85 », « 10 € » ; vide ou invalide → null. */
export function parseNombre(saisie: string): number | null {
  const s = saisie.replace(/[\s  €]/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
