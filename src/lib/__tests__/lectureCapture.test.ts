import { describe, expect, it } from "vitest";
import { type PariAImporter, analyserTexteCapture, appliquerImport, devinerSport, lireNombre } from "@/lib/lectureCapture";
import { type Jour, jourVide } from "@/lib/types";

const AUJOURDHUI = "2026-11-23";

/** Sortie réelle de Tesseract (fra, PSM 11, image inversée et seuillée) sur une capture Unibet. */
const UNIBET_PSM11 = `FENDEZ VOUS SUR JOUEURS INFO-SERVICEFR (09 74 75 13 13
PARCE QU'UN PARIEUR DOIT SAVOIR QUAND QUITTER LE JEU
APPEL NON SURTANÉ)
UNIBET
-000
PARI
DE LEO
GAGNÉ
8,75
BIEN JOUÉ !
MISE
COTE
5€
1,75
PARI SIMPLE - 23.11.26
©
D1 Bulgarie - Le 23/11 à 17h00
Ludogorets - Dunav Rousse
e
Nombre de tirs cadrés 3 ou plus - Dunav Rousse - 90
Mins : Oui
UE`;

/** Même capture, PSM 3 (blocs) : étiquettes et valeurs sur la même ligne, confusions OCR. */
const UNIBET_PSM3 = `PARCE QU'UN PARIEUR DOIT SAVOIR QUAND QUITTER LE JEU.
RENDEZ-VOUS SUR JOUEURS-INFO-SERVICE.FR (09 74 75 13 13 - APPEL NON SURTAXÉ)
UNIBET
PARI DE LEO
/
CACNÉE
8,75
BIEN JOUÉ !
MISE COTE
5e 1,75
PARI SIMPLE - 23.11.26
D1 Bulgarie - Le 23/11 à 17h00 .
ce
Ludogorets - Dunav Rousse .
Nombre de tirs cadrés 3 ou plus - Dunav Rousse - 90
Mins : Oui`;

/**
 * Même capture, sorties réelles plus bruitées (agrandissements différents) : étiquette ou mise
 * illisible (« —055S “COTE », « PR éo T E »), « 5€ » lu « se ».
 */
const UNIBET_BRUITE: [string, string][] = [
  ["700 px", "PARCE QU'UN PARIEUR DOIT SAVOIR QUAND QUITTER LE JEU.\nRENDEZ-VOUS SUR JOUEURS-INFO-SERVICE.FR (09 74 75 13 13- APPEL NON SURTANÉ)\nUNIBET\nPARI\nDE LEO\nGAGNÉ\n8,75€\nBIEN JOUÉ !\nA\nge\n=\n_\n=\n_—\n=\nMISE\n—\"CO0TE\nse\n1,75\nPARI SIMPLE - 23.11.26\nD1 Bulgarie - Le 23/11 à 17h00\n©\nLudogorets - Dunav Rousse\nNombre de tirs cadrés 3 ou plus - Dunav Rousse - 90\nMins : Oui\n22200"],
  ["1000 px", "PARCE QU'UN PARIEUR DOIT SAVOIR QUAND QUITTER LE JEU.\nea\nPTIT TELE\nRENDEZ-VOUS SUR JQUEURS-INFO-SERVICE.ER (09 74 75 13 13 - APPEL NOM SURTAXE)\nUNIBET\nPARI\nDE LEO\nGAG NÉ\n8,75€\nBIEN JOUÉ !\nL\n——,\nen\n“sn ge\nuen\nse,\nMISE\nPR éo T E\n>\n1,75\nPARI SIMPLE - 23.11.26\n©\nD1 Bulgarie - Le 23/11 à 17h00\nLudogorets - Dunav Rousse\nNombre de tirs cadrés 3 ou plus - Dunav Rousse - 90\nMins : Oui\nte"],
  ["1400 px", "PARCE QU'UN PARIEUR DOIT SAVOIR QUAND QUITTER LE JEU.\nes\nwey\nRENDEZ-VOUS SUR JOUEURS-INFO-SERVICE.FR (09 74 75 13 13 - APPEL NON SURTAXÉ)\nUNIBET\nPARI\nDE LEO\nGAG NÉ\n8,75€\nBIEN JOUÉ !\n—_\nL\n—055S “COTE\n>\n1,75\nPARI SIMPLE - 23.11.26\n\"\nD1 Bulgarie - Le 23/11 à 17h00\nLudogorets - Dunav Rousse\nNombre de tirs cadrés 3 ou plus - Dunav Rousse - 90\nMins : Qui\nBP te"],
];

