-- A person checking a tree the app asked about: two photos (the whole tree,
-- then its leaves) and an answer to "is it the same tree as expected?".
--
-- Tree ids are external יע"ד ids stored as text, with no foreign key (see
-- 20261125120000_tree_reports.sql).

create table if not exists public.tree_verifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,

  tree_id text check (tree_id is null or length(tree_id) between 1 and 100),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),

  -- What the dataset said the tree was when the person was asked, as its
  -- scientific name. Kept here so the collection does not depend on the
  -- trees table, and so a later fix to the dataset does not rewrite history.
  species text check (species is null or length(species) <= 200),
  street text check (street is null or length(street) <= 200),

  answer text not null
    check (answer in ('same', 'different', 'not_sure', 'no_tree')),

  -- Paths inside the Storage bucket, from POST /api/uploads.
  tree_photo_path text,
  leaves_photo_path text,

  created_at timestamptz not null default now(),

  constraint tree_verifications_lat_lng_together
    check ((lat is null) = (lng is null)),
  constraint tree_verifications_has_place
    check (tree_id is not null or lat is not null),
  -- Every answer but "no tree here" comes with a photo of the tree.
  constraint tree_verifications_photo_unless_no_tree
    check (answer = 'no_tree' or tree_photo_path is not null)
);

create index if not exists tree_verifications_user_id_created_at_idx
  on public.tree_verifications (user_id, created_at desc);

create index if not exists tree_verifications_tree_id_idx
  on public.tree_verifications (tree_id)
  where tree_id is not null;

alter table public.tree_verifications enable row level security;
