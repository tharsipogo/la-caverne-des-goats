-- ============================================================
-- La Caverne des Goats — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('text','image','audio')),
  tier_labels jsonb not null default '["S","A","B","C","D","E"]',
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  name text not null,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

create table if not exists tier_assignments (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  tier text not null,
  position integer not null default 0,
  unique (list_id, item_id)
);

create index if not exists items_list_id_idx on items(list_id);
create index if not exists tier_assignments_list_id_idx on tier_assignments(list_id);

-- RLS activée, mais ouverte à tous (usage perso / entre amis, pas de compte).
-- Si tu déploies un jour publiquement, restreins ces policies.
alter table lists enable row level security;
alter table items enable row level security;
alter table tier_assignments enable row level security;

drop policy if exists "public all lists" on lists;
create policy "public all lists" on lists for all using (true) with check (true);

drop policy if exists "public all items" on items;
create policy "public all items" on items for all using (true) with check (true);

drop policy if exists "public all tier_assignments" on tier_assignments;
create policy "public all tier_assignments" on tier_assignments for all using (true) with check (true);

-- ============================================================
-- Storage : crée en plus, à la main, un bucket nommé "item-images"
-- (Storage > New bucket > "item-images" > Public bucket : coché)
--
-- Rendre le bucket "public" permet de LIRE les images via leur URL,
-- mais l'upload (INSERT) reste bloqué par la RLS de storage.objects
-- tant qu'aucune policy ne l'autorise explicitement. D'où l'erreur
-- "new row violates row-level security policy" pendant l'upload.
-- Les policies ci-dessous l'autorisent, pour ce bucket uniquement.
-- ============================================================

drop policy if exists "public read item-images" on storage.objects;
create policy "public read item-images"
on storage.objects for select
using (bucket_id = 'item-images');

drop policy if exists "public upload item-images" on storage.objects;
create policy "public upload item-images"
on storage.objects for insert
with check (bucket_id = 'item-images');

drop policy if exists "public update item-images" on storage.objects;
create policy "public update item-images"
on storage.objects for update
using (bucket_id = 'item-images');

drop policy if exists "public delete item-images" on storage.objects;
create policy "public delete item-images"
on storage.objects for delete
using (bucket_id = 'item-images');

-- ============================================================
-- Storage : crée aussi un bucket nommé "item-audio" (Public bucket coché)
-- pour les extraits du mode Blind Test.
-- ============================================================

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
