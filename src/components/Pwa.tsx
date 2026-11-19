"use client";

import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
// Déclare window.serwist (types seulement, rien n'est importé à l'exécution).
import type {} from "@serwist/next/typings";
import { useEffect, useState } from "react";
// Importé ici pour capter l'invitation d'installation dès le premier affichage.
import "@/hooks/useInstallation";

/** Fourni par @serwist/next au build de production ; absent en développement. */
const lireSerwist = () => window.serwist as Window["serwist"] | undefined;

/**
 * Service worker de la PWA (hors ligne + mises à jour).
 * - Production : enregistre /sw.js et propose « Recharger » quand une nouvelle version est prête.
 * - Développement : désinstalle tout service worker laissé par un `npm start`, sinon l'ancienne
 *   version en cache serait servie à la place du code en cours d'écriture.
 */
export function Pwa() {
  const [miseAJour, setMiseAJour] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Demande au navigateur de ne pas effacer les données (localStorage) en cas de manque de place.
    navigator.storage?.persisted?.().then((ok) => (ok ? undefined : navigator.storage.persist())).catch(() => {});

    const serwist = lireSerwist();
    if (process.env.NODE_ENV !== "production" || !serwist) {
      navigator.serviceWorker
        .getRegistrations()
        .then(async (regs) => {
          await Promise.all(regs.map((r) => r.unregister()));
          // Cette page venait encore de l'ancien cache : on recharge une fois, sans service worker.
          if (regs.length > 0 && navigator.serviceWorker.controller) window.location.reload();
        })
        .catch(() => {});
      return;
    }

    const enAttente = () => setMiseAJour(true);
    serwist.addEventListener("waiting", enAttente);
    serwist
      .register()
      .then((reg) => {
        // Une version téléchargée lors d'une visite précédente attend peut-être déjà.
        if (reg?.waiting && navigator.serviceWorker.controller) setMiseAJour(true);
      })
      .catch(() => {});

    // L'application installée reste souvent ouverte longtemps : on vérifie au retour au premier plan.
    const verifier = () => {
      if (document.visibilityState === "visible") serwist.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", verifier);
    return () => {
      serwist.removeEventListener("waiting", enAttente);
      document.removeEventListener("visibilitychange", verifier);
    };
  }, []);

  const recharger = () => {
    setMiseAJour(false);
    const serwist = lireSerwist();
    if (!serwist) return window.location.reload();
    // Le nouveau service worker prend la main, puis la page se recharge sur la nouvelle version.
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    serwist.messageSkipWaiting();
  };

  return (
    <Snackbar
      open={miseAJour}
      message="Nouvelle version disponible."
      action={
        <Button color="inherit" size="small" onClick={recharger} sx={{ fontWeight: 700 }}>
          Recharger
        </Button>
      }
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: "calc(80px + env(safe-area-inset-bottom))", md: 24 } }}
    />
  );
}
