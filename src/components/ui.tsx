"use client";

import { useEffect, useId, useState } from "react";
import { formatEuroSigne, formatNombre, parseNombre } from "@/lib/format";

/** Bloc de contenu avec titre. */
export function Carte({
  titre,
  action,
  children,
  className = "",
}: {
  titre?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-bord bg-carte p-4 ${className}`}>
      {(titre || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titre && <h2 className="text-base font-semibold">{titre}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Montant signé, vert si positif, rouge si négatif. */
export function Montant({ valeur, className = "" }: { valeur: number; className?: string }) {
  const arrondi = Math.round(valeur * 100) / 100;
  const couleur = arrondi > 0 ? "text-gagne" : arrondi < 0 ? "text-perdu" : "";
  return <span className={`chiffres ${couleur} ${className}`}>{formatEuroSigne(valeur)}</span>;
}

/** Titre de page. */
export function TitrePage({ children, sousTitre }: { children: React.ReactNode; sousTitre?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sousTitre && <p className="mt-1 text-sm text-attenue">{sousTitre}</p>}
    </div>
  );
}

/** Conteneur défilant horizontalement pour les tableaux larges. */
export function DefilementTableau({ children, libelle }: { children: React.ReactNode; libelle: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="region" aria-label={libelle} tabIndex={0}>
      {children}
    </div>
  );
}

/** Écran de chargement tant que les données locales ne sont pas lues. */
export function Chargement() {
  return (
    <p className="py-16 text-center text-attenue" role="status">
      Chargement des données…
    </p>
  );
}

/**
 * Champ numérique tolérant (« 1,85 », « 10 € »).
 * Garde le texte saisi localement pour ne pas gêner la frappe (« 1, »).
 */
export function ChampNombre({
  libelle,
  valeur,
  onChange,
  suffixe,
  placeholder,
  disabled,
  masquerLibelle = false,
}: {
  libelle: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  suffixe?: string;
  placeholder?: string;
  disabled?: boolean;
  masquerLibelle?: boolean;
}) {
  const id = useId();
  const versTexte = (v: number | null) => (v === null ? "" : formatNombre(v).replace(/\s/g, ""));
  const [texte, setTexte] = useState(versTexte(valeur));

  // Resynchronise si la valeur change de l'extérieur (changement de jour, import…).
  useEffect(() => {
    setTexte((t) => (parseNombre(t) === valeur ? t : versTexte(valeur)));
  }, [valeur]);

  const invalide = texte.trim() !== "" && parseNombre(texte) === null;

  return (
    <div>
      <label htmlFor={id} className={masquerLibelle ? "sr-only" : "mb-1 block text-xs font-medium text-attenue"}>
        {libelle}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`champ chiffres ${suffixe ? "pr-8" : ""} ${invalide ? "border-perdu" : ""}`}
          value={texte}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalide || undefined}
          onChange={(e) => {
            setTexte(e.target.value);
            const n = parseNombre(e.target.value);
            if (e.target.value.trim() === "" || n !== null) onChange(n);
          }}
          onBlur={() => {
            if (!invalide) setTexte(versTexte(parseNombre(texte)));
          }}
        />
        {suffixe && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-attenue">
            {suffixe}
          </span>
        )}
      </div>
    </div>
  );
}

/** Contrôle segmenté (radiogroup accessible). */
export function Segments<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
  masquerLibelle = false,
}: {
  libelle: string;
  options: { valeur: T; texte: string; classeActive?: string; aria?: string }[];
  valeur: T;
  onChange: (v: T) => void;
  masquerLibelle?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <span id={id} className={masquerLibelle ? "sr-only" : "mb-1 block text-xs font-medium text-attenue"}>
        {libelle}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="inline-flex w-full rounded-lg border border-bord p-1">
        {options.map((o) => {
          const actif = o.valeur === valeur;
          return (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={o.aria}
              onClick={() => onChange(o.valeur)}
              className={`min-h-10 flex-1 rounded-md px-3 text-sm font-semibold transition-colors ${
                actif ? (o.classeActive ?? "bg-accent text-accent-texte") : "text-attenue hover:text-texte"
              }`}
            >
              {o.texte}
            </button>
          );
        })}
      </div>
    </div>
  );
}
