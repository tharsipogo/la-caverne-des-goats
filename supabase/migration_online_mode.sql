-- ============================================================
-- La Caverne des Goats — Migration : Mode en ligne (salons)
-- À coller dans Supabase > SQL Editor > New query > Run
-- Sûr à exécuter même si ces tables existent déjà (IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS partout).
-- ============================================================

-- Comptes (créés via "Créer un compte", pas les invités)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  username text unique not null,
  avatar_url text,
  pin text,
  online_wins integer not null default 0,
  games_played integer not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists pin text;
alter table profiles add column if not exists online_wins integer not null default 0;
alter table profiles add column if not exists games_played integer not null default 0;

-- Salons
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id text not null,
  status text not null default 'lobby' check (status in ('lobby','in_game','finished')),
  current_game text,
  created_at timestamptz not null default now()
);

-- Joueurs d'un salon (persistent tant que le salon existe, score cumulé
-- entre les différentes parties jouées dans ce salon)
create table if not exists session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  user_id text not null,
  name text not null,
  avatar_url text,
  is_approved boolean not null default true,
  joined_current_game boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table session_players add column if not exists joined_current_game boolean not null default false;

-- Base de mots pour "Soit connecté"
create table if not exists soit_connecte_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  created_at timestamptz not null default now()
);

-- RLS ouverte (app entre amis, cohérent avec le reste du projet)
alter table profiles enable row level security;
alter table game_sessions enable row level security;
alter table session_players enable row level security;
alter table soit_connecte_words enable row level security;

drop policy if exists "public all profiles" on profiles;
create policy "public all profiles" on profiles for all using (true) with check (true);

drop policy if exists "public all game_sessions" on game_sessions;
create policy "public all game_sessions" on game_sessions for all using (true) with check (true);

drop policy if exists "public all session_players" on session_players;
create policy "public all session_players" on session_players for all using (true) with check (true);

drop policy if exists "public all soit_connecte_words" on soit_connecte_words;
create policy "public all soit_connecte_words" on soit_connecte_words for all using (true) with check (true);
