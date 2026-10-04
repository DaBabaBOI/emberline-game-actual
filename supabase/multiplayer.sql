-- Multiplayer (applied to the live Supabase project). Kept here so the team can
-- see the rules. Anyone may read rooms, seats and events; every write goes
-- through an mp_* function that checks the player's secret, and secrets are
-- never readable. Nothing is ever deleted: leaving marks a seat gone, the host
-- leaving a lobby ends the room, and rooms older than a day are ignored.
-- (The older rooms/players/turn_log tables are an unused turn-based prototype
-- with open write rules; they can be dropped.)

create table public.mp_rooms (
  code text primary key check (code ~ '^[A-Z]{4}$'),
  mode text not null check (mode in ('race', 'coop')),
  speed text not null check (speed in ('quick', 'normal', 'long')),
  seed integer not null,
  listed boolean not null default true,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'done')),
  host_name text not null check (char_length(host_name) between 1 and 24),
  sender text,  -- hash of the creator's address, for the rate limit
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ends_at timestamptz
);
create table public.mp_players (
  id uuid primary key default gen_random_uuid(),
  room text not null references public.mp_rooms(code) on delete cascade,
  seat integer not null check (seat between 0 and 3),
  name text not null check (char_length(name) between 1 and 24),
  secret uuid not null default gen_random_uuid(),
  xp integer not null default 0, era integer not null default 0,
  sustainability integer not null default 100, population integer not null default 0,
  gone boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (room, seat)
);
create table public.mp_events (
  id bigserial primary key,
  room text not null references public.mp_rooms(code) on delete cascade,
  from_seat integer not null check (from_seat between 0 and 3),
  to_seat integer not null check (to_seat between -1 and 3),
  kind text not null check (kind in ('gift', 'raid', 'loot', 'chat')),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) < 1500),
  created_at timestamptz not null default now()
);
-- RLS on, select-only policies, no direct writes, and column grants that hide
-- `secret` and `sender`.
-- Functions (security definer): mp_create_room(mode, speed, listed, name)
-- (5 rooms per 10 minutes per address), mp_join_room(code, name),
-- mp_start_room(player, secret) (host only; 15/25/40 minutes),
-- mp_update_player(player, secret, xp, era, sustainability, population)
-- (clamped), mp_send_event(player, secret, to, kind, payload) (20 a minute),
-- mp_leave_room(player, secret). mp_sender() is internal.
