"use client";

import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { POLICE_TITRE } from "@/theme/theme";

/** Logo de référence (coins arrondis ≈ 22 %). */
export const SRC_LOGO = "/logo/bettracker.png";

/* ------------------------------------------------------------------ */
/* Logo et wordmark                                                    */
/* ------------------------------------------------------------------ */

/** Icône BetTracker. Taille minimale : 48 px (charte). */
export function Logo({ taille = 48, sx }: { taille?: number; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="img"
      src={SRC_LOGO}
      alt=""
      width={Math.max(48, taille)}
      height={Math.max(48, taille)}
      draggable={false}
      sx={{ display: "block", flexShrink: 0, borderRadius: "22%", ...sx }}
    />
  );
}

/** « BetTracker » en Exo 2 800 italique : « Bet » en encre, « Tracker » en violet. */
export function Wordmark({ taille = "1.25rem" }: { taille?: string }) {
  return (
    <Typography
      component="span"
      sx={{ fontFamily: POLICE_TITRE, fontWeight: 800, fontStyle: "italic", fontSize: taille, lineHeight: 1, letterSpacing: "-0.01em" }}
    >
      Bet
      <Box component="span" sx={{ color: "bt.violetText" }}>
        Tracker
      </Box>
    </Typography>
  );
}

/** Logo + wordmark (en-tête, menu latéral). */
export function LogoComplet() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }} aria-label="BetTracker" role="img">
      <Logo />
      <Wordmark />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Écran de chargement : bt-logo-intro → bt-logo-pulse + bt-loader     */
/* ------------------------------------------------------------------ */

/*
 * Fluidité : on n'anime que transform et opacity (gérés par la carte graphique, même quand le
 * navigateur est occupé à charger l'application). Une courbe CSS s'applique à chaque étape d'une
 * animation : un zoom à plusieurs étapes s'arrête à chacune. D'où un zoom en une seule étape,
 * dont la courbe dépasse légèrement (≈ 105 %) puis revient à 100 %.
 */
const COURBE_REBOND = "cubic-bezier(.3, 1.7, .5, 1)";
const zoom = keyframes`
  from { transform: scale(.6); }
  to   { transform: scale(1); }
`;
/** Le flou se dissipe : une copie floue (filtre fixe, jamais animé) s'efface au-dessus du logo net. */
const nettete = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;
/** Monte en ralentissant, culmine à 60 %, puis redescend doucement (courbe propre à chaque étape). */
const halo = keyframes`
  0%   { opacity: 0; animation-timing-function: ease-out; }
  60%  { opacity: 1; animation-timing-function: ease-in-out; }
  100% { opacity: .8; }
`;
const reflet = keyframes`
  from { transform: translateX(-160%) skewX(-20deg); }
  to   { transform: translateX(260%) skewX(-20deg); }
`;
/** bt-logo-pulse : 1800 ms en boucle, échelle 100 → 103 %. */
const pulsation = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.03); }
`;
const respiration = keyframes`
  0%, 100% { opacity: .8; }
  50%      { opacity: 1; }
`;
const barre = keyframes`
  0%, 100% { transform: scaleY(.35); }
  50%      { transform: scaleY(1); }
`;
const apparition = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
/** Filet de sécurité : si le JavaScript ne démarre jamais, l'écran s'efface quand même. */
const secours = keyframes`
  to { opacity: 0; visibility: hidden; }
