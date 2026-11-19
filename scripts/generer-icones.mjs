// Génère les icônes PNG de la PWA à partir du tracé de src/app/icon.svg.
// Usage : npm run icones   (à relancer si le logo change)
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const BLEU = "#1d4ed8";
const TRACE = '<path d="M14 44l12-12 8 8 16-18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';

/** Icône 64×64 : `arrondi` = coins arrondis, `echelle` = taille du tracé autour du centre. */
const svg = ({ arrondi, echelle }) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="${arrondi ? 14 : 0}" fill="${BLEU}"/>` +
      `<g transform="translate(32 33) scale(${echelle}) translate(-32 -33)">${TRACE}</g>` +
      `</svg>`,
  );

const icones = [
  // « any » : identique au favicon (coins arrondis, fond transparent autour).
  { fichier: "public/icons/icon-192.png", taille: 192, arrondi: true, echelle: 1 },
  { fichier: "public/icons/icon-512.png", taille: 512, arrondi: true, echelle: 1 },
  // « maskable » : fond plein, tracé dans la zone sûre (cercle de 80 %) pour les découpes Android.
  { fichier: "public/icons/icon-maskable-512.png", taille: 512, arrondi: false, echelle: 0.72 },
  // iOS arrondit lui-même les coins et refuse la transparence.
  { fichier: "src/app/apple-icon.png", taille: 180, arrondi: false, echelle: 0.85 },
];

mkdirSync("public/icons", { recursive: true });
for (const { fichier, taille, ...options } of icones) {
  await sharp(svg(options), { density: (72 * taille) / 64 })
    .resize(taille, taille)
    .png({ compressionLevel: 9 })
    .toFile(fichier);
  console.log(`${fichier} (${taille} px)`);
}
