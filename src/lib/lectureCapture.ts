/**
 * Lecture d'une capture d'écran de pari (texte brut issu de l'OCR) et import dans un jour.
 *
 * Pensé d'abord pour l'écran récapitulatif Unibet (« GAGNÉ 8,75 € · MISE 5€ · COTE 1,75 ·
 * PARI SIMPLE - 23.11.26 · D1 Bulgarie - Le 23/11 à 17h00 · Ludogorets - Dunav Rousse »),
 * mais tolérant : chaque information est cherchée indépendamment, et ce qui n'est pas trouvé
 * (ou paraît incohérent) est signalé dans `aVerifier` pour que l'utilisateur le corrige.
 */
import { dateExcel, estDateIso } from "./dates";
import { parseNombre } from "./format";
import { type Jour, type Pari, type Resultat, type SportPariId, type TypeJour, NB_PARIS_MAX, pariEstVide } from "./types";

export type ChampCapture = "date" | "mise" | "cote" | "resultat" | "equipes" | "sport";

export interface SelectionDetectee {
  equipes: string;
  sport: SportPariId | "";
  /** Cote de la sélection (combiné uniquement), null si non lue. */
  cote: number | null;
}

export interface PariDetecte {
  /** Date ISO du pari, null si introuvable. */
  date: string | null;
  type: TypeJour;
  mise: number | null;
  /** Cote du pari (cote totale pour un combiné). */
  cote: number | null;
  /** Montant affiché en gros (gain ou gain potentiel), sert au contrôle de cohérence. */
  gain: number | null;
  resultat: Resultat;
  selections: SelectionDetectee[];
  /** Champs non trouvés ou douteux, à faire vérifier. */
  aVerifier: ChampCapture[];
}

/** Ce que l'utilisateur valide dans la fenêtre de confirmation. */
export type PariAImporter = Pick<PariDetecte, "type" | "mise" | "cote" | "resultat" | "selections">;

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/** Majuscules sans accents, espaces simples. */
function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s  ]+/g, " ")
    .trim();
}

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Nombre d'un jeton OCR (« 5€ », « 5e », « S€ », « 1,7S », « 8,75 ») et présence du symbole €.
 * Les confusions lettre/chiffre ne sont corrigées que si le jeton ressemble à un montant
 * (il contient un chiffre ou se termine par €), pour ne pas transformer « LE » en « 1 ».
 * En mode `souple` (bloc mise/cote uniquement), un « e » final vaut € : « se » → 5 €.
 */
function lireJeton(jeton: string, souple = false): { valeur: number; euro: boolean } | null {
  let s = jeton.trim().replace(/[\s\u00a0\u202f]/g, "");
  let euro = /(€|EUR)$/i.test(s);
  s = s.replace(/(€|EUR)$/i, "");
  if (/\d[eE]$/.test(s) || (souple && /^[\dSOIL.,]+E$/i.test(s))) {
    s = s.slice(0, -1); // « 5e » : € lu comme e
    euro = true;
  }
  if (!/\d/.test(s) && !euro) return null;
  s = s.replace(/[Ss]/g, "5").replace(/[Oo]/g, "0").replace(/[lIL|!]/g, "1");
  if (!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(s)) return null;
  const valeur = parseNombre(s);
  return valeur === null ? null : { valeur, euro };
}

export function lireNombre(jeton: string): number | null {
  return lireJeton(jeton)?.valeur ?? null;
}

/** Retire la ponctuation parasite autour d'un mot (« “COTE », « —055S »). */
const nettoyerMot = (mot: string) => mot.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}€]+$/gu, "");
/** Étiquettes tolérantes aux confusions OCR (« CO0TE », « M1SE »). */
const RE_ETIQUETTE_MISE = /^M[I1L]S[E€]S?$/;
const RE_ETIQUETTE_COTE = /^C[O0]T[E€]S?$/;

/** Montant strict « 8,75 » / « 8.75 € » (deux décimales) : distingue un gain des autres nombres. */
function lireMontantStrict(jeton: string): number | null {
  const s = jeton.replace(/[\s  €]/g, "");
  return /^\d{1,6}[.,]\d{2}$/.test(s) ? parseNombre(s) : null;
}

/* ------------------------------------------------------------------ */
/* Repères                                                             */
/* ------------------------------------------------------------------ */

