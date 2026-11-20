/**
 * Styles des statuts (badges de la charte) : fond teinté, texte et bordure de la couleur du statut.
 * Contraste du texte ≥ 4,5:1 dans les deux thèmes. Le statut n'est jamais porté par la couleur
 * seule : toujours accompagné d'une lettre, d'un libellé ou d'une icône.
 */
export type Statut = "success" | "error" | "warning";

/**
 * Part de la couleur du statut dans le fond, réglée par thème dans theme.ts (`--bt-teinte-statut`) :
 * 16 % en sombre, 8 % en clair (au-delà, le texte vert/rouge passe sous 4,5:1 sur fond clair).
 */
const teinte = (statut: Statut) =>
  `color-mix(in srgb, var(--mui-palette-${statut}-main) var(--bt-teinte-statut, 8%), var(--mui-palette-bt-surface))`;

export const styleStatut = (statut: Statut) => ({
  backgroundColor: teinte(statut),
  borderColor: `var(--mui-palette-${statut}-main)`,
  borderStyle: "solid",
  color: `var(--mui-palette-${statut}-main)`,
});
