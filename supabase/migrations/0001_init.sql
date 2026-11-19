-- Suivi sport & paris : stockage en ligne et synchronisation entre appareils.
-- À exécuter une fois dans Supabase → SQL Editor (ou `supabase db push`).

-- Un jour saisi par ligne : deux appareils peuvent modifier des jours différents sans conflit.
create table if not exists public.jours (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  data jsonb not null,                              -- un `Jour` (src/lib/types.ts) ; {} = jour vidé
  modifie_le timestamptz not null,                  -- heure de la saisie (appareil) : la plus récente gagne
  synchro_le timestamptz not null default now(),    -- heure du serveur : curseur de synchronisation
  primary key (user_id, date)
);

create index if not exists jours_synchro_idx on public.jours (user_id, synchro_le);

-- Réglages du compte (date de début de la période suivie).
create table if not exists public.profils (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  date_debut date not null,
  modifie_le timestamptz not null,
  synchro_le timestamptz not null default now()
);

-- Une version plus ancienne que celle déjà enregistrée est ignorée ; sinon le curseur avance.
create or replace function public.avant_maj_synchro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.modifie_le < old.modifie_le then
    return null;
  end if;
  new.synchro_le := now();
  return new;
end;
$$;

drop trigger if exists jours_avant_maj on public.jours;
create trigger jours_avant_maj
  before update on public.jours
  for each row execute function public.avant_maj_synchro();

drop trigger if exists profils_avant_maj on public.profils;
create trigger profils_avant_maj
  before update on public.profils
  for each row execute function public.avant_maj_synchro();

-- Chaque utilisateur n'accède qu'à ses propres lignes.
alter table public.jours enable row level security;
alter table public.profils enable row level security;

drop policy if exists "jours du propriétaire" on public.jours;
create policy "jours du propriétaire" on public.jours
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profil du propriétaire" on public.profils;
create policy "profil du propriétaire" on public.profils
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.jours, public.profils to authenticated;
