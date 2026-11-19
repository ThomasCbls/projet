/**
 * Client Supabase (base de données + comptes), utilisé uniquement dans le navigateur.
 *
 * Sans les variables d'environnement, `supabaseDisponible` vaut false et
 * l'application reste entièrement locale.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Distant, EcritureJour, LigneJour, LigneProfil } from "./sync";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseDisponible = Boolean(URL_SUPABASE && CLE_PUBLIQUE);

let client: SupabaseClient | null = null;

/** Client unique, ou null côté serveur et si Supabase n'est pas configuré. */
export function clientSupabase(): SupabaseClient | null {
  if (!supabaseDisponible || typeof window === "undefined") return null;
  client ??= createClient(URL_SUPABASE!, CLE_PUBLIQUE!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

function requis(): SupabaseClient {
  const c = clientSupabase();
  if (!c) throw new Error("Supabase n'est pas configuré.");
  return c;
}

/** Lève l'erreur Supabase (réseau, droits…) au lieu de la renvoyer. */
function verifier<T>(reponse: { data: T | null; error: unknown }): T {
  if (reponse.error) throw reponse.error;
  return reponse.data as T;
}

const COLONNES_JOUR = "date, data, modifie_le, synchro_le";
const TAILLE_PAGE = 1000; // limite par défaut d'une réponse Supabase
const TAILLE_LOT = 200;

/** Tables `jours` et `profils` (voir supabase/migrations/0001_init.sql). */
export function distantSupabase(): Distant {
  return {
    async utilisateur() {
      const c = clientSupabase();
      if (!c) return null;
      const { data, error } = await c.auth.getSession();
      if (error) throw error;
      return data.session?.user.id ?? null;
    },

    async lireJours(depuis) {
      const lignes: LigneJour[] = [];
      for (let debut = 0; ; debut += TAILLE_PAGE) {
        let requete = requis().from("jours").select(COLONNES_JOUR);
        if (depuis) requete = requete.gt("synchro_le", depuis);
        const page = verifier<LigneJour[]>(
          await requete
            .order("synchro_le", { ascending: true })
            .order("date", { ascending: true })
            .range(debut, debut + TAILLE_PAGE - 1),
        );
        lignes.push(...page);
        if (page.length < TAILLE_PAGE) return lignes;
      }
    },

    async lireJoursDates(dates) {
      if (dates.length === 0) return [];
      return verifier<LigneJour[]>(await requis().from("jours").select(COLONNES_JOUR).in("date", dates));
    },

    async lireProfil() {
      return verifier<LigneProfil | null>(await requis().from("profils").select("date_debut, modifie_le").maybeSingle());
    },

    async ecrireJours(uid, lignes: EcritureJour[]) {
      const acceptees = new Set<string>();
      for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
        const lot = lignes.slice(i, i + TAILLE_LOT).map((l) => ({ user_id: uid, ...l }));
        // Les lignes refusées par le trigger (version plus ancienne que celle du serveur) ne sont pas renvoyées.
        const ecrites = verifier<{ date: string }[]>(
          await requis().from("jours").upsert(lot, { onConflict: "user_id,date" }).select("date"),
        );
        for (const r of ecrites) acceptees.add(r.date);
      }
      return acceptees;
    },

    async ecrireProfil(uid, profil) {
      const ecrites = verifier<{ user_id: string }[]>(
        await requis()
          .from("profils")
          .upsert({ user_id: uid, ...profil }, { onConflict: "user_id" })
          .select("user_id"),
      );
      return ecrites.length > 0;
    },

    async viderTout(uid, modifie_le) {
      verifier(await requis().from("jours").update({ data: {}, modifie_le }).eq("user_id", uid));
    },

    async deconnecter() {
      const { error } = await requis().auth.signOut({ scope: "local" });
      if (error) throw error;
    },
  };
}
