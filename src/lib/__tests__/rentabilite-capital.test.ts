import { describe, expect, it } from "vitest";
import { capital } from "@/lib/capital";
import { rentabilite, rentabiliteParMois, sportCombine, ticketsJour } from "@/lib/rentabilite";
import { type AppData, type Jour, type Pari, type SportPariId, donneesVides, jourVide } from "@/lib/types";

const pari = (mise: number | null, cote: number | null, resultat: Pari["resultat"], sport: SportPariId | "" = ""): Pari => ({
  equipes: "A - B",
  mise,
  cote,
  resultat,
  sport,
});

function jourAvec(date: string, modif: (j: Jour) => void): Jour {
  const j = jourVide(date);
  modif(j);
  return j;
}

function donnees(jours: Jour[], debut = "2026-11-18"): AppData {
  const d = donneesVides(debut);
  for (const j of jours) d.jours[j.date] = j;
  return d;
}

describe("rentabilité", () => {
  it("ROI = bénéfice net ÷ total des mises (exemple : 500 € misés, 575 € encaissés → +15 %)", () => {
    const d = donnees([
      jourAvec("2026-11-20", (j) => {
        j.paris[0] = pari(200, 2, "G", "tennis"); // +200, encaisse 400
        j.paris[1] = pari(100, 1.75, "G", "tennis"); // +75, encaisse 175
        j.paris[2] = pari(200, 1.8, "P", "foot"); // −200
      }),
    ]);
    const r = rentabilite(d);
    expect(r.global.mises).toBe(500);
    expect(r.global.gainsEncaisses).toBe(575);
    expect(r.global.benefice).toBe(75);
    expect(r.global.roi).toBeCloseTo(0.15);
    expect(r.global.reussite).toBeCloseTo(2 / 3);
    expect(r.global.beneficesBruts).toBe(275);
    expect(r.global.pertes).toBe(-200);
    expect(r.global.coteMoyenne).toBeCloseTo((2 + 1.75 + 1.8) / 3);
  });

  it("exclut du ROI les paris sans résultat (comptés « en cours »)", () => {
    const d = donnees([
      jourAvec("2026-11-20", (j) => {
        j.paris[0] = pari(10, 2, "G");
        j.paris[1] = pari(30, 2, "");
      }),
    ]);
    const r = rentabilite(d);
    expect(r.global.mises).toBe(10);
    expect(r.global.roi).toBe(1);
    expect(r.enCours).toBe(30);
  });

  it("sépare simples et combinés, et ventile par sport", () => {
    const d = donnees([
      jourAvec("2026-11-20", (j) => {
        j.paris[0] = pari(10, 2, "G", "tennis");
      }),
      jourAvec("2026-11-21", (j) => {
        j.type = "combine";
        j.miseCombine = 20;
        j.paris[0] = pari(null, 1.5, "G", "foot");
        j.paris[1] = pari(null, 2, "P", "foot");
      }),
    ]);
    const r = rentabilite(d);
    expect(r.simples.roi).toBe(1);
    expect(r.combines.benefice).toBe(-20);
    expect(r.combines.coteMoyenne).toBe(3);
    expect(r.global.nbParis).toBe(2);
    const foot = r.parSport.find((s) => s.id === "foot")!;
    expect(foot.combines.benefice).toBe(-20);
    expect(foot.simples.nbParis).toBe(0);
    expect(r.parSport.map((s) => s.id)).toEqual(["tennis", "foot"]);
  });

  it("un combiné non tranché reste en cours", () => {
    const j = jourAvec("2026-11-21", (x) => {
      x.type = "combine";
      x.miseCombine = 5;
      x.paris[0] = pari(null, 1.5, "G", "rugby");
      x.paris[1] = pari(null, 2, "", "rugby");
    });
    expect(ticketsJour(j)).toEqual({ tickets: [], enCours: 5 });
  });

  it("sport d'un combiné : commun, multi-sports ou non renseigné", () => {
    expect(sportCombine([pari(null, 2, "G", "basket"), pari(null, 2, "G", "basket")])).toBe("basket");
    expect(sportCombine([pari(null, 2, "G", "basket"), pari(null, 2, "G", "tennis")])).toBe("multi");
    expect(sportCombine([pari(null, 2, "G")])).toBe("nc");
  });

  it("repère un point fort et un point faible (≥ 3 paris)", () => {
    const tennis = (date: string) =>
      jourAvec(date, (j) => {
        j.paris[0] = pari(10, 2, "G", "tennis");
      });
    const combineFoot = (date: string) =>
      jourAvec(date, (j) => {
        j.type = "combine";
        j.miseCombine = 10;
        j.paris[0] = pari(null, 1.5, "P", "foot");
      });
    const d = donnees([
      tennis("2026-11-18"),
      tennis("2026-11-19"),
      tennis("2026-11-20"),
      combineFoot("2026-11-21"),
      combineFoot("2026-11-22"),
      combineFoot("2026-11-23"),
    ]);
    const r = rentabilite(d);
    expect(r.global.roi).toBe(0);
    expect(r.pointFort?.sport).toBe("tennis");
    expect(r.pointFort?.type).toBe("simple");
    expect(r.pointFaible?.sport).toBe("foot");
    expect(r.pointFaible?.type).toBe("combine");
    expect(r.pointFaible?.roiSans).toBe(1);
  });

  it("filtre sur un mois et liste les mois jusqu'au mois en cours", () => {
    const d = donnees([
      jourAvec("2026-11-20", (j) => {
        j.paris[0] = pari(10, 2, "G");
      }),
      jourAvec("2026-12-02", (j) => {
        j.paris[0] = pari(10, 2, "P");
      }),
    ]);
    expect(rentabilite(d, "2026-12").global.benefice).toBe(-10);
    const mois = rentabiliteParMois(d, "2026-11-25");
    expect(mois.map((m) => m.mois)).toEqual(["2026-11", "2026-12"]);
    expect(mois[0].global.roi).toBe(1);
  });
});

