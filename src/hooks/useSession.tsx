"use client";

import type { AuthError, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clientSupabase, supabaseDisponible } from "@/lib/supabase";

interface ContexteSession {
  /** Supabase est configuré : la connexion et la synchronisation sont possibles. */
  disponible: boolean;
  /** La session enregistrée sur l'appareil a été lue. */
  pret: boolean;
  utilisateur: User | null;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  /** "confirmation" si un e-mail de confirmation doit être validé avant de se connecter. */
  inscription: (email: string, motDePasse: string) => Promise<"connecte" | "confirmation">;
}

const Contexte = createContext<ContexteSession | null>(null);

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed: "Confirmez d'abord votre adresse avec le lien reçu par e-mail.",
  user_already_exists: "Un compte existe déjà avec cet e-mail : connectez-vous.",
  email_exists: "Un compte existe déjà avec cet e-mail : connectez-vous.",
  weak_password: "Mot de passe trop faible (6 caractères minimum).",
  validation_failed: "Adresse e-mail invalide.",
  email_address_invalid: "Adresse e-mail invalide.",
  over_request_rate_limit: "Trop de tentatives. Réessayez dans quelques minutes.",
  over_email_send_rate_limit: "Trop d'e-mails envoyés. Réessayez dans quelques minutes.",
  signup_disabled: "La création de compte est désactivée.",
};

function message(erreur: AuthError): string {
  if (erreur.code && MESSAGES[erreur.code]) return MESSAGES[erreur.code];
  if (/fetch|network/i.test(erreur.message)) return "Connexion impossible : vérifiez votre accès à Internet.";
  return erreur.message;
}

function client() {
  const c = clientSupabase();
  if (!c) throw new Error("La synchronisation n'est pas configurée.");
  return c;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [pret, setPret] = useState(!supabaseDisponible);

  useEffect(() => {
    const c = clientSupabase();
    if (!c) return;
    // Émet aussi la session déjà enregistrée (INITIAL_SESSION).
    const { data } = c.auth.onAuthStateChange((_evenement, session) => {
      setUtilisateur(session?.user ?? null);
      setPret(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    if (error) throw new Error(message(error));
  }, []);

  const inscription = useCallback(async (email: string, motDePasse: string) => {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(message(error));
    return data.session ? ("connecte" as const) : ("confirmation" as const);
  }, []);

  const valeur = useMemo(
    () => ({ disponible: supabaseDisponible, pret, utilisateur, connexion, inscription }),
    [pret, utilisateur, connexion, inscription],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): ContexteSession {
  const ctx = useContext(Contexte);
  if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>.");
  return ctx;
}
