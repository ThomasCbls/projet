/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkOnly, Serwist } from "serwist";

// Service worker de la PWA, compilé par @serwist/next vers public/sw.js (production uniquement).

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Liste injectée au build : fichiers _next/static, icônes et pages de l'application.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // /saisie?date=AAAA-MM-JJ (ou ?import=partage) est servi par la page /saisie mise en cache
    // (les paramètres sont lus côté client).
    ignoreURLParametersMatching: [/^date$/, /^import$/],
  },
  // Une nouvelle version attend que l'utilisateur clique sur « Recharger » (voir components/Pwa.tsx).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Base de données et comptes (Supabase) : jamais de réponse en cache, toujours le réseau.
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") || /^\/(rest|auth|realtime)\/v1\//.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // Moteur de lecture des captures (≈ 5 Mo) : téléchargé au premier import, puis servi hors ligne.
    {
      matcher: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/tesseract/"),
      handler: new CacheFirst({ cacheName: "bt-ocr" }),
    },
    ...defaultCache,
  ],
});

/**
 * Partage d'une capture depuis une autre application (share_target du manifeste, Android) :
 * l'image est déposée en cache puis lue par la page de saisie (components/saisie/ImportCapture.tsx).
 */
serwist.registerCapture(
  ({ url }) => url.origin === self.location.origin && url.pathname === "/partage",
  async ({ request }) => {
    try {
      const formulaire = await request.formData();
      const image = formulaire.get("image");
      if (image instanceof File && image.type.startsWith("image/")) {
        const cache = await caches.open("bt-partage");
        await cache.put("/partage/image", new Response(image, { headers: { "Content-Type": image.type } }));
      }
    } catch (e) {
      console.error("Partage : image illisible", e);
    }
    return Response.redirect("/saisie?import=partage", 303);
  },
  "POST",
);

serwist.addEventListeners();
