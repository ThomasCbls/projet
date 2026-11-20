import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import { Exo_2, Inter } from "next/font/google";
import { Coque } from "@/components/Coque";
import { CLE_MODE, JETONS, NOM_APP, SLOGAN } from "@/theme/constantes";
import { Fournisseurs } from "@/theme/Fournisseurs";

// Titres : Exo 2 (700–800, italique pour les grands titres). Texte et chiffres : Inter.
const exo2 = Exo_2({ subsets: ["latin"], weight: ["700", "800"], style: ["normal", "italic"], variable: "--font-exo2" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: NOM_APP, template: `%s · ${NOM_APP}` },
  description: `${SLOGAN} Suivi des matchs et des paris sportifs : tableau de bord, bilans mensuels et par sport.`,
  applicationName: NOM_APP,
  // Application installée sur iPhone / iPad (« Sur l'écran d'accueil »).
  appleWebApp: { capable: true, title: NOM_APP, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Occupe tout l'écran : les marges de sécurité (encoche, barre d'accueil) sont gérées dans Coque.
  viewportFit: "cover",
  // Couleur de la barre système, alignée sur l'en-tête (fond de page).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: JETONS.light.bg },
    { media: "(prefers-color-scheme: dark)", color: JETONS.dark.bg },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${exo2.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        {/* Applique le thème clair/sombre avant le premier rendu (pas de flash). Sombre par défaut. */}
        <InitColorSchemeScript attribute="class" modeStorageKey={CLE_MODE} defaultMode="dark" />
        <AppRouterCacheProvider>
          <Fournisseurs>
            <Coque>{children}</Coque>
          </Fournisseurs>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
