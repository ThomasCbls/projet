"use client";

import { useSyncExternalStore } from "react";

/** Événement « beforeinstallprompt » (Chrome, Edge, Android), absent des types DOM standard. */
interface InvitationInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * - `installee` : l'application tourne en mode installé (fenêtre ou écran d'accueil) ;
 * - `disponible` : le navigateur propose l'installation (bouton possible) ;
 * - `ios` : iPhone / iPad, installation manuelle via « Partager → Sur l'écran d'accueil » ;
 * - `indisponible` : navigateur sans installation possible, ou état pas encore connu.
 */
export type EtatInstallation = "installee" | "disponible" | "ios" | "indisponible";

let invitation: InvitationInstallation | null = null;
let installeeALInstant = false;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

// L'événement peut arriver avant l'affichage de la page Réglages : on l'écoute dès le chargement
// de ce module (importé par la coque de l'application, présente sur toutes les pages).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    invitation = e as InvitationInstallation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invitation = null;
    installeeALInstant = true;
    prevenir();
  });
}

const estInstallee = () =>
  installeeALInstant ||
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const estIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

function lireEtat(): EtatInstallation {
  if (estInstallee()) return "installee";
  if (invitation) return "disponible";
  if (estIos()) return "ios";
  return "indisponible";
}

function sAbonner(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie vrai si l'utilisateur a accepté. */
export async function installer(): Promise<boolean> {
  const courante = invitation;
  if (!courante) return false;
  try {
    await courante.prompt();
    const { outcome } = await courante.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  } finally {
    // Une invitation ne sert qu'une fois ; le navigateur en renverra une si besoin.
    invitation = null;
    prevenir();
  }
}

export function useInstallation(): EtatInstallation {
  return useSyncExternalStore(sAbonner, lireEtat, () => "indisponible");
}
