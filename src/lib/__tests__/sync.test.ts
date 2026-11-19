import { beforeEach, describe, expect, it } from "vitest";
import { type AccesDonnees, type Cles, CLE_STOCKAGE } from "@/lib/storage";
import {
  type Distant,
  type LigneJour,
  type LigneProfil,
  CLE_AVANT_SYNC,
  creerStockageSynchronise,
  differences,
  fusionner,
} from "@/lib/sync";
import { type AppData, type Jour, donneesVides, jourVide } from "@/lib/types";

const jourAvec = (date: string, r: "G" | "P"): Jour => {
  const j = jourVide(date);
  return { ...j, matchs: { ...j.matchs, foot: [r, "", "", "", ""] } };
};

const avecJours = (...jours: Jour[]): AppData => ({
  ...donneesVides(),
  jours: Object.fromEntries(jours.map((j) => [j.date, j])),
});

const ligne = (date: string, data: unknown, modifie_le: number, synchro = modifie_le): LigneJour => ({
  date,
  data,
  modifie_le: new Date(modifie_le).toISOString(),
  synchro_le: new Date(synchro).toISOString(),
});

describe("differences", () => {
  it("repère les jours ajoutés, modifiés, vidés et la date de début", () => {
    const a = avecJours(jourAvec("2026-11-18", "G"), jourAvec("2026-11-19", "G"));
    const b: AppData = {
      ...avecJours(jourAvec("2026-11-18", "G"), jourAvec("2026-11-19", "P"), jourAvec("2026-11-20", "G")),
      dateDebut: "2026-12-01",
    };
    expect(differences(a, b)).toEqual({ jours: ["2026-11-19", "2026-11-20"], profil: true });
    expect(differences(b, { ...b, jours: { ...b.jours, "2026-11-20": jourVide("2026-11-20") } }).jours).toEqual([
      "2026-11-20",
    ]);
  });

  it("ignore un jour vide absent d'un côté et des objets égaux mais distincts", () => {
    const a = avecJours(jourAvec("2026-11-18", "G"));
    const b = avecJours(structuredClone(a.jours["2026-11-18"]), jourVide("2026-11-25"));
    expect(differences(a, b)).toEqual({ jours: [], profil: false });
  });
});

describe("fusionner", () => {
  const base = avecJours(jourAvec("2026-11-18", "G"));

  it("le serveur remplace un jour non modifié ici", () => {
    const r = fusionner(base, [ligne("2026-11-18", jourAvec("2026-11-18", "P"), 1000)], null, { jours: {} });
    expect(r.change).toBe(true);
    expect(r.data.jours["2026-11-18"].matchs.foot[0]).toBe("P");
  });

  it("une modification locale plus récente est gardée et reste dans la file", () => {
    const r = fusionner(base, [ligne("2026-11-18", jourAvec("2026-11-18", "P"), 1000)], null, {
      jours: { "2026-11-18": 2000 },
    });
    expect(r.change).toBe(false);
    expect(r.file.jours).toEqual({ "2026-11-18": 2000 });
  });

  it("une version du serveur plus récente l'emporte et sort le jour de la file", () => {
    const r = fusionner(base, [ligne("2026-11-18", jourAvec("2026-11-18", "P"), 3000)], null, {
      jours: { "2026-11-18": 2000 },
    });
    expect(r.data.jours["2026-11-18"].matchs.foot[0]).toBe("P");
    expect(r.file.jours).toEqual({});
  });

  it("un jour vidé sur le serveur ({}) est retiré", () => {
    const r = fusionner(base, [ligne("2026-11-18", {}, 1000)], null, { jours: {} });
    expect(r.data.jours).toEqual({});
  });

  it("date de début : la plus récente gagne", () => {
    const profil: LigneProfil = { date_debut: "2027-01-01", modifie_le: new Date(1000).toISOString() };
    expect(fusionner(base, [], profil, { jours: {} }).data.dateDebut).toBe("2027-01-01");
    const garde = fusionner(base, [], profil, { jours: {}, profil: 5000 });
    expect(garde.data.dateDebut).toBe(base.dateDebut);
    expect(garde.file.profil).toBe(5000);
  });
});

