-- ============================================================
-- Migration : ajout du support audio pour le mode Blind Test
-- À coller dans Supabase > SQL Editor > New query > Run
-- (à exécuter une seule fois sur une base déjà créée avec l'ancien schema.sql)
-- ============================================================

-- 1. Autoriser le type 'audio' pour les bases
alter table lists drop constraint if exists lists_type_check;
alter table lists add constraint lists_type_check check (type in ('text','image','audio'));

-- 2. Colonne pour stocker l'URL de l'extrait audio
alter table items add column if not exists audio_url text;

-- 3. Policies pour le nouveau bucket "item-audio"
-- (crée-le d'abord à la main : Storage > New bucket > "item-audio" > Public bucket coché)

drop policy if exists "public read item-audio" on storage.objects;
create policy "public read item-audio"
on storage.objects for select
using (bucket_id = 'item-audio');

drop policy if exists "public upload item-audio" on storage.objects;
create policy "public upload item-audio"
on storage.objects for insert
with check (bucket_id = 'item-audio');

drop policy if exists "public update item-audio" on storage.objects;
create policy "public update item-audio"
on storage.objects for update
using (bucket_id = 'item-audio');

drop policy if exists "public delete item-audio" on storage.objects;
create policy "public delete item-audio"
on storage.objects for delete
using (bucket_id = 'item-audio');