describe("capital", () => {
  it("sans saisie : tout est à zéro, taux non calculables", () => {
    const c = capital(donneesVides("2026-11-18"), "2026-11-19");
    expect(c.etat.patrimoine).toBe(0);
    expect(c.etat.tauxCapitalisation).toBeNull();
    expect(c.etat.progression).toBeNull();
    expect(c.mois.map((m) => m.mois)).toEqual(["2026-11"]);
  });

  it("calcule gagné, sécurisé, retiré, réinvesti et capital actif", () => {
    const d = donnees([
      jourAvec("2026-11-18", (j) => {
        j.mouvements = [{ id: "1", type: "depot", montant: 200, note: "" }];
      }),
      jourAvec("2026-11-20", (j) => {
        j.paris[0] = pari(50, 3, "G"); // +100
      }),
      jourAvec("2026-12-01", (j) => {
        j.mouvements = [
          { id: "2", type: "securisation", montant: 40, note: "" },
          { id: "3", type: "retrait", montant: 30, note: "" },
          { id: "4", type: "reinjection", montant: 10, note: "" },
        ];
      }),
    ]);
    const c = capital(d, "2026-12-05");
    expect(c.etat).toMatchObject({
      depots: 200,
      gagne: 100,
      retire: 30,
      securise: 30,
      capitalActif: 240,
      patrimoine: 270,
      capitalise: 60,
      reinvesti: 40,
    });
    expect(c.etat.tauxCapitalisation).toBeCloseTo(0.6);
    expect(c.etat.partActif).toBeCloseTo(240 / 270);
    expect(c.etat.progression).toBe(0.5);
    expect(c.mois.map((m) => m.mois)).toEqual(["2026-11", "2026-12"]);
    expect(c.mois[0].fin.capitalActif).toBe(300);
    expect(c.mois[1].flux.securise).toBe(30);
    expect(c.mouvements.map((m) => m.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("le capitalisé ne dépasse jamais le gain (retrait d'une partie des dépôts)", () => {
    const d = donnees([
      jourAvec("2026-11-18", (j) => {
        j.mouvements = [
          { id: "1", type: "depot", montant: 100, note: "" },
          { id: "2", type: "retrait", montant: 80, note: "" },
        ];
        j.paris[0] = pari(10, 2, "G"); // +10
      }),
    ]);
    const e = capital(d, "2026-11-18").etat;
    expect(e.capitalise).toBe(10);
    expect(e.tauxCapitalisation).toBe(1);
    expect(e.reinvesti).toBe(0);
  });
});
