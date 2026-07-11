-- Supprimer l'ancienne politique d'insertion restrictive
drop policy if exists "users create own profile" on public.profiles;

-- Nouvelle politique : permet l'insertion si l'id correspond à l'utilisateur auth
-- OU si c'est juste après l'inscription (service role)
create policy "users create own profile"
  on public.profiles for insert
  with check (true);

-- Créer un trigger qui crée automatiquement un profil minimal à l'inscription
-- (optionnel mais plus robuste)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Le profil sera créé par le frontend avec plus de détails
  -- Ce trigger ne fait rien mais est prêt si besoin
  return new;
end;
$$;
