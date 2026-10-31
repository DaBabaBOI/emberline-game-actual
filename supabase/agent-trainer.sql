-- The trainer for Elder Ama and the villagers (supabase/functions/agent-trainer).
-- Already applied to the project; kept here so the setup can be rebuilt.
--
-- ai_prompts: the bank of things players might say (seeded by hand, grown by
--   the trainer every run). ai_towns: real towns from the game engine.
-- ai_practice: every practice answer and its grade (0-10).
-- ai_lessons: short, general lessons the trainer wrote, each with its blind
--   exam; the active ones are added to the rules by clever-endpoint.
-- ai_examples: the first trainer's worked examples (no longer used: they made
--   the answers samey; kept for the record, all inactive).
-- ai_trainer: on/off, how many runs, the last run's summary, and the random
--   key pg_cron sends to the trainer.
-- ai_training_progress: answers and the average grade, by day.
--
-- Stop training:   update public.ai_trainer set enabled = false;
-- Unschedule it:   select cron.unschedule('agent-trainer');
-- See progress:    select * from public.ai_training_progress;
-- What it learned: select agent, text, active, exam->'won', exam->'lost' from public.ai_lessons order by id desc;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.ai_prompts (
  id bigint generated always as identity primary key,
  agent text not null check (agent in ('ama', 'villager')),
  text text not null,
  text_key text generated always as (lower(btrim(text))) stored,
  source text not null default 'seed',
  used int not null default 0,
  created_at timestamptz not null default now(),
  unique (agent, text_key)
);
create table if not exists public.ai_towns (
  id bigint generated always as identity primary key,
  era int not null,
  town text not null,
  village text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_practice (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  agent text not null,
  prompt text not null,
  era int,
  answer text,
  scores jsonb,
  total real,
  note text,
  model text
);
create table if not exists public.ai_examples (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  agent text not null,
  prompt text not null,
  answer text not null,
  total real not null,
  active boolean not null default true,
  practice_id bigint references public.ai_practice(id) on delete set null
);
create index if not exists ai_examples_live on public.ai_examples (agent) where active;
create table if not exists public.ai_lessons (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  agent text not null check (agent in ('ama', 'villager')),
  text text not null,
  active boolean not null default false,
  wins int not null default 0,
  exam jsonb
);
create index if not exists ai_lessons_live on public.ai_lessons (agent) where active;
create table if not exists public.ai_trainer (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  runs int not null default 0,
  last_run timestamptz,
  last_summary jsonb,
  token text not null default encode(extensions.gen_random_bytes(24), 'hex')
);
insert into public.ai_trainer (id) values (1) on conflict (id) do nothing;

-- Only the service role (the edge functions) reads and writes these.
alter table public.ai_prompts enable row level security;
alter table public.ai_towns enable row level security;
alter table public.ai_practice enable row level security;
alter table public.ai_examples enable row level security;
alter table public.ai_lessons enable row level security;
alter table public.ai_trainer enable row level security;

create or replace view public.ai_training_progress with (security_invoker = true) as
  select agent, date_trunc('day', created_at) as day, count(*) as answers, round(avg(total)::numeric, 2) as avg_grade
  from public.ai_practice group by 1, 2 order by 2 desc, 1;

-- Every two hours (at 23 past).
select cron.schedule(
  'agent-trainer',
  '23 */2 * * *',
  $job$
  select net.http_post(
    url := 'https://lgfrxrnjexdcjhpwztpy.supabase.co/functions/v1/agent-trainer',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-trainer-key', (select token from public.ai_trainer where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $job$
);
