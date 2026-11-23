/**
 * Copie les fichiers de Tesseract.js (worker, moteur WebAssembly, langue française) vers
 * public/tesseract/ : la lecture des captures fonctionne sans CDN, donc hors ligne une fois en cache.
 * Lancé automatiquement avant `npm run dev` et `npm run build`.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const cible = join(racine, "public", "tesseract");
const dossier = (paquet) => dirname(require.resolve(`${paquet}/package.json`));

const fichiers = [
  [join(dossier("tesseract.js"), "dist", "worker.min.js"), "worker.min.js"],
  // Moteur « LSTM seul » (mode par défaut), dans ses trois variantes : le worker choisit
  // celle que le processeur gère (relaxed SIMD, SIMD ou sans SIMD).
  ...["tesseract-core-relaxedsimd-lstm", "tesseract-core-simd-lstm", "tesseract-core-lstm"].map((f) => [
    join(dossier("tesseract.js-core"), `${f}.wasm.js`),
    `${f}.wasm.js`,
  ]),
  [join(dossier("@tesseract.js-data/fra"), "4.0.0_best_int", "fra.traineddata.gz"), "fra.traineddata.gz"],
];

mkdirSync(cible, { recursive: true });
for (const [source, nom] of fichiers) copyFileSync(source, join(cible, nom));
console.log(`Tesseract : ${fichiers.length} fichiers copiés dans public/tesseract/`);
