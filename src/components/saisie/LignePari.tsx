"use client";

import { useId } from "react";
import { beneficePariSimple, pariSansCote } from "@/lib/calculs";
import { formatEuro } from "@/lib/format";
import type { Pari, Resultat } from "@/lib/types";
import { IconeAlerte } from "../Icones";
import { ChampNombre, Montant, Segments } from "../ui";

const OPTIONS_RESULTAT: { valeur: Resultat; texte: string; classeActive?: string; aria: string }[] = [
  { valeur: "", texte: "–", classeActive: "bg-carte-2 text-texte", aria: "Sans résultat" },
  { valeur: "G", texte: "G", classeActive: "bg-gagne-fond text-white", aria: "Gagné" },
  { valeur: "P", texte: "P", classeActive: "bg-perdu-fond text-white", aria: "Perdu" },
];

export function LignePari({
  numero,
  pari,
  combine,
  onChange,
}: {
  numero: number;
  pari: Pari;
  combine: boolean;
  onChange: (p: Pari) => void;
}) {
  const idEquipes = useId();
  const maj = (champ: Partial<Pari>) => onChange({ ...pari, ...champ });
  const benefice = beneficePariSimple(pari);
  const titre = combine ? `Sélection ${numero}` : `Pari ${numero}`;

  return (
    <fieldset className="rounded-xl border border-bord bg-carte p-3">
      <legend className="sr-only">{titre}</legend>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span aria-hidden="true" className="text-sm font-semibold">
          {titre}
        </span>
        {!combine && pari.resultat !== "" && <Montant valeur={benefice} className="text-sm font-semibold" />}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_9rem]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={idEquipes} className="mb-1 block text-xs font-medium text-attenue">
            Équipes / pari
          </label>
          <input
            id={idEquipes}
            type="text"
            className="champ"
            placeholder="Ex. PSG – OM"
            value={pari.equipes}
            onChange={(e) => maj({ equipes: e.target.value })}
          />
        </div>
        {!combine && (
          <ChampNombre libelle="Mise" suffixe="€" valeur={pari.mise} onChange={(mise) => maj({ mise })} />
        )}
        <ChampNombre libelle="Cote" valeur={pari.cote} onChange={(cote) => maj({ cote })} />
        <div className={combine ? "" : "col-span-2 sm:col-span-1"}>
          <Segments
            libelle="Résultat"
            options={OPTIONS_RESULTAT}
            valeur={pari.resultat}
            onChange={(resultat) => maj({ resultat })}
          />
        </div>
      </div>
      {!combine && pariSansCote(pari) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-perdu">
          <IconeAlerte className="h-4 w-4 shrink-0" />
          Cote manquante : comme dans Excel, ce pari gagné compte {formatEuro(0 - (pari.mise ?? 0))}.
        </p>
      )}
    </fieldset>
  );
}
