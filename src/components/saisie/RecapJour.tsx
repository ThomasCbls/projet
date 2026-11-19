import type { ResumeJour } from "@/lib/calculs";
import { formatEuro, formatPct } from "@/lib/format";
import { Montant } from "../ui";

function Stat({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-carte-2 px-3 py-2">
      <dt className="text-xs text-attenue">{libelle}</dt>
      <dd className="chiffres text-lg font-bold">{children}</dd>
    </div>
  );
}

export function RecapJour({ resume }: { resume: ResumeJour }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Stat libelle="Matchs gagnés">
        <span className="text-gagne">{resume.gagnes}</span>
      </Stat>
      <Stat libelle="Matchs perdus">
        <span className="text-perdu">{resume.perdus}</span>
      </Stat>
      <Stat libelle="% réussite">{formatPct(resume.pct)}</Stat>
      <Stat libelle="Paris G / P">
        <span className="text-gagne">{resume.parisGagnes}</span> / <span className="text-perdu">{resume.parisPerdus}</span>
      </Stat>
      <Stat libelle="Total misé">{formatEuro(resume.mise)}</Stat>
      <Stat libelle="Bénéfice / perte">
        <Montant valeur={resume.benefice} />
      </Stat>
    </dl>
  );
}
