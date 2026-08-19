-- ============================================================
-- Migration : image de couverture personnalisable pour chaque base
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée)
-- ============================================================

alter table lists add column if not exists cover_image_url text;
