-- ============================================================
-- Migration : validation des cartes + couleur personnalisable par
-- carte, pour le "deck de cartes" d'une base.
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

-- Une image n'entre dans le deck de cartes d'un jeu qu'une fois
-- validée ici (le deck se construit progressivement, item par item).
alter table items add column if not exists card_validated boolean not null default false;

-- Surcharge de couleur propre à CETTE carte (null = hérite des
-- couleurs par défaut du deck, définies dans card_templates).
alter table items add column if not exists card_accent_color text;
alter table items add column if not exists card_name_color text;
