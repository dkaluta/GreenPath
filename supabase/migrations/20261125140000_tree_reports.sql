-- Reports people send while walking: a tree that is missing from the map, a
-- tree on the map that is gone, or a damaged tree.
--
-- Tree ids are the external ids from the יער עירוני דיגיטלי (יע"ד) dataset,
-- stored as text. There is deliberately no foreign key to a trees table, so
-- this table does not depend on how (or whether) the trees are imported.

create table if not exists public.tree_reports (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null
    check (kind in ('missing_from_map', 'gone', 'damaged')),

  -- The tree on the map this is about, if any. A tree missing from the map
  -- has no id yet, so it is located by lat/lng instead.
  tree_id text check (tree_id is null or length(tree_id) between 1 and 100),

  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),

  -- The street name, for counting the streets a person helped.
  street text check (street is null or length(street) <= 200),

  -- Damaged trees go to the municipality and are NOT drawn on the map. These
  -- follow from `kind`, so they are computed rather than sent.
  send_to_municipality boolean generated always as (kind = 'damaged') stored,
  show_on_map boolean generated always as (kind <> 'damaged') stored,

  created_at timestamptz not null default now(),

  -- Either both coordinates or neither.
  constraint tree_reports_lat_lng_together
    check ((lat is null) = (lng is null)),
  -- A report has to point somewhere.
  constraint tree_reports_has_place
    check (tree_id is not null or lat is not null)
);

create index if not exists tree_reports_user_id_created_at_idx
  on public.tree_reports (user_id, created_at desc);

-- For the municipality export: the damaged reports, newest first.
create index if not exists tree_reports_municipality_idx
  on public.tree_reports (created_at desc)
  where send_to_municipality;

-- RLS on, no policies: all access goes through the server. See
-- 20260921120000_events.sql and docs/02-supabase-setup.markdown.
alter table public.tree_reports enable row level security;
