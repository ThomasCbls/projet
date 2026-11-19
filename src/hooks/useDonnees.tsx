"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import type { AccesDonnees } from "@/lib/storage";
import { creerStockage } from "@/lib/sync";
import { type AppData, type Jour, donneesVides, jourVide } from "@/lib/types";

export type StatutSauvegarde = "chargement" | "enregistre" | "en-cours" | "erreur";
/** inactive : pas de compte connecté (ou synchronisation non configurée). */
export type StatutSynchro = "inactive" | "en-cours" | "a-jour" | "hors-ligne";

interface ContexteDonnees {
  /** null tant que les données ne sont pas chargées (côté client uniquement). */
  data: AppData | null;
  statut: StatutSauvegarde;
  synchro: StatutSynchro;
  derniereSynchro: Date | null;
  /** Jour stocké, ou jour vide s'il n'a jamais été saisi. */
  lireJour: (date: string) => Jour;
  majJour: (date: string, modif: (j: Jour) => Jour) => void;
  setDateDebut: (date: string) => void;
  remplacer: (data: AppData) => void;
  reinitialiser: () => Promise<void>;
  synchroniser: () => Promise<void>;
  /** Envoie les dernières modifications, déconnecte le compte et efface les données de l'appareil. */
  deconnecter: () => Promise<void>;
}

const Contexte = createContext<ContexteDonnees | null>(null);
const DELAI_SAUVEGARDE_MS = 300;
const DELAI_SYNCHRO_MS = 1500;