/* ------------------------------------------------------------------ */
/* Deux appareils, un serveur en mémoire                               */
/* ------------------------------------------------------------------ */

/** Imite les tables Supabase et le trigger « dernier modifié gagne ». */
class FauxServeur {
  jours = new Map<string, LigneJour>();
  profil: LigneProfil | null = null;
  horloge = 1_000_000;
  enLigne = true;

  private tick() {
    return new Date(++this.horloge).toISOString();
  }

  private reseau() {
    if (!this.enLigne) throw new Error("Failed to fetch");
  }

  client(uid: () => string | null): Distant {
    return {
      utilisateur: async () => uid(),
      lireJours: async (depuis) => {
        this.reseau();
        return [...this.jours.values()]
          .filter((l) => !depuis || l.synchro_le > depuis)
          .sort((a, b) => a.synchro_le.localeCompare(b.synchro_le));
      },
      lireJoursDates: async (dates) => {
        this.reseau();
        return dates.flatMap((d) => (this.jours.has(d) ? [this.jours.get(d)!] : []));
      },
      lireProfil: async () => {
        this.reseau();
        return this.profil;
      },
      ecrireJours: async (_uid, lignes) => {
        this.reseau();
        const ok = new Set<string>();
        for (const l of lignes) {
          const ancien = this.jours.get(l.date);
          if (ancien && Date.parse(l.modifie_le) < Date.parse(ancien.modifie_le)) continue;
          this.jours.set(l.date, { ...structuredClone(l), synchro_le: this.tick() });
          ok.add(l.date);
        }
        return ok;
      },
      ecrireProfil: async (_uid, p) => {
        this.reseau();
        if (this.profil && Date.parse(p.modifie_le) < Date.parse(this.profil.modifie_le)) return false;
        this.profil = { ...p };
        return true;
      },
      viderTout: async (_uid, modifie_le) => {
        this.reseau();
        for (const [d, l] of this.jours) this.jours.set(d, { ...l, data: {}, modifie_le, synchro_le: this.tick() });
      },
      deconnecter: async () => {},
    };
  }
}

class MemoireCles implements Cles {
  m = new Map<string, string>();
  lire = (k: string) => this.m.get(k) ?? null;
  ecrire = (k: string, v: string) => void this.m.set(k, v);
  supprimer = (k: string) => void this.m.delete(k);
}

/** Un appareil : son stockage local, l'adaptateur et l'état « affiché ». */
async function appareil(serveur: FauxServeur, uid: () => string | null = () => "u1", cles = new MemoireCles()) {
  const stockage = creerStockageSynchronise(serveur.client(uid), cles);
  const app = { data: await stockage.charger(), cles, stockage };
  const acces: AccesDonnees = { lire: () => app.data, appliquer: (d) => void (app.data = d) };
  return {
    ...app,
    get data() {
      return app.data;
    },
    async saisir(date: string, r: "G" | "P") {
      app.data = { ...app.data, jours: { ...app.data.jours, [date]: jourAvec(date, r) } };
      await stockage.sauvegarder(app.data);
    },
    /** Comme useDonnees : l'interface passe à vide avant d'effacer le stockage. */
    async reinitialiser() {
      app.data = donneesVides();
      await stockage.effacer();
    },
    sync: () => stockage.synchro!.synchroniser(acces),
    attente: () => stockage.synchro!.nbEnAttente(),
  };
}

