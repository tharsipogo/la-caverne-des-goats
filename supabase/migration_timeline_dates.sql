-- ============================================================
-- Migration : date (mois + année) de chaque item, utilisée par le jeu
-- Timeline pour ordonner les cartes dans la frise chronologique.
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

-- Année de l'événement / de l'item (null = pas de date : l'item est
-- simplement ignoré par le jeu Timeline).
alter table items add column if not exists timeline_year integer;

-- Mois (1 = janvier ... 12 = décembre), optionnel : sans mois, deux items
-- de la même année sont considérés comme interchangeables dans la frise.
alter table items add column if not exists timeline_month smallint
  check (timeline_month between 1 and 12);