/** En-tête de compétition : « D1 Bulgarie - Le 23/11 à 17h00 ». */
const ENTETE_COMPETITION = /\s[-–—]\s*LE \d{1,2}\/\d{1,2}\b/;
/** Ligne de type de pari : « PARI SIMPLE - 23.11.26 ». */
const LIGNE_TYPE = /\bPARI (SIMPLE|COMBINE|SYSTEME)\b/;
/** Séparateur d'équipes : « A - B », « A vs B ». */
const SEPARATEUR_EQUIPES = /\s(?:-|–|—|VS\.?|V)\s/i;

const RE_GAGNE = /\b[GC]A[GC] ?NEE?\b|\bBIEN JOUE\b|\bFELICITATIONS\b/;
const RE_PERDU = /\bPERDUE?\b|\bDOMMAGE\b|\bPAS CETTE FOIS\b/;

/**
 * Sport deviné à partir de la compétition et du marché (l'icône n'est pas lisible).
 * L'ordre compte : « tennis de table » avant « tennis », les sports explicites avant le foot.
 */
const MOTS_SPORTS: [SportPariId, RegExp][] = [
  ["tennisDeTable", /\bTENNIS DE TABLE\b|\bPING|\bSETKA\b|\bTT (CUP|ELITE|STAR)\b|\bWTT\b/],
  ["badminton", /\bBADMINTON\b|\bBWF\b/],
  ["volley", /\bVOLLEY/],
  ["hockey", /\bHOCKEY\b|\bNHL\b|\bKHL\b|\bSHL\b|\bLIIGA\b|\bMAGNUS\b/],
  ["basket", /\bBASKET|\bNBA\b|\bWNBA\b|\bEUROLEAGUE\b|\bEUROCUP\b|\bBETCLIC ELITE\b|\bREBONDS\b|\bPASSES DECISIVES\b/],
  ["rugby", /\bRUGBY\b|\bTOP 14\b|\bPRO D2\b|\bSIX NATIONS\b|\bSUPER RUGBY\b|\bESSAIS?\b/],
  ["combat", /\bUFC\b|\bMMA\b|\bBOXE\b|\bBELLATOR\b|\bPFL\b|\bKICK ?BOXING\b|\bJUDO\b/],
  ["tennis", /\bTENNIS\b|\bATP\b|\bWTA\b|\bITF\b|\bCHALLENGER\b|\bROLAND|\bWIMBLEDON\b|\bUS OPEN\b|\bOPEN D|\bJEUX\b|\bSETS?\b|\bTIE.?BREAK/],
  [
    "foot",
    /\bFOOT|\bSOCCER\b|\bD[1-3]\b|\bLIGUE\b|\bLIGA\b|\bSERIE [AB]\b|\bBUNDESLIGA\b|\bPREMIER LEAGUE\b|\bCHAMPIONS LEAGUE\b|\bEUROPA\b|\bCONFERENCE LEAGUE\b|\bCHAMPIONSHIP\b|\bEREDIVISIE\b|\bSUPER LIG\b|\bMLS\b|\bCOUPE\b|\bCOPA\b|\bBUTS?\b|\bBUTEUR|\bTIRS\b|\bCORNERS?\b|\bCARTONS?\b|\bPENALTY|\b90 MINS?\b|\bMI-TEMPS\b/,
  ],
];

export function devinerSport(texte: string): SportPariId | "" {
  const n = normaliser(texte);
  return MOTS_SPORTS.find(([, re]) => re.test(n))?.[0] ?? "";
}

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

/** Date du pari : « PARI SIMPLE - 23.11.26 », sinon une date complète, sinon « Le 23/11 ». */
function lireDate(texte: string, aujourdhui: string): string | null {
  const versIso = (j: number, m: number, a: number) => {
    const annee = a < 100 ? 2000 + a : a;
    const iso = dateExcel(annee, m, j);
    // dateExcel normalise les débordements : on refuse un 31/02 mal lu plutôt que de le décaler.
    return estDateIso(iso) && iso === `${annee}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`
      ? iso
      : null;
  };
  const complet =
    /\bPARI \w+ ?[-–—]? ?(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})\b/.exec(texte) ??
    /\b(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})\b/.exec(texte);
  if (complet) {
    const iso = versIso(+complet[1], +complet[2], +complet[3]);
    if (iso) return iso;
  }
  const court = /\bLE (\d{1,2})\/(\d{1,2})\b/.exec(texte);
  if (court) {
    const annee = +aujourdhui.slice(0, 4);
    let iso = versIso(+court[1], +court[2], annee);
    // Un pari de fin décembre importé en janvier appartient à l'année précédente.
    if (iso && iso > aujourdhui && +court[2] - +aujourdhui.slice(5, 7) > 6) iso = versIso(+court[1], +court[2], annee - 1);
    if (iso) return iso;
  }
  return null;
}

