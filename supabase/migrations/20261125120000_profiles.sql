-- One row per person: their pseudonymous username, and nothing else.
-- See "Usernames are pseudonymous" in docs/00-product.markdown.
--
-- Sign-in is a passkey (Supabase Auth, docs/02-supabase-setup.markdown). The
-- email a person gives at sign-up lives only in auth.users and is used only to
-- recover the account. It is never copied here.
--
-- The server creates the row the first time the person calls GET /api/me,
-- with a generated username (shared/schemas/profile.ts).

create table if not exists public.profiles (
  -- The same id as the Supabase Auth user. Deleting the user deletes this.
  id uuid primary key references auth.users (id) on delete cascade,

  -- The same rule as usernameSchema in shared/schemas/profile.ts: two to four
  -- lowercase English words, one space apart, at most 40 characters. Change
  -- both together.
  username text not null
    check (char_length(username) <= 40)
    check (username ~ '^[a-z]+( [a-z]+){1,3}$'),

  created_at timestamptz not null default now()
);

-- Two people can never share a username. When the generator picks one that is
-- taken, the insert fails with a unique violation and the server picks again.
create unique index if not exists profiles_username_key
  on public.profiles (username);

-- Row Level Security on, with no policies: only the server (secret key) can
-- read or write. Same rule as every other table; see the events migration.
alter table public.profiles enable row level security;
