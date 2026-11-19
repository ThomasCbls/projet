import { describe, expect, it } from "vitest";
import {
  beneficeCombine,
  beneficeCumule,
  beneficePariSimple,
  bilanParMois,
  bilanParSport,
  coteCombinee,
  matriceSportMois,
  pourcentage,
  resumeJour,
  statsMatchsJour,
  statsParisJour,
  syntheseAnnuelle,
} from "@/lib/calculs";
import { type AppData, type Jour, type Pari, jourVide } from "@/lib/types";

const pari = (mise: number | null, cote: number | null, resultat: Pari["resultat"], equipes = "A - B"): Pari => ({
  equipes,
  mise,
  cote,
  resultat,
});

function jourAvec(date: string, modif: (j: Jour) => void): Jour {
  const j = jourVide(date);
  modif(j);
  return j;
}

describe("pourcentage", () => {
  it("renvoie null quand aucun match (« – » à l'affichage)", () => {
    expect(pourcentage(0, 0)).toBeNull();
  });
  it("calcule G / (G + P)", () => {
    expect(pourcentage(3, 1)).toBe(0.75);
  });
});

describe("matchs du jour", () => {
  it("jour sans match : 0 gagné, 0 perdu, % vide", () => {
    expect(statsMatchsJour(jourVide("2026-11-18"))).toEqual({ gagnes: 0, perdus: 0, pct: null });
    expect(statsMatchsJour(undefined)).toEqual({ gagnes: 0, perdus: 0, pct: null });
  });

  it("compte les G et P des 40 cases", () => {
    const j = jourAvec("2026-11-18", (j) => {
      j.matchs.foot = ["G", "G", "P", "", ""];
      j.matchs.combat = ["", "", "", "", "G"];
      j.matchs.tennisDeTable = ["P", "", "", "", ""];
    });
    const s = statsMatchsJour(j);
    expect(s.gagnes).toBe(3);
    expect(s.perdus).toBe(2);
    expect(s.pct).toBeCloseTo(0.6);
  });
});

describe("paris simples", () => {
  it("pari gagné : mise × (cote − 1)", () => {
    expect(beneficePariSimple(pari(10, 1.85, "G"))).toBeCloseTo(8.5);
  });
  it("pari perdu : − mise", () => {
    expect(beneficePariSimple(pari(10, 1.85, "P"))).toBe(-10);
  });
  it("pari sans résultat : 0", () => {
    expect(beneficePariSimple(pari(10, 1.85, ""))).toBe(0);
  });
  it("valeurs vides : jamais NaN ; G sans cote = − mise comme dans Excel", () => {
    expect(beneficePariSimple(pari(null, null, "G"))).toBe(0);
    expect(beneficePariSimple(pari(null, 2, "P"))).toBe(0);
    expect(beneficePariSimple(pari(5, null, "G"))).toBe(-5);
  });

  it("totaux du jour (mise, bénéfice, paris gagnés/perdus)", () => {
    const j = jourAvec("2026-11-18", (j) => {
      j.paris[0] = pari(10, 2, "G");
      j.paris[1] = pari(5, 1.5, "P");
      j.paris[2] = pari(20, 3, "");
    });
    const s = statsParisJour(j);
    expect(s.mise).toBe(35);
    expect(s.benefice).toBeCloseTo(5);
    expect(s.parisGagnes).toBe(1);
    expect(s.parisPerdus).toBe(1);
    expect(s.coteCombinee).toBeNull();
  });

  it("la mise combiné est ignorée en mode simple", () => {
    const j = jourAvec("2026-11-18", (j) => {
      j.miseCombine = 50;
      j.paris[0] = pari(10, 2, "G");
    });
    expect(statsParisJour(j).mise).toBe(10);
  });
});

describe("paris combinés", () => {
  it("cote combinée = produit des cotes renseignées", () => {
    expect(coteCombinee([pari(null, 1.5, ""), pari(null, 2, ""), pari(null, null, "")])).toBeCloseTo(3);
    expect(coteCombinee([pari(null, null, "")])).toBeNull();
  });

  it("combiné gagné : mise × (cote combinée − 1), compte pour 1 pari gagné", () => {
    const j = jourAvec("2026-11-18", (j) => {
      j.type = "combine";
      j.miseCombine = 10;
      j.paris[0] = pari(null, 1.5, "G");
      j.paris[1] = pari(null, 2, "G");
    });
    const s = statsParisJour(j);
    expect(s.coteCombinee).toBeCloseTo(3);
    expect(s.mise).toBe(10);
    expect(s.benefice).toBeCloseTo(20);
    expect(s.parisGagnes).toBe(1);
    expect(s.parisPerdus).toBe(0);
  });

  it("combiné avec une perte : tout est perdu", () => {
    const j = jourAvec("2026-11-18", (j) => {
      j.type = "combine";
      j.miseCombine = 10;
      j.paris[0] = pari(99, 1.5, "G");
      j.paris[1] = pari(99, 2, "P");
      j.paris[2] = pari(99, 1.2, "");
    });
    const s = statsParisJour(j);
    expect(s.mise).toBe(10); // les mises individuelles sont ignorées
    expect(s.benefice).toBe(-10);
    expect(s.parisGagnes).toBe(0);
    expect(s.parisPerdus).toBe(1);
  });

  it("combiné en cours (une sélection sans résultat) : 0", () => {
    const paris = [pari(null, 1.5, "G"), pari(null, 2, "")];
    expect(beneficeCombine(paris, 10)).toBe(0);
    const j = jourAvec("2026-11-18", (j) => {
      j.type = "combine";
      j.miseCombine = 10;
      j.paris[0] = paris[0];
      j.paris[1] = paris[1];
    });
    expect(statsParisJour(j)).toMatchObject({ parisGagnes: 0, parisPerdus: 0, benefice: 0 });
  });

  it("combiné sans aucune cote : 0, cote combinée vide", () => {
    expect(beneficeCombine([pari(null, null, "G")], 10)).toBe(0);
  });

  it("mise combiné vide : pas de NaN", () => {
    expect(beneficeCombine([pari(null, 2, "P")], null)).toBe(0);
    expect(beneficeCombine([pari(null, 2, "G")], null)).toBe(0);
  });

  it("reproduit Excel : les G sont comptés sur les 5 résultats, même sans cote", () => {
    // 2 cotes, 1 G coté + 1 G sur une ligne sans cote → nbG (2) = COUNT(cotes) (2) → gagné
    const paris = [pari(null, 2, "G"), pari(null, 1.5, ""), pari(null, null, "G")];
    expect(beneficeCombine(paris, 10)).toBeCloseTo(20);
  });
});

