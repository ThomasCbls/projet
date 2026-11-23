import { describe, expect, it } from "vitest";
import { ajouterJours, bornerDate, finPeriode, joursActifs, moisDeLaPeriode } from "@/lib/dates";
import {
  formatDateCourte,
  formatEuro,
  formatEuroSigne,
  formatMoisLong,
  formatPct,
  jourSemaine,
  parseNombre,
} from "@/lib/format";
import { ErreurImport, exporterJSON, importerJSON, normaliserDonnees } from "@/lib/storage";
import { jourVide } from "@/lib/types";

/** Intl utilise des espaces insécables : on les normalise pour comparer. */
const espaces = (s: string) => s.replace(/[  ]/g, " ");

describe("dates", () => {
  it("période du 18/11/2026 au 17/11/2027 : 365 jours actifs, 13 mois", () => {
    expect(finPeriode("2026-11-18")).toBe("2027-11-17");
    const jours = joursActifs("2026-11-18");
    expect(jours).toHaveLength(365);
    expect(jours[0]).toBe("2026-11-18");
    expect(jours.at(-1)).toBe("2027-11-17");
    const mois = moisDeLaPeriode("2026-11-18");
    expect(mois).toHaveLength(13);
    expect(mois[0]).toBe("2026-11");
    expect(mois[12]).toBe("2027-11");
  });

  it("366 jours quand la période contient un 29 février", () => {
    expect(joursActifs("2027-11-18")).toHaveLength(366);
  });

  it("début au 29/02 → fin au 28/02 (comme Excel DATE())", () => {
    expect(finPeriode("2028-02-29")).toBe("2029-02-28");
  });

  it("passage de mois, d'année et heure d'été sans décalage", () => {
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouterJours("2027-03-28", 1)).toBe("2027-03-29");
    expect(ajouterJours("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("borne une date à la période", () => {
    expect(bornerDate("2020-01-01", "2026-11-18")).toBe("2026-11-18");
    expect(bornerDate("2030-01-01", "2026-11-18")).toBe("2027-11-17");
  });
});

describe("format", () => {
  it("montants en euros à la française", () => {
    expect(espaces(formatEuro(1234.5))).toBe("1 234,50 €");
    expect(espaces(formatEuro(-0.001))).toBe("0,00 €");
    expect(espaces(formatEuroSigne(12.5))).toBe("+12,50 €");
    expect(espaces(formatEuroSigne(-3))).toBe("-3,00 €");
  });

  it("pourcentage, « – » si non calculable", () => {
    expect(espaces(formatPct(0.75))).toBe("75 %");
    expect(formatPct(null)).toBe("–");
    expect(formatPct(Number.NaN)).toBe("–");
  });

  it("dates en français", () => {
    expect(formatDateCourte("2026-11-18")).toBe("Mer 18 nov. 2026");
    expect(jourSemaine("2026-11-22")).toBe("Dim");
    expect(formatMoisLong("2027-02")).toBe("Février 2027");
  });

  it("saisie de nombres avec virgule", () => {
    expect(parseNombre("1,85")).toBe(1.85);
    expect(parseNombre(" 10 € ")).toBe(10);
    expect(parseNombre("")).toBeNull();
    expect(parseNombre("abc")).toBeNull();
  });
});

describe("stockage / import JSON", () => {
  it("aller-retour export → import identique", () => {
    const j = jourVide("2026-11-20");
    j.matchs.foot[0] = "G";
    j.paris[0] = { equipes: "PSG - OM", mise: 10, cote: 1.8, resultat: "G", sport: "foot" };
    j.mouvements = [{ id: "a", type: "depot", montant: 100, note: "Départ" }];
    const data = { version: 1 as const, dateDebut: "2026-11-18", jours: { "2026-11-20": j } };
    expect(importerJSON(exporterJSON(data))).toEqual(data);
  });

  it("répare un JSON partiellement corrompu", () => {
    const d = normaliserDonnees({
      dateDebut: "pas une date",
      jours: {
        "2026-11-20": {
          matchs: { foot: ["g", "X", "P"], inconnu: ["G"] },
          paris: [{ equipes: 3, mise: "12,5", cote: "abc", resultat: "g", sport: "curling" }],
          mouvements: [{ type: "retrait", montant: "20" }, { type: "inconnu", montant: 5 }, { type: "depot", montant: -3 }],
          type: "Combiné",
          miseCombine: "5",
        },
        "pas-une-date": {},
        "2026-11-21": {},
      },
    });
    expect(d.dateDebut).toBe("2026-11-18");
    expect(Object.keys(d.jours)).toEqual(["2026-11-20"]);
    const j = d.jours["2026-11-20"];
    expect(j.matchs.foot).toEqual(["G", "", "P", "", ""]);
    expect(j.matchs.volley).toEqual(["", "", "", "", ""]);
    expect(j.paris).toHaveLength(5);
    expect(j.paris[0]).toEqual({ equipes: "", mise: 12.5, cote: null, resultat: "G", sport: "" });
    expect(j.mouvements).toEqual([{ id: "m0", type: "retrait", montant: 20, note: "" }]);
    expect(j.type).toBe("combine");
    expect(j.miseCombine).toBe(5);
  });

  it("refuse un fichier non reconnu", () => {
    expect(() => importerJSON("{oups")).toThrow(ErreurImport);
    expect(() => importerJSON("[]")).toThrow(ErreurImport);
    expect(() => importerJSON('{"autre": 1}')).toThrow(ErreurImport);
  });
});
