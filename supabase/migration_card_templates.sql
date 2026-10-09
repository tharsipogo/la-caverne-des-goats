-- ============================================================
-- Migration : modèles de carte (design commun par base, réutilisable
-- plus tard dans n'importe quel jeu de cartes)
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

create table if not exists card_templates (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  name text not null default 'Modèle par défaut',
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une base n'a qu'un seul modèle actif pour l'instant (la page éditeur
-- fait un upsert dessus) — simple à étendre plus tard si on veut
-- plusieurs modèles par base.
create unique index if not exists card_templates_list_id_uidx on card_templates(list_id);

alter table card_templates enable row level security;

drop policy if exists "public all card_templates" on card_templates;
create policy "public all card_templates" on card_templates for all using (true) with check (true);
