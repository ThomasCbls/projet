import { describe, expect, it } from "vitest";
import { tableauDeBord } from "@/lib/tableauDeBord";
import { type AppData, type Jour, donneesVides, jourVide } from "@/lib/types";

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

describe("tableau de bord", () => {
  it("sans saisie : tout est vide, ROI et % paris non calculables", () => {
    const t = tableauDeBord(donneesVides("2026-11-18"), "2026-11-19");
    expect(t.joursSaisis).toBe(0);
    expect(t.roi).toBeNull();
    expect(t.pctParis).toBeNull();
    expect(t.cumul).toEqual([]);
    expect(t.derniersJours).toEqual([]);
    expect(t.meilleurSport).toBeNull();
    expect(t.sports).toHaveLength(8);
    expect(t.mois.map((m) => m.mois)).toEqual(["2026-11"]);
  });

  it("calcule le ROI et le % de paris gagnés", () => {
    const t = tableauDeBord(
      donnees([
        jourAvec("2026-11-18", (j) => {
          j.paris[0] = { equipes: "A", mise: 10, cote: 2, resultat: "G" }; // +10
          j.paris[1] = { equipes: "B", mise: 10, cote: 3, resultat: "P" }; // −10
          j.paris[2] = { equipes: "C", mise: 20, cote: 1.5, resultat: "G" }; // +10
        }),
      ]),
      "2026-11-18",
    );
    expect(t.synthese.totalMise).toBe(40);
    expect(t.synthese.totalBenefice).toBe(10);
    expect(t.roi).toBe(0.25);
    expect(t.pctParis).toBeCloseTo(2 / 3);
    expect(t.joursSaisis).toBe(1);
  });

  it("affiche les mois jusqu'au mois en cours, ou jusqu'au dernier mois saisi", () => {
    const enJanvier = donnees([jourAvec("2027-01-05", (j) => (j.matchs.foot[0] = "G"))]);
    expect(tableauDeBord(enJanvier, "2026-11-20").mois.map((m) => m.mois)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(tableauDeBord(donneesVides("2026-11-18"), "2027-02-01").mois).toHaveLength(4);
    expect(tableauDeBord(donneesVides("2026-11-18"), "2030-01-01").mois).toHaveLength(13);
  });

  it("liste les derniers jours saisis, du plus récent au plus ancien", () => {
    const jours = Array.from({ length: 9 }, (_, i) =>
      jourAvec(`2026-11-${String(18 + i).padStart(2, "0")}`, (j) => (j.matchs.foot[0] = "G")),
    );
    const t = tableauDeBord(donnees(jours), "2026-11-30");
    expect(t.derniersJours.map((r) => r.date)).toEqual([
      "2026-11-26",
      "2026-11-25",
      "2026-11-24",
      "2026-11-23",
      "2026-11-22",
      "2026-11-21",
      "2026-11-20",
    ]);
  });

  it("désigne le meilleur sport, à égalité celui qui a le plus de victoires", () => {
    const t = tableauDeBord(
      donnees([
        jourAvec("2026-11-18", (j) => {
          j.matchs.foot = ["G", "P", "", "", ""]; // 50 %
          j.matchs.tennis = ["G", "", "", "", ""]; // 100 %, 1 G
          j.matchs.basket = ["G", "G", "", "", ""]; // 100 %, 2 G
        }),
      ]),
      "2026-11-18",
    );
    expect(t.meilleurSport).toEqual({ nom: "Basket", pct: 1 });
  });
});
