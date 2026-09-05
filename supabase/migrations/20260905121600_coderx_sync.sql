-- coderX cross-device sync.
--
-- Henry plays on a shared family computer and on his dad's phone. Without this
-- those are two separate games: different XP, different stickers, a different
-- streak.
--
-- The Supabase GitHub integration applies this on push to main, so the
-- filename must carry the <timestamp>_name.sql prefix the CLI expects — a
-- plain 0001_ prefix is not picked up.
--
-- Every statement is idempotent. This schema was first applied by hand while
-- the project was being set up, so the integration will run it again against a
-- database that already has it, and must find nothing to do.

create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  hq_name    text not null default '',
  avatar     text not null default 'sniff',
  -- PBKDF2 of the four-emoji code. Never plaintext, never returned to a client.
  pin_hash   text not null,
  pin_salt   text not null,
  created_at timestamptz not null default now()
);

create table if not exists progress (
  profile_id uuid primary key references profiles(id) on delete cascade,
  -- The whole ProgressState. The merge already works on whole states, one child
  -- makes a few kilobytes, and adding a field needs no migration.
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Append-only. The raw record of what he did; see docs/memory-loop.md. Nothing
-- reads this back yet, on purpose: record for a while, check the model against
-- what Ben already knows about his own son, and only then wire it into Bolt.
create table if not exists observations (
  id         bigserial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  at         timestamptz not null default now(),
  nz_day     date not null,          -- Pacific/Auckland, like everything else
  kind       text not null,
  level_id   text,
  skill_ids  text[],
  payload    jsonb not null default '{}'
);

create index if not exists observations_profile_day on observations (profile_id, nz_day);

-- RLS on, and deliberately NO policies: every read and write goes through a
-- server route holding the service-role key, which bypasses RLS. That means a
-- leaked anon key reads nothing at all.
alter table profiles     enable row level security;
alter table progress     enable row level security;
alter table observations enable row level security;
