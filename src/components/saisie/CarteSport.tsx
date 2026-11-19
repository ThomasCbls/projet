"use client";

import { pourcentage } from "@/lib/calculs";
import { formatPct } from "@/lib/format";
import type { Resultat } from "@/lib/types";
import { BoutonResultat } from "./BoutonResultat";

export function CarteSport({
  nom,
  cases,
  onChange,
}: {
  nom: string;
  cases: Resultat[];
  onChange: (index: number, v: Resultat) => void;
}) {
  const g = cases.filter((c) => c === "G").length;
  const p = cases.filter((c) => c === "P").length;
  return (
    <div className="rounded-xl border border-bord bg-carte p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{nom}</h3>
        <p className="chiffres text-xs text-attenue">
          {g + p === 0 ? (
            "Aucun match"
          ) : (
            <>
              <span className="font-semibold text-gagne">{g} G</span> · <span className="font-semibold text-perdu">{p} P</span>{" "}
              · {formatPct(pourcentage(g, p))}
            </>
          )}
        </p>
      </div>
      <div className="flex gap-1.5" role="group" aria-label={`Matchs de ${nom}`}>
        {cases.map((c, i) => (
          <BoutonResultat key={i} valeur={c} libelle={`${nom}, match ${i + 1}`} onChange={(v) => onChange(i, v)} />
        ))}
      </div>
    </div>
  );
}
