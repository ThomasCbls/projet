import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

/** Pages mises en cache dès l'installation : toute l'application fonctionne hors ligne. */
const PAGES = ["/", "/saisie", "/historique", "/bilan", "/sports", "/reglages", "/connexion"];
const ICONES = ["icon-192.png", "icon-512.png", "icon-maskable-512.png"];

// Change à chaque build : les pages en cache sont rafraîchies à chaque nouvelle version.
const revision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: false, // enregistré par components/Pwa.tsx, qui gère aussi les mises à jour
  reloadOnOnline: false, // ne pas recharger la page (et perdre une saisie en cours) au retour du réseau
  additionalPrecacheEntries: [
    ...PAGES.map((url) => ({ url, revision })),
    ...ICONES.map((f) => ({ url: `/icons/${f}`, revision })),
  ],
});

const nextConfig: NextConfig = {
  // Métadonnées toujours écrites dans <head> (pas de streaming) : Chrome n'accepte le
  // <link rel="manifest"> que dans <head>, sinon l'application n'est pas installable en mode dev.
  htmlLimitedBots: /.*/,
};

export default withSerwist(nextConfig);
