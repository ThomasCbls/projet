// Génère les icônes de l'application à partir du logo BetTracker (assets/logo-bettracker.png).
// Usage : npm run icones   (à relancer si le logo change)
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "assets/logo-bettracker.png";
const FOND = "#07041A"; // jeton « bg » du thème sombre
const ARRONDI = 0.22; // coins arrondis à ≈ 22 % du côté (charte)

/** Masque aux coins arrondis : l'extérieur devient transparent. */
const masque = (taille) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}">` +
      `<rect width="${taille}" height="${taille}" rx="${Math.round(taille * ARRONDI)}" fill="#fff"/></svg>`,
  );

/** Logo redimensionné, coins arrondis transparents. */
const logoArrondi = (taille) =>
  sharp(SOURCE)
    .resize(taille, taille, { kernel: "lanczos3" })
    .composite([{ input: masque(taille), blend: "dest-in" }])
    .png()
    .toBuffer();

/** Logo arrondi centré sur un fond plein, à `echelle` du côté. */
const surFond = async (taille, echelle) => {
  const cote = Math.round(taille * echelle);
  return sharp({ create: { width: taille, height: taille, channels: 4, background: FOND } })
    .composite([{ input: await logoArrondi(cote), gravity: "center" }])
    .png({ compressionLevel: 9 });
};

const sorties = [
  // « any » : logo aux coins arrondis, fond transparent autour.
  { fichier: "public/icons/icon-192.png", image: async () => sharp(await logoArrondi(192)).png({ compressionLevel: 9 }) },
  { fichier: "public/icons/icon-512.png", image: async () => sharp(await logoArrondi(512)).png({ compressionLevel: 9 }) },
  // « maskable » : fond plein, logo dans la zone sûre (cercle de 80 %) pour les découpes Android.
  { fichier: "public/icons/icon-maskable-512.png", image: () => surFond(512, 0.8) },
  // iOS arrondit lui-même les coins et refuse la transparence : logo plein cadre.
  {
    fichier: "src/app/apple-icon.png",
    image: async () => sharp(SOURCE).resize(180, 180, { kernel: "lanczos3" }).flatten({ background: FOND }).png(),
  },
  // Logo affiché dans l'interface (en-tête, menu, splash, chargement).
  { fichier: "public/logo/bettracker.png", image: async () => sharp(await logoArrondi(256)).png({ compressionLevel: 9 }) },
];

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/logo", { recursive: true });
for (const { fichier, image } of sorties) {
  await (await image()).toFile(fichier);
  console.log(fichier);
}
