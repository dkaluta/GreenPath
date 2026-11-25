-- A finished walk, for the summary screen.

create table if not exists public.walks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,

  distance_m integer not null check (distance_m between 0 and 200000),
  steps integer not null check (steps between 0 and 500000),
  -- 0 to 1. Null when there was no shade data for the route.
  shade_share real check (shade_share is null or shade_share between 0 and 1),

  started_at timestamptz not null,
  ended_at timestamptz not null,

  -- Counted by the server from tree_verifications between started_at and
  -- ended_at, never taken from the request.
  trees_verified integer not null default 0 check (trees_verified >= 0),

  created_at timestamptz not null default now(),

  constraint walks_ends_after_start check (ended_at >= started_at)
);

create index if not exists walks_user_id_ended_at_idx
  on public.walks (user_id, ended_at desc);

alter table public.walks enable row level security;
