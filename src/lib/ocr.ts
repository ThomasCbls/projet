/**
 * Lecture du texte d'une capture d'écran dans le navigateur (Tesseract.js, rien n'est envoyé).
 * Les fichiers du moteur sont servis depuis /tesseract/ (voir scripts/copier-tesseract.mjs),
 * puis mis en cache par le service worker : la lecture fonctionne ensuite hors ligne.
 */

/** Largeur visée après agrandissement : le texte fin des captures de téléphone devient lisible. */
const LARGEUR_CIBLE = 900;
/** Agrandissement maximal : au-delà, les glyphes déformés sont moins bien lus (testé sur Unibet). */
const AGRANDISSEMENT_MAX = 2;
const SEUIL = 140;

/**
 * Prépare l'image pour l'OCR : agrandissement, niveaux de gris, inversion si le fond est sombre
 * (écrans des bookmakers), puis seuillage noir/blanc. Sur une capture Unibet, c'est ce qui permet
 * de lire la mise, la cote et le gain (texte blanc sur fond vert).
 */
async function pretraiter(image: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(image);
  const echelle = Math.min(AGRANDISSEMENT_MAX, Math.max(1, LARGEUR_CIBLE / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = pixels.data;
  const gris = new Uint8ClampedArray(d.length / 4);
  let somme = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gris[p] = g;
    somme += g;
  }
  const inverser = somme / gris.length < 128;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = inverser ? 255 - gris[p] : gris[p];
    const v = g < SEUIL ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * Renvoie le texte brut de la capture.
 * @param onProgres avancement de 0 à 1 (chargement du moteur puis lecture).
 */
export async function lireCapture(image: Blob, onProgres?: (p: number) => void): Promise<string> {
  let avancement = 0;
  const signaler = (p: number) => {
    avancement = Math.max(avancement, Math.min(1, p));
    onProgres?.(avancement);
  };
  const [{ createWorker, OEM, PSM }, canvas] = await Promise.all([import("tesseract.js"), pretraiter(image)]);
  signaler(0.05);
  const worker = await createWorker("fra", OEM.LSTM_ONLY, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/",
    langPath: "/tesseract",
    workerBlobURL: false,
    logger: (m) => {
      // Chargement du moteur et de la langue : 0 → 30 % ; lecture : 30 → 100 %.
      if (m.status === "recognizing text") signaler(0.3 + 0.7 * m.progress);
      else signaler(0.05 + 0.25 * m.progress);
    },
  });
  try {
    // Mode « texte épars » : les écrans de pari sont faits de blocs isolés (montant, mise, cote…).
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: "300" });
    const { data } = await worker.recognize(canvas);
    signaler(1);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