describe("synchronisation entre appareils", () => {
  let serveur: FauxServeur;
  beforeEach(() => {
    serveur = new FauxServeur();
  });

  it("une saisie sur le téléphone apparaît sur le PC", async () => {
    const tel = await appareil(serveur);
    const pc = await appareil(serveur);
    await tel.sync();
    await pc.sync();
    await tel.saisir("2026-11-18", "G");
    expect(tel.attente()).toBe(1);
    await tel.sync();
    expect(tel.attente()).toBe(0);
    await pc.sync();
    expect(pc.data.jours["2026-11-18"].matchs.foot[0]).toBe("G");
    // Le PC a aussi tout enregistré localement.
    expect(pc.cles.lire(CLE_STOCKAGE)).toContain("2026-11-18");
  });

  it("hors ligne : la saisie attend puis part au retour du réseau, sans écraser l'autre appareil", async () => {
    const tel = await appareil(serveur);
    const pc = await appareil(serveur);
    await tel.sync();
    await pc.sync();

    serveur.enLigne = false;
    await tel.saisir("2026-11-18", "G");
    await expect(tel.sync()).rejects.toThrow();
    expect(tel.attente()).toBe(1);

    serveur.enLigne = true;
    await pc.saisir("2026-11-19", "P");
    await pc.sync();
    await tel.sync();
    await pc.sync();

    for (const a of [tel, pc]) {
      expect(Object.keys(a.data.jours).sort()).toEqual(["2026-11-18", "2026-11-19"]);
    }
    expect(tel.attente()).toBe(0);
  });

  it("même jour modifié des deux côtés : la dernière modification gagne", async () => {
    const tel = await appareil(serveur);
    const pc = await appareil(serveur);
    await tel.sync();
    await pc.sync();
    await tel.saisir("2026-11-18", "G");
    await new Promise((r) => setTimeout(r, 5));
    await pc.saisir("2026-11-18", "P");
    await pc.sync(); // le plus récent arrive en premier
    await tel.sync(); // l'ancien est refusé par le serveur puis remplacé
    expect(tel.data.jours["2026-11-18"].matchs.foot[0]).toBe("P");
    expect(serveur.jours.get("2026-11-18")!.data).toMatchObject({ matchs: { foot: ["P", "", "", "", ""] } });
  });

  it("première connexion : les données locales rejoignent le compte, la version en ligne prime", async () => {
    const pc = await appareil(serveur);
    await pc.sync();
    await pc.saisir("2026-11-18", "P");
    await pc.sync();

    let uid: string | null = null;
    const tel = await appareil(serveur, () => uid);
    await tel.saisir("2026-11-18", "G"); // conflit
    await tel.saisir("2026-11-20", "G"); // jour uniquement local
    expect(await tel.sync()).toBe(false); // pas connecté : rien n'est envoyé

    uid = "u1";
    expect(await tel.sync()).toBe(true);
    expect(tel.data.jours["2026-11-18"].matchs.foot[0]).toBe("P");
    expect(tel.data.jours["2026-11-20"].matchs.foot[0]).toBe("G");
    expect(tel.cles.lire(CLE_AVANT_SYNC)).toContain("2026-11-20");
    await pc.sync();
    expect(Object.keys(pc.data.jours).sort()).toEqual(["2026-11-18", "2026-11-20"]);
  });

  it("connexion avec un autre compte : les données du précédent ne s'y mélangent pas", async () => {
    let uid = "u1";
    const tel = await appareil(serveur, () => uid);
    await tel.sync();
    await tel.saisir("2026-11-18", "G");
    await tel.sync();

    const autre = new FauxServeur();
    const cles = tel.cles;
    uid = "u2";
    const tel2 = await appareil(autre, () => uid, cles);
    await tel2.sync();
    expect(tel2.data.jours).toEqual({});
    expect(autre.jours.size).toBe(0);
  });

  it("réinitialiser vide aussi les autres appareils", async () => {
    const tel = await appareil(serveur);
    const pc = await appareil(serveur);
    await tel.sync();
    await tel.saisir("2026-11-18", "G");
    await tel.sync();
    await pc.sync();
    expect(Object.keys(pc.data.jours)).toHaveLength(1);

    await tel.reinitialiser();
    await tel.sync();
    await pc.sync();
    expect(pc.data.jours).toEqual({});
  });
});
