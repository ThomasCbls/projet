/**
 * Constantes de thème utilisables côté serveur comme côté client
 * (ce module ne doit PAS porter la directive "use client").
 */

/** Clé localStorage du mode de couleur (« light », « dark » ou « system »). */
export const CLE_MODE = "suivi-sport:mode";

/** Fonds des boutons G / P : texte blanc lisible (≥ 4,5:1) dans les deux thèmes. */
export const FOND_GAGNE = "#15803d";
export const FOND_PERDU = "#b91c1c";

/**
 * Couleurs des graphiques, choisies séparément pour chaque thème et validées
 * (daltonisme, contraste) contre le fond des cartes. La paire gagné/perdu est
 * toujours doublée d'une légende ou de la position (encodage secondaire).
 */
export const COULEURS_GRAPHIQUES = {
  light: { serie: "#2a78d6", gagne: "#008300", perdu: "#e34948", neutre: "#c3c2b7" },
  dark: { serie: "#3987e5", gagne: "#0ca30c", perdu: "#e66767", neutre: "#383835" },
} as const;