`;

/** bt-loader : 4 barres montantes, 1200 ms en boucle, décalées de 120 ms (la dernière en gold). */
function Barres() {
  return (
    <Box aria-hidden="true" sx={{ display: "flex", alignItems: "flex-end", gap: "5px", height: 28 }}>
      {["marque.violet", "marque.violet", "marque.violet", "marque.gold"].map((c, i) => (
        <Box
          key={i}
          sx={{
            width: 7,
            height: 12 + i * 5,
            borderRadius: "3px",
            bgcolor: c,
            transformOrigin: "bottom",
            willChange: "transform",
            animation: `${barre} 1200ms ease-in-out ${i * 120}ms infinite`,
          }}
        />
      ))}
    </Box>
  );
}

type Phase = "intro" | "attente" | "sortie" | "fini";

/** Fond de l'écran de chargement : nuit + halo indigo. */
const fondChargement = {
  position: "fixed",
  inset: 0,
  zIndex: 3000,
  display: "grid",
  placeItems: "center",
  bgcolor: "#07041A",
  backgroundImage: "radial-gradient(420px 420px at 50% 46%, rgba(58, 18, 201, .55), transparent 70%)",
} as const;

/**
 * Logo + halo + barres de chargement.
 * `ouverture` : bt-logo-intro (zoom avec rebond, reflet) ; sinon bt-logo-pulse (le halo respire).
 * Les barres montent dès le début : on voit que l'application charge pendant l'animation.
 */
function SceneChargement({ ouverture, refLogo }: { ouverture: boolean; refLogo?: React.Ref<HTMLDivElement> }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <Box
        ref={refLogo}
        sx={{
          position: "relative",
          width: 128,
          height: 128,
          willChange: "transform",
          animation: ouverture ? "none" : `${pulsation} 1800ms ease-in-out infinite`,
        }}
      >
        {/* Halo néon */}
        <Box
          sx={{
            position: "absolute",
            inset: -40,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(139, 44, 245, .7), transparent)",
            opacity: ouverture ? 0 : 0.8,
            willChange: "opacity",
            animation: ouverture ? `${halo} 1100ms forwards` : `${respiration} 1800ms ease-in-out infinite`,
          }}
        />
        <Box
          sx={{
            position: "relative",
            width: 128,
            height: 128,
            opacity: ouverture ? 0 : 1,
            willChange: ouverture ? "transform, opacity" : "auto",
            animation: ouverture
              ? `${zoom} 1100ms ${COURBE_REBOND} forwards, ${apparition} 600ms ease-out forwards`
              : "none",
          }}
        >
          <Logo taille={128} />
          {ouverture && (
            <>
              {/* Copie floue qui s'efface : le logo devient net */}
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  inset: 0,
                  willChange: "opacity",
                  animation: `${nettete} 660ms ease-out forwards`,
                }}
              >
                <Logo taille={128} sx={{ filter: "blur(8px)" }} />
              </Box>
              {/* Reflet : 700 ms à +750 ms, découpé aux coins arrondis du logo */}
              <Box sx={{ position: "absolute", inset: 0, borderRadius: "22%", overflow: "hidden" }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "40%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)",
                    transform: "translateX(-160%) skewX(-20deg)",
                    willChange: "transform",
                    animation: `${reflet} 700ms ease-in-out 750ms forwards`,
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
      <Barres />
    </Box>
  );
}

/**
 * LE loader de l'application, à chaque chargement ou rechargement de la page.
 * Rendu dès le serveur : l'animation démarre au premier affichage, pendant que le JavaScript
 * et les données se chargent.
 * 1. bt-logo-intro joue en entier, les barres de chargement montent sous le logo ;
 * 2. si tout n'est pas encore prêt, le logo passe en bt-logo-pulse ;
 * 3. dès que tout est prêt, fondu de sortie (250 ms).
 * prefers-reduced-motion : logo fixe avec son halo, sans animation (règle globale du thème).
 */
export function EcranChargement({ pret }: { pret: boolean }) {
  // Logo demandé en priorité, dans le <head> : il est là quand l'animation démarre, au lieu d'apparaître en plein zoom.
  preload(SRC_LOGO, { as: "image", fetchPriority: "high" });
  const [phase, setPhase] = useState<Phase>("intro");
  const logo = useRef<HTMLDivElement>(null);

  // Fin de l'ouverture : on attend les animations CSS en cours, qu'elles aient démarré avant ou après l'hydratation.
  useEffect(() => {
    let annule = false;
    const fin = () => !annule && setPhase((p) => (p === "intro" ? "attente" : p));
    // Mouvement réduit : pas d'ouverture, logo fixe avec son halo jusqu'à ce que tout soit prêt.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      fin();
      return;
    }
    const animations = logo.current?.getAnimations?.({ subtree: true });
    if (animations) Promise.all(animations.map((a) => a.finished)).then(fin, fin);
    const t = setTimeout(fin, 1600); // navigateurs sans getAnimations()
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (phase === "attente" && pret) setPhase("sortie");
    if (phase === "sortie") {
      const t = setTimeout(() => setPhase("fini"), 260);
      return () => clearTimeout(t);
    }
  }, [phase, pret]);

  if (phase === "fini") return null;

  return (
    <Box
      role="status"
      aria-label="Chargement de BetTracker"
      sx={{
        ...fondChargement,
        opacity: phase === "sortie" ? 0 : 1,
        transition: "opacity 250ms ease-in",
        willChange: "opacity",
        pointerEvents: phase === "sortie" ? "none" : "auto",
        animation: `${secours} 250ms ease-in 10s forwards`,
      }}
    >
      <SceneChargement ouverture={phase === "intro"} refLogo={logo} />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Jeu responsable                                                     */
/* ------------------------------------------------------------------ */

/** Rappel sobre et visible (jamais caché en bas de page). */
export function RappelRisques({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, color: "text.secondary", ...sx }}
    >
      <InfoOutlined sx={{ fontSize: 16, mt: "1px" }} aria-hidden="true" />
      <span>
        Jouer comporte des risques : endettement, isolement, dépendance. Pour être aidé, appelez le{" "}
        <Box component="a" href="tel:+33974751313" sx={{ color: "bt.violetText", fontWeight: 600, whiteSpace: "nowrap" }}>
          09 74 75 13 13
        </Box>{" "}
        (appel non surtaxé).
      </span>
    </Typography>
  );
}