/**
 * Mise et cote, dans le bloc qui commence aux étiquettes « MISE » / « COTE »
 * (« MISE COTE / 5€ 1,75 », « Mise : 5 € · Cote : 1,75 »…).
 * Le symbole € distingue la mise de la cote, ce qui résiste à une étiquette mal lue ;
 * sans €, les valeurs suivent l'ordre des étiquettes.
 */
function lireMiseCote(lignes: string[]): { mise: number | null; cote: number | null; indexMise: number } {
  const estEtiquette = (l: string) =>
    l.split(" ").some((m) => RE_ETIQUETTE_MISE.test(nettoyerMot(m)) || RE_ETIQUETTE_COTE.test(nettoyerMot(m)));
  const debut = lignes.findIndex(estEtiquette);
  if (debut < 0) return { mise: null, cote: null, indexMise: -1 };
  const etiquettes: ("mise" | "cote")[] = [];
  const nombres: { valeur: number; euro: boolean }[] = [];
  for (let k = debut; k < Math.min(lignes.length, debut + 8); k++) {
    const l = lignes[k];
    if (k > debut && (LIGNE_TYPE.test(l) || ENTETE_COMPETITION.test(l))) break;
    const mots = l.split(" ").map(nettoyerMot).filter((m) => m !== "");
    mots.forEach((mot, i) => {
      if (RE_ETIQUETTE_MISE.test(mot)) etiquettes.push("mise");
      else if (RE_ETIQUETTE_COTE.test(mot)) etiquettes.push("cote");
      else if (etiquettes.length > 0) {
        const n = lireJeton(mot, true);
        if (n) nombres.push({ ...n, euro: n.euro || mots[i + 1] === "€" });
      }
    });
    if (nombres.length >= 2) break;
  }

  let mise: number | null = null;
  let cote: number | null = null;
  const enEuros = nombres.find((n) => n.euro);
  if (enEuros) {
    mise = enEuros.valeur;
    cote = nombres.find((n) => !n.euro)?.valeur ?? null;
  } else if (nombres.length >= 2) {
    // Ordre des étiquettes (mise puis cote par défaut).
    const iCote = etiquettes.indexOf("cote");
    const [a, b] = iCote === 0 && etiquettes.includes("mise") ? [1, 0] : [0, 1];
    mise = nombres[a].valeur;
    cote = nombres[b].valeur;
  } else if (nombres.length === 1) {
    // Valeur seule (l'autre est illisible) : un nombre décimal ressemble à une cote, un entier à une mise.
    if (Number.isInteger(nombres[0].valeur)) mise = nombres[0].valeur;
    else cote = nombres[0].valeur;
  }
  // Une cote décimale est toujours > 1 : une valeur ≤ 1 est une erreur de lecture.
  return { mise, cote: cote !== null && cote > 1 ? cote : null, indexMise: debut };
}

/** Gain affiché en gros : dernier montant à deux décimales avant le bloc mise/cote. */
function lireGain(lignes: string[], indexMise: number): number | null {
  const fin = indexMise >= 0 ? indexMise : lignes.length;
  for (let k = fin - 1; k >= 0; k--) {
    const v = lireMontantStrict(lignes[k]);
    if (v !== null) return v;
  }
  return null;
}

/** Nettoie une ligne d'équipes : bruit OCR en bordure, cote finale éventuelle (combiné). */
function nettoyerEquipes(ligne: string): { equipes: string; cote: number | null } {
  let s = ligne.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, "");
  let cote: number | null = null;
  const fin = /\s(\d{1,3}[.,]\d{1,2})$/.exec(s);
  if (fin) {
    const v = parseNombre(fin[1]);
    if (v !== null && v > 1) cote = v;
    s = s.slice(0, fin.index).replace(/[^\p{L}\p{N})]+$/u, "");
  }
  return { equipes: s.replace(/\s+/g, " ").replace(/\s[–—]\s/g, " - "), cote };
}