const PERDU = `UNIBET
PARI DE LEO
PERDU
DOMMAGE...
MISE
COTE
S€
2,1O
PARI SIMPLE - 02.12.26
ATP Paris - Le 02/12 à 20h30
Sinner - Alcaraz
Vainqueur du match : Sinner`;

const COMBINE = `UNIBET
GAGNÉ
21,00
BIEN JOUÉ !
MISE
COTE
10€
2,10
PARI COMBINÉ - 24.11.26
Ligue 1 - Le 24/11 à 21h00
PSG - OM 1,50
Résultat du match : PSG
NBA - Le 24/11 à 02h00
Lakers - Celtics 1,40
Vainqueur : Lakers`;

describe("lireNombre", () => {
  it("lit les montants et corrige les confusions OCR", () => {
    expect(lireNombre("5€")).toBe(5);
    expect(lireNombre("5e")).toBe(5);
    expect(lireNombre("S€")).toBe(5);
    expect(lireNombre("1,7S")).toBe(1.75);
    expect(lireNombre("2,1O")).toBe(2.1);
    expect(lireNombre("1.75")).toBe(1.75);
  });
  it("ignore les mots", () => {
    expect(lireNombre("LE")).toBeNull();
    expect(lireNombre("SOS")).toBeNull();
    expect(lireNombre("€")).toBeNull();
  });
});

describe("analyserTexteCapture", () => {
  it.each([
    ["PSM 11", UNIBET_PSM11],
    ["PSM 3", UNIBET_PSM3],
  ])("capture Unibet gagnée (%s)", (_, texte) => {
    const p = analyserTexteCapture(texte, AUJOURDHUI);
    expect(p).toMatchObject({
      date: "2026-11-23",
      type: "simple",
      mise: 5,
      cote: 1.75,
      gain: 8.75,
      resultat: "G",
      selections: [{ equipes: "Ludogorets - Dunav Rousse", sport: "foot", cote: null }],
    });
    expect(p.aVerifier).toEqual([]);
  });

  it.each(UNIBET_BRUITE)("capture Unibet bruitée (%s) : mise et cote retrouvées", (_, texte) => {
    const p = analyserTexteCapture(texte, AUJOURDHUI);
    expect(p).toMatchObject({
      date: "2026-11-23",
      mise: 5,
      cote: 1.75,
      resultat: "G",
      selections: [{ equipes: "Ludogorets - Dunav Rousse", sport: "foot" }],
    });
  });

  it("pari perdu, confusions S/O, sport deviné par la compétition", () => {
    const p = analyserTexteCapture(PERDU, AUJOURDHUI);
    expect(p).toMatchObject({
      date: "2026-12-02",
      mise: 5,
      cote: 2.1,
      resultat: "P",
      selections: [{ equipes: "Sinner - Alcaraz", sport: "tennis" }],
    });
  });

  it("combiné : cotes des sélections lues en bout de ligne", () => {
    const p = analyserTexteCapture(COMBINE, AUJOURDHUI);
    expect(p).toMatchObject({ type: "combine", date: "2026-11-24", mise: 10, cote: 2.1, resultat: "G" });
    expect(p.selections).toEqual([
      { equipes: "PSG - OM", cote: 1.5, sport: "foot" },
      { equipes: "Lakers - Celtics", cote: 1.4, sport: "basket" },
    ]);
  });

  it("combiné : une cote de sélection manquante est déduite de la cote totale", () => {
    const p = analyserTexteCapture(COMBINE.replace("Lakers - Celtics 1,40", "Lakers - Celtics"), AUJOURDHUI);
    expect(p.selections[1].cote).toBe(1.4);
  });

  it("cote illisible : déduite du gain et signalée", () => {
    const p = analyserTexteCapture(UNIBET_PSM11.replace("1,75", "#"), AUJOURDHUI);
    expect(p.cote).toBe(1.75);
    expect(p.aVerifier).toContain("cote");
  });

  it("gain incohérent avec mise × cote : mise et cote signalées", () => {
    const p = analyserTexteCapture(UNIBET_PSM11.replace("1,75", "1,15"), AUJOURDHUI);
    expect(p.aVerifier).toEqual(expect.arrayContaining(["mise", "cote"]));
  });

  it("date sans année : « Le 28/12 » importé en janvier → année précédente", () => {
    const texte = "MISE\nCOTE\n5€\n1,50\nLigue 1 - Le 28/12 à 21h00\nLens - Lille";
    expect(analyserTexteCapture(texte, "2027-01-03").date).toBe("2026-12-28");
  });

  it("texte illisible : tout est à vérifier, une sélection vide est proposée", () => {
    const p = analyserTexteCapture("UNIBET\n###", AUJOURDHUI);
    expect(p.selections).toEqual([{ equipes: "", sport: "", cote: null }]);
    expect(p.aVerifier).toEqual(expect.arrayContaining(["date", "mise", "cote", "resultat", "equipes", "sport"]));
  });
});

