#!/usr/bin/env node
/**
 * Convertit « suivi_sport_annuel.xlsx » en JSON importable dans l'application
 * (Réglages → Importer un JSON).
 *
 * Usage :
 *   npm run import-excel -- chemin/vers/suivi_sport_annuel.xlsx [sortie.json]
 *
 * Mapping (identique au classeur d'origine) :
 *   Bilan!B3            date de début
 *   Suivi, lignes 6+    une ligne par jour : date = début + (ligne − 6), jusqu'à la fin (début + 1 an − 1 j)
 *   Suivi!D:AQ          8 sports × 5 matchs (Foot D-H, Volley I-M, Tennis de table N-R, Tennis S-W,
 *                       Basket X-AB, Hockey AC-AG, Badminton AH-AL, Sport de combat AM-AQ)
 *   Paris!C:V           5 paris × (équipes, mise, cote, résultat)
 *   Paris!W / X         type du jour (Simple / Combiné) / mise combiné
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const SPORTS = ["foot", "volley", "tennisDeTable", "tennis", "basket", "hockey", "badminton", "combat"];
const PREMIERE_LIGNE = 6;
const NB_LIGNES = 366;

const [entree, sortie = "suivi-sport-import.json"] = process.argv.slice(2);
if (!entree) {
  console.error("Usage : npm run import-excel -- <fichier.xlsx> [sortie.json]");
  process.exit(1);
}

/* ---------- Dates (UTC, comme l'application) ---------- */
const iso = (d) => d.toISOString().slice(0, 10);
const ajouterJours = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const finPeriode = (debut) => {
  const [a, m, j] = debut.split("-").map(Number);
  return ajouterJours(iso(new Date(Date.UTC(a + 1, m - 1, j))), -1);
};

/* ---------- Lecture minimale du .xlsx (zip + XML) ---------- */
const decoder = (t) =>
  t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/** Concatène les <t> d'un fragment (texte simple ou enrichi). */
const textes = (xml) => decoder([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

function lireClasseur(octets) {
  const zip = unzipSync(octets);
  const lire = (chemin) => (zip[chemin] ? strFromU8(zip[chemin]) : null);

  const partages = [...(lire("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textes(m[1]));
  const rels = Object.fromEntries(
    [...(lire("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      /Id="([^"]+)"/.exec(m[0])[1],
      /Target="([^"]+)"/.exec(m[0])[1],
    ]),
  );
  const feuilles = {};
  for (const m of (lire("xl/workbook.xml") ?? "").matchAll(/<sheet\b[^>]*>/g)) {
    const nom = decoder(/name="([^"]+)"/.exec(m[0])[1]);
    const rid = /r:id="([^"]+)"/.exec(m[0])[1];
    const cible = rels[rid].replace(/^\/?(xl\/)?/, "xl/");
    feuilles[nom] = cible;
  }

  /** Feuille → Map("D6" → valeur) */
  return (nom) => {
    const chemin = feuilles[nom];
    const xml = chemin && lire(chemin);
    if (!xml) throw new Error(`Feuille « ${nom} » introuvable.`);
    const cellules = new Map();
    for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = m[1];
      const contenu = m[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const v = /<v>([\s\S]*?)<\/v>/.exec(contenu)?.[1];
      let valeur = null;
      if (type === "s" && v !== undefined) valeur = partages[Number(v)] ?? "";
      else if (type === "inlineStr") valeur = textes(contenu);
      else if (type === "str" || type === "e") valeur = v !== undefined ? decoder(v) : null;
      else if (type === "b") valeur = v === "1";
      else if (v !== undefined) valeur = Number(v);
      if (valeur !== null && valeur !== "") cellules.set(ref, valeur);
    }
    return cellules;
  };
}

/** Numéro de colonne (1 = A) → lettres. */
const lettres = (n) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/* ---------- Conversion des valeurs ---------- */
function texte(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function nombre(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", ".").replace(/\s|€/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function resultat(v) {
  const t = texte(v).toUpperCase();
  return t === "G" || t === "P" ? t : "";
}

function dateValeur(v) {
  if (typeof v === "number") return iso(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)); // n° de série Excel
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [j, m, a] = v.split("/");
    return `${a}-${m}-${j}`;
  }
  return null;
}

/* ---------- Conversion ---------- */
const feuille = lireClasseur(new Uint8Array(await readFile(entree)));
const suivi = feuille("Suivi");
const paris = feuille("Paris");
const bilan = feuille("Bilan");

const dateDebut = dateValeur(bilan.get("B3"));
if (!dateDebut) throw new Error("Date de début illisible (Bilan!B3).");
const fin = finPeriode(dateDebut);

const jours = {};
let nbMatchs = 0;
let nbParis = 0;

for (let i = 0; i < NB_LIGNES; i++) {
  const date = ajouterJours(dateDebut, i);
  if (date > fin) break;
  const r = PREMIERE_LIGNE + i;
  const cs = (col) => suivi.get(`${lettres(col)}${r}`) ?? null;
  const cp = (col) => paris.get(`${lettres(col)}${r}`) ?? null;

  const matchs = {};
  let vide = true;
  SPORTS.forEach((sport, s) => {
    matchs[sport] = Array.from({ length: 5 }, (_, k) => {
      const v = resultat(cs(4 + s * 5 + k)); // D = colonne 4
      if (v) {
        vide = false;
        nbMatchs++;
      }
      return v;
    });
  });

  const listeParis = Array.from({ length: 5 }, (_, k) => {
    const c = 3 + k * 4; // C = colonne 3
    const p = {
      equipes: texte(cp(c)),
      mise: nombre(cp(c + 1)),
      cote: nombre(cp(c + 2)),
      resultat: resultat(cp(c + 3)),
    };
    if (p.equipes || p.mise !== null || p.cote !== null || p.resultat) {
      vide = false;
      nbParis++;
    }
    return p;
  });

  const typeTexte = texte(cp(23)).toLowerCase(); // W
  const type = typeTexte.startsWith("combin") ? "combine" : "simple";
  const miseCombine = nombre(cp(24)); // X
  if (type === "combine" || miseCombine !== null) vide = false;

  if (!vide) jours[date] = { date, matchs, paris: listeParis, type, miseCombine };
}

const donnees = { version: 1, dateDebut, jours };
await writeFile(sortie, JSON.stringify(donnees, null, 2), "utf8");
console.log(
  `✔ ${Object.keys(jours).length} jour(s) exporté(s) (${nbMatchs} résultat(s) de match, ${nbParis} pari(s)) — ` +
    `période du ${dateDebut} au ${fin}.\n  Fichier : ${path.resolve(sortie)}\n` +
    `  À importer dans l'application : Réglages → Importer un JSON.`,
);
