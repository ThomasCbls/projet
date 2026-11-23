import type { MetadataRoute } from "next";
import { JETONS, NOM_APP, SLOGAN } from "@/theme/constantes";

/** Manifeste de la PWA, servi par Next sur /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: NOM_APP,
    short_name: NOM_APP,
    description: `${SLOGAN} Suivi des matchs et des paris sportifs : tableau de bord, bilans mensuels et par sport.`,
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Sombre par défaut : écran de lancement et barre système au fond « nuit ».
    background_color: JETONS.dark.bg,
    theme_color: JETONS.dark.bg,
    categories: ["sports", "finance", "productivity"],
    // Fait apparaître BetTracker dans la feuille de partage (Android/Chrome uniquement, iOS ne gère
    // pas share_target) : une capture de pari partagée est lue par le service worker (app/sw.ts),
    // puis préremplie dans la page de saisie.
    share_target: {
      action: "/partage",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "titre", text: "texte", url: "lien", files: [{ name: "image", accept: ["image/*"] }] },
    },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Saisir aujourd'hui",
        short_name: "Saisie",
        url: "/saisie",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Historique",
        url: "/historique",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