describe("devinerSport", () => {
  it("distingue tennis de table et tennis", () => {
    expect(devinerSport("Setka Cup - Le 23/11")).toBe("tennisDeTable");
    expect(devinerSport("WTA Pékin - Le 23/11")).toBe("tennis");
    expect(devinerSport("NHL - Le 23/11")).toBe("hockey");
    expect(devinerSport("Top 14 - Le 23/11")).toBe("rugby");
    expect(devinerSport("Inconnu")).toBe("");
  });
});

describe("appliquerImport", () => {
  const simple: PariAImporter = {
    type: "simple",
    mise: 5,
    cote: 1.75,
    resultat: "G",
    selections: [{ equipes: "Ludogorets - Dunav Rousse", sport: "foot", cote: null }],
  };
  const ok = (r: ReturnType<typeof appliquerImport>): Jour => {
    if ("erreur" in r) throw new Error(r.erreur);
    return r.jour;
  };

  it("simple : premier emplacement vide", () => {
    const j = jourVide(AUJOURDHUI);
    j.paris[0] = { ...j.paris[0], equipes: "Déjà là" };
    const res = ok(appliquerImport(j, simple));
    expect(res.paris[0].equipes).toBe("Déjà là");
    expect(res.paris[1]).toEqual({ equipes: "Ludogorets - Dunav Rousse", sport: "foot", mise: 5, cote: 1.75, resultat: "G" });
  });

  it("simple : refusé si tous les paris sont remplis", () => {
    const j = jourVide(AUJOURDHUI);
    j.paris = j.paris.map((p) => ({ ...p, mise: 1 }));
    expect(appliquerImport(j, simple)).toHaveProperty("erreur");
  });

  it("simple : refusé sur un jour en combiné déjà saisi", () => {
    const j = { ...jourVide(AUJOURDHUI), type: "combine" as const };
    j.paris[0] = { ...j.paris[0], cote: 1.5 };
    expect(appliquerImport(j, simple)).toHaveProperty("erreur");
  });

  it("combiné : remplit les sélections et la mise du combiné", () => {
    const res = ok(
      appliquerImport(jourVide(AUJOURDHUI), {
        type: "combine",
        mise: 10,
        cote: 2.1,
        resultat: "G",
        selections: [
          { equipes: "PSG - OM", sport: "foot", cote: 1.5 },
          { equipes: "Lakers - Celtics", sport: "basket", cote: 1.4 },
        ],
      }),
    );
    expect(res.type).toBe("combine");
    expect(res.miseCombine).toBe(10);
    expect(res.paris.slice(0, 2).map((p) => [p.cote, p.resultat])).toEqual([
      [1.5, "G"],
      [1.4, "G"],
    ]);
  });

  it("combiné gagné : chaque sélection doit avoir sa cote", () => {
    const r = appliquerImport(jourVide(AUJOURDHUI), {
      type: "combine",
      mise: 10,
      cote: 2.1,
      resultat: "G",
      selections: [
        { equipes: "A - B", sport: "", cote: 1.5 },
        { equipes: "C - D", sport: "", cote: null },
      ],
    });
    expect(r).toHaveProperty("erreur");
  });
});
