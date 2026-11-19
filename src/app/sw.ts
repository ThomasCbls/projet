/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

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
    // /saisie?date=AAAA-MM-JJ est servi par la page /saisie mise en cache (la date est lue côté client).
    ignoreURLParametersMatching: [/^date$/],
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
    ...defaultCache,
  ],
});

serwist.addEventListeners();
