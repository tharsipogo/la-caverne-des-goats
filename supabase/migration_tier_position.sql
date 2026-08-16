-- ============================================================
-- Migration : ordre des items au sein d'une ligne de Tier List
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

alter table tier_assignments add column if not exists position integer not null default 0;