export function DonneesProvider({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useSession();
  const idUtilisateur = utilisateur?.id ?? null;
  const stockage = useMemo(() => creerStockage(), []);
  const distant = stockage.synchro;
  const [data, setData] = useState<AppData | null>(null);
  const [statut, setStatut] = useState<StatutSauvegarde>("chargement");
  const [synchro, setSynchro] = useState<StatutSynchro>("inactive");
  const [derniereSynchro, setDerniereSynchro] = useState<Date | null>(null);
  const enAttente = useRef<AppData | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteurSynchro = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Copie synchrone de l'état : plusieurs modifications rapides s'enchaînent sans se perdre.
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;
  const idRef = useRef(idUtilisateur);
  idRef.current = idUtilisateur;

  // Chargement initial, après le montage (aucun accès au stockage côté serveur).
  useEffect(() => {
    let actif = true;
    stockage.charger().then((d) => {
      if (actif) {
        dataRef.current = d;
        setData(d);
        setStatut("enregistre");
      }
    });
    return () => {
      actif = false;
    };
  }, [stockage]);

  /** Ce que la synchronisation lit et modifie dans l'interface. */
  const acces = useMemo<AccesDonnees>(
    () => ({
      lire: () => dataRef.current,
      appliquer: (d) => {
        // L'adaptateur vient d'enregistrer la saisie en attente : elle est incluse dans `d`.
        if (minuteur.current) clearTimeout(minuteur.current);
        minuteur.current = null;
        enAttente.current = null;
        dataRef.current = d;
        setData(d);
        setStatut("enregistre");
      },
    }),
    [],
  );

  const synchroniser = useCallback(async () => {
    if (minuteurSynchro.current) clearTimeout(minuteurSynchro.current);
    minuteurSynchro.current = null;
    if (!distant || !idRef.current || !dataRef.current) return;
    if (!navigator.onLine) {
      setSynchro("hors-ligne");
      return;
    }
    setSynchro("en-cours");
    try {
      if (await distant.synchroniser(acces)) {
        setSynchro("a-jour");
        setDerniereSynchro(new Date());
      } else {
        setSynchro("inactive");
      }
    } catch {
      setSynchro("hors-ligne");
    }
  }, [distant, acces]);

  const planifierSynchro = useCallback(
    (delai = DELAI_SYNCHRO_MS) => {
      if (!distant || !idRef.current) return;
      if (minuteurSynchro.current) clearTimeout(minuteurSynchro.current);
      minuteurSynchro.current = setTimeout(() => void synchroniser(), delai);
    },
    [distant, synchroniser],
  );

  const vider = useCallback(async () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    const d = enAttente.current;
    if (!d) return;
    enAttente.current = null;
    try {
      await stockage.sauvegarder(d);
      setStatut("enregistre");
      planifierSynchro();
    } catch {
      setStatut("erreur");
    }
  }, [stockage, planifierSynchro]);

  const planifier = useCallback(
    (d: AppData) => {
      enAttente.current = d;
      setStatut("en-cours");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(vider, DELAI_SAUVEGARDE_MS);
    },
    [vider],
  );

  // Sauvegarde immédiate si l'onglet est fermé ou masqué ; synchro au retour
  // (focus et visibilitychange arrivent souvent ensemble : une seule synchro).
  useEffect(() => {
    let precedente = 0;
    const surRetour = () => {
      if (Date.now() - precedente < 3000) return;
      precedente = Date.now();
      void synchroniser();
    };
    const surVisibilite = () => {
      if (document.visibilityState === "hidden") void vider();
      else surRetour();
    };
    window.addEventListener("pagehide", vider);
    window.addEventListener("online", surRetour);
    window.addEventListener("focus", surRetour);
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.removeEventListener("pagehide", vider);
      window.removeEventListener("online", surRetour);
      window.removeEventListener("focus", surRetour);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [vider, synchroniser]);

  // Synchro dès que les données sont chargées et qu'un compte est connecté.
  const charge = data !== null;
  useEffect(() => {
    if (!charge) return;
    if (idUtilisateur) void synchroniser();
    else setSynchro("inactive");
  }, [charge, idUtilisateur, synchroniser]);

  const modifier = useCallback(
    (fn: (d: AppData) => AppData) => {
      const prec = dataRef.current;
      if (!prec) return;
      const suivant = fn(prec);
      dataRef.current = suivant;
      setData(suivant);
      planifier(suivant);
    },
    [planifier],
  );

  const lireJour = useCallback((date: string) => data?.jours[date] ?? jourVide(date), [data]);

  const majJour = useCallback(
    (date: string, modif: (j: Jour) => Jour) =>
      modifier((d) => ({ ...d, jours: { ...d.jours, [date]: modif(d.jours[date] ?? jourVide(date)) } })),
    [modifier],
  );

  const setDateDebut = useCallback((date: string) => modifier((d) => ({ ...d, dateDebut: date })), [modifier]);

  const remplacer = useCallback(
    (nouvelles: AppData) => {
      dataRef.current = nouvelles;
      setData(nouvelles);
      planifier(nouvelles);
    },
    [planifier],
  );

  const reinitialiser = useCallback(async () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    if (minuteurSynchro.current) clearTimeout(minuteurSynchro.current);
    enAttente.current = null;
    // L'interface passe à vide avant d'effacer : une synchro en cours ne réenregistre pas l'ancien état.
    const vides = donneesVides();
    dataRef.current = vides;
    setData(vides);
    await stockage.effacer();
    setStatut("enregistre");
    planifierSynchro(0);
  }, [stockage, planifierSynchro]);

  const deconnecter = useCallback(async () => {
    if (!distant) return;
    await vider();
    await synchroniser();
    if (distant.nbEnAttente() > 0) {
      throw new Error(
        "Des modifications n'ont pas encore été envoyées. Vérifiez la connexion à Internet, puis réessayez.",
      );
    }
    if (minuteurSynchro.current) clearTimeout(minuteurSynchro.current);
    await distant.oublier();
    const vides = donneesVides();
    dataRef.current = vides;
    setData(vides);
    setSynchro("inactive");
    setDerniereSynchro(null);
  }, [distant, vider, synchroniser]);

  const valeur = useMemo(
    () => ({
      data,
      statut,
      synchro,
      derniereSynchro,
      lireJour,
      majJour,
      setDateDebut,
      remplacer,
      reinitialiser,
      synchroniser,
      deconnecter,
    }),
    [data, statut, synchro, derniereSynchro, lireJour, majJour, setDateDebut, remplacer, reinitialiser, synchroniser, deconnecter],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useDonnees(): ContexteDonnees {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error("useDonnees doit être utilisé dans <DonneesProvider>.");
  return ctx;
}
