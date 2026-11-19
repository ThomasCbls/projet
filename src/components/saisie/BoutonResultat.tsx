"use client";

import type { Resultat } from "@/lib/types";

const SUIVANT: Record<Resultat, Resultat> = { "": "G", G: "P", P: "" };
const LIBELLE: Record<Resultat, string> = { "": "vide", G: "gagné", P: "perdu" };

/** Case de match : vide → G (vert) → P (rouge) → vide. */
export function BoutonResultat({
  valeur,
  onChange,
  libelle,
}: {
  valeur: Resultat;
  onChange: (v: Resultat) => void;
  /** Ex. « Foot, match 3 » */
  libelle: string;
}) {
  const style =
    valeur === "G"
      ? "border-gagne-fond bg-gagne-fond text-white"
      : valeur === "P"
        ? "border-perdu-fond bg-perdu-fond text-white"
        : "border-bord border-dashed bg-carte text-attenue hover:border-attenue";
  return (
    <button
      type="button"
      onClick={() => onChange(SUIVANT[valeur])}
      aria-label={`${libelle} : ${LIBELLE[valeur]}. Toucher pour passer à ${LIBELLE[SUIVANT[valeur]]}`}
      className={`flex h-12 min-w-11 flex-1 select-none items-center justify-center rounded-lg border-2 text-lg font-bold transition-colors active:scale-95 ${style}`}
    >
      {valeur || <span aria-hidden="true">·</span>}
    </button>
  );
}
