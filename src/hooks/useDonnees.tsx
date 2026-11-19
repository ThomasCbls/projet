"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { creerStockage } from "@/lib/storage";
import { type AppData, type Jour, donneesVides, jourVide } from "@/lib/types";

export type StatutSauvegarde = "chargement" | "enregistre" | "en-cours" | "erreur";

interface ContexteDonnees {
  /** null tant que les données ne sont pas chargées (côté client uniquement). */
  data: AppData | null;
  statut: StatutSauvegarde;
  /** Jour stocké, ou jour vide s'il n'a jamais été saisi. */
  lireJour: (date: string) => Jour;
  majJour: (date: string, modif: (j: Jour) => Jour) => void;
  setDateDebut: (date: string) => void;
  remplacer: (data: AppData) => void;
  reinitialiser: () => Promise<void>;
}

const Contexte = createContext<ContexteDonnees | null>(null);
const DELAI_SAUVEGARDE_MS = 300;

export function DonneesProvider({ children }: { children: React.ReactNode }) {
  const stockage = useMemo(() => creerStockage(), []);
  const [data, setData] = useState<AppData | null>(null);
  const [statut, setStatut] = useState<StatutSauvegarde>("chargement");
  const enAttente = useRef<AppData | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chargement initial, après le montage (aucun accès au stockage côté serveur).
  useEffect(() => {
    let actif = true;
    stockage.charger().then((d) => {
      if (actif) {
        setData(d);
        setStatut("enregistre");
      }
    });
    return () => {
      actif = false;
    };
  }, [stockage]);

  const vider = useCallback(async () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    const d = enAttente.current;
    if (!d) return;
    enAttente.current = null;
    try {
      await stockage.sauvegarder(d);
      setStatut("enregistre");
    } catch {
      setStatut("erreur");
    }
  }, [stockage]);

  const planifier = useCallback(
    (d: AppData) => {
      enAttente.current = d;
      setStatut("en-cours");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(vider, DELAI_SAUVEGARDE_MS);
    },
    [vider],
  );

  // Sauvegarde immédiate si l'onglet est fermé ou masqué.
  useEffect(() => {
    const surMasquage = () => {
      if (document.visibilityState === "hidden") void vider();
    };
    window.addEventListener("pagehide", vider);
    document.addEventListener("visibilitychange", surMasquage);
    return () => {
      window.removeEventListener("pagehide", vider);
      document.removeEventListener("visibilitychange", surMasquage);
    };
  }, [vider]);

  // Copie synchrone de l'état : plusieurs modifications rapides s'enchaînent sans se perdre.
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

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
    enAttente.current = null;
    await stockage.effacer();
    const vides = donneesVides();
    dataRef.current = vides;
    setData(vides);
    setStatut("enregistre");
  }, [stockage]);

  const valeur = useMemo(
    () => ({ data, statut, lireJour, majJour, setDateDebut, remplacer, reinitialiser }),
    [data, statut, lireJour, majJour, setDateDebut, remplacer, reinitialiser],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useDonnees(): ContexteDonnees {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error("useDonnees doit être utilisé dans <DonneesProvider>.");
  return ctx;
}
