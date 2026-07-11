-- =============================================
-- SpeakUp CI — Database Setup
-- Coller dans Supabase SQL Editor et exécuter
-- =============================================

-- 1. Table des profils utilisateurs
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('admin', 'learner', 'parent')),
  level text check (level in ('beginner', 'beginner-intermediate', 'intermediate', 'intermediate-advanced', 'advanced')),
  interests text[] default '{}',
  parent_id uuid references public.profiles(id),
  approved boolean default false,
  created_at timestamptz default now()
);

-- 2. Table de progression par module
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  module_id text not null,
  percentage integer default 0 check (percentage >= 0 and percentage <= 100),
  updated_at timestamptz default now(),
  unique(user_id, module_id)
);

-- 3. Table des sessions de conversation
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  module_id text not null,
  module_title text not null,
  duration integer default 0, -- en secondes
  created_at timestamptz default now()
);

-- 4. Table de l'historique de conversation (par module)
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  module_id text not null,
  messages jsonb default '[]',
  updated_at timestamptz default now(),
  unique(user_id, module_id)
);

-- =============================================
-- Row Level Security (RLS) — données isolées
-- =============================================

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.sessions enable row level security;
alter table public.conversations enable row level security;

-- PROFILES: chaque utilisateur voit son propre profil
create policy "users see own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- PROFILES: admin voit tous les profils
create policy "admin sees all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- PROFILES: parent voit ses enfants
create policy "parent sees children"
  on public.profiles for select
  using (
    parent_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- PROFILES: insertion lors de l'inscription
create policy "users create own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- PROFILES: mise à jour de son propre profil
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- PROFILES: admin peut tout modifier
create policy "admin updates any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- PROGRESS: apprenant voit sa propre progression
create policy "users see own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "users upsert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "users update own progress"
  on public.progress for update
  using (auth.uid() = user_id);

-- PROGRESS: admin et parent voient la progression
create policy "admin sees all progress"
  on public.progress for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'parent')
    )
  );

-- SESSIONS: apprenant voit ses sessions
create policy "users see own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "users insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- SESSIONS: admin et parent voient les sessions
create policy "admin sees all sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'parent')
    )
  );

-- CONVERSATIONS: apprenant voit ses conversations
create policy "users see own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "users upsert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "users update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

-- =============================================
-- Créer le compte admin (Camara)
-- IMPORTANT: remplace l'email et le UUID ci-dessous
-- après avoir créé ton compte admin via l'interface
-- =============================================
-- (à exécuter APRÈS avoir créé le compte admin)
-- update public.profiles set role = 'admin', approved = true
-- where id = 'TON-UUID-ICI';
