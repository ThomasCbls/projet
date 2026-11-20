/**
 * Constantes de thème utilisables côté serveur comme côté client
 * (ce module ne doit PAS porter la directive "use client").
 *
 * Valeurs tirées de la charte graphique BetTracker v1.0 (novembre 2026).
 */

/**
 * Clé localStorage du mode de couleur (« light », « dark » ou « system »).
 * Clé historique conservée : la changer ferait perdre le choix des utilisateurs.
 */
export const CLE_MODE = "suivi-sport:mode";

/** Nom de l'application. */
export const NOM_APP = "BetTracker";
export const SLOGAN = "Chaque pari suivi, chaque euro compté.";

/** Couleurs de marque, identiques dans les deux thèmes. */
export const MARQUE = {
  violet: "#8B2CF5",
  indigo: "#3A12C9",
  lilac: "#DA60FF",
  gold: "#FFC93C",
  /** Texte sur fond violet / gold. */
  surViolet: "#FFFFFF",
  surGold: "#120A2C",
} as const;

/** Dégradé de marque : réservé au splash, à la tuile héros du tableau de bord et au Premium. */
export const DEGRADE_MARQUE = `linear-gradient(135deg, ${MARQUE.indigo} 0%, ${MARQUE.violet} 62%, ${MARQUE.lilac} 130%)`;

/** Neutres « nuit » et statuts, par thème. */
export const JETONS = {
  dark: {
    bg: "#07041A",
    surface: "#110A2C",
    surfaceRaised: "#1B1240",
    line: "#2E2366",
    lineStrong: "#4A3A8F",
    ink: "#F2EFFA",
    inkMuted: "#A9A2C8",
    violet: "#8B2CF5",
    violetText: "#B57BFF",
    violetSoft: "#2A1660",
    win: "#2EE59D",
    loss: "#FF4D6D",
    pending: "#FFB020",
    void: "#8E89A8",
    focusRing: "#DA60FF",
  },
  light: {
    bg: "#F6F4FC",
    surface: "#FFFFFF",
    surfaceRaised: "#EFEAFB",
    line: "#DCD5F0",
    lineStrong: "#B9AEDD",
    ink: "#120A2C",
    inkMuted: "#5A5280",
    violet: "#7A1FE6",
    violetText: "#6A16D1",
    violetSoft: "#EDE2FF",
    win: "#0B7A4D",
    loss: "#D11A44",
    pending: "#946000",
    void: "#6E6890",
    /** Le lilas manque de contraste sur fond clair (< 3:1) : violet à la place. */
    focusRing: "#7A1FE6",
  },
} as const;

/**
 * Couleurs des graphiques par thème (chart-1 à chart-3, win / loss / void).
 * La paire gagné/perdu est toujours doublée d'une légende ou de la position (encodage secondaire).
 */
export const COULEURS_GRAPHIQUES = {
  light: { serie: "#7A1FE6", comparaison: "#0B7FB0", objectif: "#B07A00", gagne: "#0B7A4D", perdu: "#D11A44", neutre: "#6E6890" },
  dark: { serie: "#8B2CF5", comparaison: "#3FC8FF", objectif: "#FFC93C", gagne: "#2EE59D", perdu: "#FF4D6D", neutre: "#8E89A8" },
} as const;
