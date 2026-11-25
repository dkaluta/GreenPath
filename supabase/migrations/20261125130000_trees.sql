-- Street trees from יער עירוני דיגיטלי (ODbL), for the pilot city.
--
-- GET /api/trees serves the same trees from a file bundled with the Worker
-- (server/data/givatayim-trees.json), so the map works without a database.
-- This table is here so reports and tree verifications can refer to a tree
-- by its id. Fill it with supabase/seed-trees.sql, which
-- `npm run pilot:build` writes. See docs/06-shade-routing.markdown.

create table if not exists public.trees (
  -- The יע"ד tree id: an Open Location Code of where the tree stands.
  id text primary key,
  lng double precision not null,
  lat double precision not null,
  species_he text,
  species_en text,
  genus text,
  height_m real,
  canopy_m2 real,
  -- 'survey' (counted by a city) or 'canopy' (from the national canopy map).
  source text not null check (source in ('survey', 'canopy')),
  -- Which pilot area the row came from, e.g. 'givatayim'.
  area text not null,
  created_at timestamptz not null default now()
);

create index if not exists trees_lat_lng_idx on public.trees (lat, lng);

-- RLS on with no policies, like every table: only the server reads it.
alter table public.trees enable row level security;