/** Ligne qui ne peut pas être un match (mentions légales, téléphone, type de pari…). */
function estLigneParasite(normalisee: string): boolean {
  return (
    LIGNE_TYPE.test(normalisee) ||
    ENTETE_COMPETITION.test(normalisee) ||
    /APPEL|JOUEURS|SURTAXE|\(|\bMISE\b|\bCOTE\b/.test(normalisee) ||
    (normalisee.match(/\d/g)?.length ?? 0) >= 4
  );
}

/** Bruit OCR (icône, logo, « UE », « 22200 ») : aucun mot d'au moins trois lettres. */
const estBruit = (ligne: string) => !/\p{L}{3}/u.test(ligne);

/**
 * Description du pari (marché et choix) sous le match, qui peut tenir sur plusieurs lignes :
 * « Nombre de tirs cadrés 3 ou plus - Dunav Rousse - 90 / Mins : Oui ».
 * S'arrête à la sélection suivante, au type de pari ou au bloc mise/cote.
 */
function lireDescription(brutes: string[], lignes: string[], debut: number): string {
  const morceaux: string[] = [];
  for (let k = debut; k < lignes.length && morceaux.length < 3; k++) {
    const l = lignes[k];
    if (ENTETE_COMPETITION.test(l) || LIGNE_TYPE.test(l) || /\bMISE\b|\bCOTE\b/.test(l) || RE_GAGNE.test(l) || RE_PERDU.test(l))
      break;
    if (estBruit(brutes[k])) continue;
    morceaux.push(brutes[k].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, ""));
  }
  return morceaux.join(" ").replace(/\s+/g, " ");
}

/** Équipes, puis description du pari en dessous. */
const avecDescription = (equipes: string, description: string) =>
  description === "" ? equipes : `${equipes}\n${description}`;

function lireSelections(brutes: string[], lignes: string[]): SelectionDetectee[] {
  const selections: SelectionDetectee[] = [];
  lignes.forEach((l, k) => {
    if (!ENTETE_COMPETITION.test(l)) return;
    // Le match suit l'en-tête de compétition (une ligne de bruit OCR peut s'intercaler).
    for (let m = k + 1; m <= Math.min(k + 2, lignes.length - 1); m++) {
      if (ENTETE_COMPETITION.test(lignes[m])) break;
      if (!SEPARATEUR_EQUIPES.test(brutes[m])) continue;
      const { equipes, cote } = nettoyerEquipes(brutes[m]);
      // Compétition d'abord, puis match et marché, sans déborder sur la sélection suivante.
      const suite = lignes.slice(m, m + 3);
      const fin = suite.findIndex((x) => ENTETE_COMPETITION.test(x));
      const sport = devinerSport(l) || devinerSport((fin < 0 ? suite : suite.slice(0, fin)).join(" "));
      selections.push({ equipes: avecDescription(equipes, lireDescription(brutes, lignes, m + 1)), cote, sport });
      return;
    }
  });
  if (selections.length > 0) return selections;

  // Sans en-tête de compétition : première ligne « A - B » plausible.
  const k = lignes.findIndex((l, i) => SEPARATEUR_EQUIPES.test(brutes[i]) && !estLigneParasite(l));
  if (k >= 0) {
    const { equipes, cote } = nettoyerEquipes(brutes[k]);
    selections.push({
      equipes: avecDescription(equipes, lireDescription(brutes, lignes, k + 1)),
      cote,
      sport: devinerSport(lignes.join(" ")),
    });
  }
  return selections;
}

/**
 * Analyse le texte OCR d'une capture de pari.
 * @param aujourdhui date de référence (ISO) pour compléter une date sans année.
 */