describe("agrégations", () => {
  const data: AppData = {
    version: 1,
    dateDebut: "2026-11-18",
    jours: {
      "2026-11-18": jourAvec("2026-11-18", (j) => {
        j.matchs.foot = ["G", "P", "", "", ""];
        j.paris[0] = pari(10, 2, "G");
      }),
      "2026-11-30": jourAvec("2026-11-30", (j) => {
        j.matchs.basket = ["G", "G", "", "", ""];
        j.paris[0] = pari(5, 3, "P");
      }),
      "2026-12-01": jourAvec("2026-12-01", (j) => {
        j.matchs.foot = ["P", "", "", "", ""];
        j.type = "combine";
        j.miseCombine = 4;
        j.paris[0] = pari(null, 2, "G");
        j.paris[1] = pari(null, 2, "G");
      }),
      // Hors période : ignoré
      "2026-11-17": jourAvec("2026-11-17", (j) => {
        j.matchs.foot = ["G", "G", "G", "G", "G"];
        j.paris[0] = pari(1000, 2, "G");
      }),
    },
  };

  it("bilan par mois : 13 mois + total", () => {
    const { mois, total } = bilanParMois(data);
    expect(mois).toHaveLength(13);
    expect(mois[0]).toEqual({ mois: "2026-11", gagnes: 3, perdus: 1, total: 4, pct: 0.75, mise: 15, benefice: 5 });
    expect(mois[1]).toMatchObject({ mois: "2026-12", gagnes: 0, perdus: 1, pct: 0, mise: 4, benefice: 12 });
    expect(mois[2].pct).toBeNull();
    expect(total).toMatchObject({ mois: "total", gagnes: 3, perdus: 2, total: 5, mise: 19, benefice: 17 });
    expect(total.pct).toBeCloseTo(0.6);
  });

  it("bilan par sport + Tous sports", () => {
    const b = bilanParSport(data);
    expect(b).toHaveLength(9);
    expect(b[0]).toMatchObject({ id: "foot", gagnes: 1, perdus: 2, total: 3 });
    expect(b.find((l) => l.id === "basket")).toMatchObject({ gagnes: 2, perdus: 0, pct: 1 });
    expect(b.find((l) => l.id === "volley")?.pct).toBeNull();
    expect(b[8]).toMatchObject({ id: "tous", nom: "Tous sports", gagnes: 3, perdus: 2, total: 5 });
  });

  it("matrice sport × mois", () => {
    const m = matriceSportMois(data);
    expect(m.mois).toHaveLength(13);
    const foot = m.lignes[0];
    expect(foot.parMois[0]).toEqual({ gagnes: 1, perdus: 1, pct: 0.5 });
    expect(foot.parMois[1]).toEqual({ gagnes: 0, perdus: 1, pct: 0 });
    expect(foot.total).toMatchObject({ gagnes: 1, perdus: 2 });
    expect(m.lignes[8].parMois[0]).toEqual({ gagnes: 3, perdus: 1, pct: 0.75 });
  });

  it("synthèse annuelle", () => {
    expect(syntheseAnnuelle(data)).toMatchObject({ totalMise: 19, totalBenefice: 17, gagnes: 3, perdus: 2 });
  });

  it("bénéfice cumulé jusqu'au dernier jour de paris", () => {
    const serie = beneficeCumule(data);
    expect(serie[0]).toEqual({ date: "2026-11-18", benefice: 10, cumul: 10 });
    expect(serie.at(-1)).toEqual({ date: "2026-12-01", benefice: 12, cumul: 17 });
    expect(serie).toHaveLength(14);
  });

  it("données vides : aucun NaN", () => {
    const vide: AppData = { version: 1, dateDebut: "2026-11-18", jours: {} };
    const { total } = bilanParMois(vide);
    expect(total).toEqual({ mois: "total", gagnes: 0, perdus: 0, total: 0, pct: null, mise: 0, benefice: 0 });
    expect(beneficeCumule(vide)).toEqual([]);
    expect(resumeJour("2026-11-18", undefined).benefice).toBe(0);
  });
});
