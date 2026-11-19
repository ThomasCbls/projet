import { Suspense } from "react";
import { SaisieJour } from "@/components/saisie/SaisieJour";
import { Chargement } from "@/components/ui";

export default function PageSaisie() {
  return (
    <Suspense fallback={<Chargement />}>
      <SaisieJour />
    </Suspense>
  );
}
