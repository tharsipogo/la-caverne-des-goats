-- ============================================================
-- Migration : recadrage/zoom de l'image de chaque item, utilisé par
-- le système de cartes (<GameCard>) pour permettre de repositionner
-- et agrandir/rétrécir l'illustration dans la zone image, sans avoir
-- à retoucher le fichier image lui-même.
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

-- Position du centre du cadrage, en % de l'image (0 = bord gauche/haut,
-- 100 = bord droit/bas). 50/50 = centré, comme avant cette migration.
alter table items add column if not exists image_crop_x numeric not null default 50;
alter table items add column if not exists image_crop_y numeric not null default 50;

-- Facteur de zoom (1 = image affichée telle quelle dans la zone, cf.
-- object-fit: cover ; >1 = agrandie/recadrée davantage).
alter table items add column if not exists image_zoom numeric not null default 1;
