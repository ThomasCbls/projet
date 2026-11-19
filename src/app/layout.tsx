import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IndicateurSauvegarde } from "@/components/IndicateurSauvegarde";
import { DonneesProvider } from "@/hooks/useDonnees";

export const metadata: Metadata = {
  title: "Suivi sport & paris",
  description: "Suivi quotidien des matchs et des paris sportifs, avec bilans mensuels et par sport.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

/** Applique le thème avant le premier rendu (pas de flash). */
const scriptTheme = `(function(){try{var t=localStorage.getItem('suivi-sport:theme');var d=t==='sombre'||(t!=='clair'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-texte"
        >
          Aller au contenu
        </a>
        <DonneesProvider>
          <header className="sticky top-0 z-30 border-b border-bord bg-carte/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
              <span className="text-base font-bold tracking-tight">
                Suivi <span className="text-accent">sport</span> &amp; paris
              </span>
              <Navigation variante="haut" />
              <div className="ml-auto flex items-center gap-2">
                <IndicateurSauvegarde />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main id="contenu" className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-12">
            {children}
          </main>
          <Navigation variante="bas" />
        </DonneesProvider>
      </body>
    </html>
  );
}