export function analyserTexteCapture(texte: string, aujourdhui: string): PariDetecte {
  const brutes = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
  const lignes = brutes.map(normaliser);
  const tout = lignes.join("\n");

  const type: TypeJour = /\bCOMBINE\b/.test(tout) ? "combine" : "simple";
  const resultat: Resultat = RE_PERDU.test(tout) ? "P" : RE_GAGNE.test(tout) ? "G" : "";
  const date = lireDate(tout, aujourdhui);
  const lu = lireMiseCote(lignes);
  let { mise, cote } = lu;
  const gain = lireGain(lignes, lu.indexMise);
  let selections = lireSelections(brutes, lignes);
  const aVerifier = new Set<ChampCapture>();

  // Gain = mise × cote (pari gagné, ou gain potentiel d'un pari en cours) : complète ou contrôle.
  if (gain !== null && resultat !== "P") {
    if (cote === null && mise !== null && mise > 0) {
      const c = arrondi2(gain / mise);
      if (c > 1) {
        cote = c;
        aVerifier.add("cote");
      }
    } else if (mise === null && cote !== null) {
      mise = arrondi2(gain / cote);
      aVerifier.add("mise");
    } else if (mise !== null && cote !== null && Math.abs(mise * cote - gain) > 0.011) {
      aVerifier.add("mise").add("cote");
    }
  }

  if (type === "combine") {
    // Une seule cote de sélection manquante : déduite de la cote totale.
    const total = cote;
    const manquantes = selections.filter((s) => s.cote === null);
    if (total !== null && manquantes.length === 1 && selections.length > 1) {
      const produit = selections.reduce((p, s) => p * (s.cote ?? 1), 1);
      selections = selections.map((s) => (s.cote === null ? { ...s, cote: arrondi2(total / produit) } : s));
    }
  } else {
    // Un pari simple n'a qu'une sélection, et sa cote est celle du pari.
    selections = selections.slice(0, 1).map((s) => ({ ...s, cote: null }));
  }
  if (selections.length === 0) selections = [{ equipes: "", sport: "", cote: null }];

  if (date === null) aVerifier.add("date");
  if (mise === null) aVerifier.add("mise");
  if (cote === null) aVerifier.add("cote");
  if (resultat === "") aVerifier.add("resultat");
  if (selections.some((s) => s.equipes === "")) aVerifier.add("equipes");
  if (selections.some((s) => s.sport === "")) aVerifier.add("sport");

  return { date, type, mise, cote, gain, resultat, selections, aVerifier: [...aVerifier] };
}

/* ------------------------------------------------------------------ */
/* Import dans un jour                                                 */
/* ------------------------------------------------------------------ */

/** Message bloquant avant import, ou null si le pari peut être ajouté. */
export function verifierImport(p: PariAImporter): string | null {
  if (p.selections.length === 0) return "Aucune sélection à importer.";
  if (p.type === "combine") {
    if (p.selections.length < 2) return "Un combiné doit compter au moins deux sélections.";
    if (p.resultat === "G" && p.selections.some((s) => s.cote === null))
      return "Renseigne la cote de chaque sélection pour calculer le gain du combiné.";
  }
  return null;
}

/**
 * Ajoute le pari validé au jour :
 * - simple : dans le premier emplacement vide ;
 * - combiné : seulement sur un jour sans pari (le jour entier devient un combiné).
 */
export function appliquerImport(jour: Jour, p: PariAImporter): { jour: Jour } | { erreur: string } {
  const bloquant = verifierImport(p);
  if (bloquant) return { erreur: bloquant };
  const dejaSaisi = jour.paris.some((x) => !pariEstVide(x));

  if (p.type === "simple") {
    if (jour.type === "combine" && dejaSaisi)
      return { erreur: "Ce jour contient déjà un combiné : impossible d'y ajouter un pari simple." };
    const s = p.selections[0];
    const pari: Pari = { equipes: s.equipes.trim(), sport: s.sport, mise: p.mise, cote: p.cote, resultat: p.resultat };
    // Premier emplacement vide, sinon un pari de plus.
    const i = jour.paris.findIndex(pariEstVide);
    if (i >= 0) return { jour: { ...jour, type: "simple", paris: jour.paris.map((x, k) => (k === i ? pari : x)) } };
    if (jour.paris.length >= NB_PARIS_MAX) return { erreur: `Un jour peut compter au plus ${NB_PARIS_MAX} paris.` };
    return { jour: { ...jour, type: "simple", paris: [...jour.paris, pari] } };
  }

  if (dejaSaisi) return { erreur: "Ce jour contient déjà des paris : un combiné ne peut être importé que sur un jour vide." };
  if (p.selections.length > NB_PARIS_MAX) return { erreur: `Un combiné peut compter au plus ${NB_PARIS_MAX} sélections.` };
  const selections = p.selections.map(
    (s): Pari => ({ equipes: s.equipes.trim(), sport: s.sport, mise: null, cote: s.cote, resultat: p.resultat }),
  );
  // Les emplacements vides restants sont conservés après les sélections.
  const paris = [...selections, ...jour.paris.slice(selections.length)];
  return { jour: { ...jour, type: "combine", miseCombine: p.mise, paris } };
}
