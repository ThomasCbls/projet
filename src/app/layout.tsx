import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import { Coque } from "@/components/Coque";
import { CLE_MODE } from "@/theme/constantes";
import { Fournisseurs } from "@/theme/Fournisseurs";

export const metadata: Metadata = {
  title: "Suivi sport & paris",
  description: "Suivi quotidien des matchs et des paris sportifs, avec tableau de bord, bilans mensuels et par sport.",
  applicationName: "Suivi sport & paris",
  // Application installée sur iPhone / iPad (« Sur l'écran d'accueil »).
  appleWebApp: { capable: true, title: "Suivi sport", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Occupe tout l'écran : les marges de sécurité (encoche, barre d'accueil) sont gérées dans Coque.
  viewportFit: "cover",
  // Couleur de la barre système, alignée sur l'en-tête (background.paper).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161b22" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        {/* Applique le thème clair/sombre avant le premier rendu (pas de flash). */}
        <InitColorSchemeScript attribute="class" modeStorageKey={CLE_MODE} />
        <AppRouterCacheProvider>
          <Fournisseurs>
            <Coque>{children}</Coque>
          </Fournisseurs>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
