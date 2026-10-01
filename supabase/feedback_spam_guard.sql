-- Feedback spam guard (applied to the live Supabase project as the
-- migration "feedback_spam_guard"). Kept here so the team can see the rules.
-- The game client also checks these, but the database is the real guard:
-- anyone can call the REST API directly with the publishable key.

alter table public.feedback add column if not exists sender text;

alter table public.feedback drop constraint if exists feedback_message_check;
alter table public.feedback add constraint feedback_message_check
  check (char_length(btrim(message)) between 5 and 2000);

create index if not exists feedback_sender_time on public.feedback (sender, created_at);
create index if not exists feedback_time on public.feedback (created_at);

-- The sender is a hash of the address, never the address itself.
create or replace function public.feedback_spam_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  addr text := coalesce(nullif(btrim(split_part(headers->>'x-forwarded-for', ',', 1)), ''), headers->>'cf-connecting-ip', 'unknown');
begin
  new.sender := encode(digest(addr || ':emberline-feedback', 'sha256'), 'hex');
  new.created_at := now();
  -- One sender: at most 3 a minute and 20 a day.
  if (select count(*) from feedback where sender = new.sender and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Too much feedback at once: please wait a minute.' using errcode = 'P0001';
  end if;
  if (select count(*) from feedback where sender = new.sender and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Daily feedback limit reached. Thank you!' using errcode = 'P0001';
  end if;
  -- The same message again within a day.
  if exists (select 1 from feedback where lower(btrim(message)) = lower(btrim(new.message)) and created_at > now() - interval '1 day') then
    raise exception 'That feedback was already sent.' using errcode = 'P0001';
  end if;
  -- Mostly links.
  if (select count(*) from regexp_matches(new.message, 'https?://|www\.', 'gi')) > 2 then
    raise exception 'Too many links in one message.' using errcode = 'P0001';
  end if;
  -- Everyone together: at most 60 in 10 minutes.
  if (select count(*) from feedback where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Feedback is busy right now: please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $function$;

revoke all on function public.feedback_spam_guard() from public, anon, authenticated;

drop trigger if exists feedback_spam_guard on public.feedback;
create trigger feedback_spam_guard before insert on public.feedback
  for each row execute function public.feedback_spam_guard();
