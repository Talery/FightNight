create table if not exists public.leaderboard (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  epithet text not null check (char_length(epithet) between 1 and 100),
  level integer not null check (level between 1 and 999),
  score integer not null check (score between 0 and 2147483647),
  victories integer not null check (victories between 0 and 2147483647),
  player_id text not null default 'legacy',
  verification_state text not null default 'unverified' check (verification_state in ('unverified', 'verified')),
  balance_version text not null default 'legacy',
  died_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.leaderboard add column if not exists player_id text not null default 'legacy';
alter table public.leaderboard add column if not exists verification_state text not null default 'unverified' check (verification_state in ('unverified', 'verified'));
alter table public.leaderboard add column if not exists balance_version text not null default 'legacy';
alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard is public to read" on public.leaderboard;
create policy "leaderboard is public to read"
  on public.leaderboard for select
  using (true);

drop policy if exists "anonymous runs may be submitted" on public.leaderboard;
create policy "anonymous runs may be submitted"
  on public.leaderboard for insert
  with check (verification_state = 'unverified');

drop policy if exists "a run may only improve its own score" on public.leaderboard;

create index if not exists leaderboard_score_idx on public.leaderboard (score desc);

create table if not exists public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  day date not null,
  seed text not null,
  action_hash text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now(),
  unique (player_id, day)
);

alter table public.daily_runs enable row level security;
drop policy if exists "daily runs are public to read" on public.daily_runs;
create policy "daily runs are public to read" on public.daily_runs for select using (true);

-- Verified daily results are written only by the verify-daily Edge Function with
-- the service role. The browser receives SELECT access and cannot self-verify.
create table if not exists public.verified_daily_runs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  player_id text not null check (char_length(player_id) between 12 and 100),
  day date not null,
  season_id text not null,
  ruleset_version text not null,
  seed bigint not null check (seed between 0 and 4294967295),
  journal_hash text not null check (journal_hash ~ '^[a-f0-9]{64}$'),
  score integer not null check (score between 0 and 2147483647),
  outcome text not null check (outcome in ('victory', 'death')),
  action_count integer not null check (action_count between 1 and 10000),
  verified_at timestamptz not null default now(),
  unique (player_id, day, ruleset_version)
);

alter table public.verified_daily_runs enable row level security;
drop policy if exists "verified daily runs are public to read" on public.verified_daily_runs;
create policy "verified daily runs are public to read"
  on public.verified_daily_runs for select using (true);

create index if not exists verified_daily_day_score_idx on public.verified_daily_runs (day desc, score desc);
create index if not exists verified_daily_season_score_idx on public.verified_daily_runs (season_id, score desc);

create table if not exists public.daily_rate_limits (
  player_id text not null,
  window_start timestamptz not null,
  requests integer not null default 1,
  primary key (player_id, window_start)
);
alter table public.daily_rate_limits enable row level security;

create or replace function public.claim_daily_verification_slot(p_player_id text, p_limit integer default 8)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := date_trunc('hour', now());
  current_requests integer;
begin
  insert into public.daily_rate_limits(player_id, window_start, requests)
  values (p_player_id, bucket, 1)
  on conflict (player_id, window_start)
  do update set requests = public.daily_rate_limits.requests + 1
  returning requests into current_requests;
  return current_requests <= p_limit;
end;
$$;

revoke all on function public.claim_daily_verification_slot(text, integer) from public, anon, authenticated;
grant execute on function public.claim_daily_verification_slot(text, integer) to service_role;

create or replace view public.current_daily_leaderboard as
select player_id, day, score, outcome, action_count, ruleset_version, verified_at,
       dense_rank() over (partition by day, ruleset_version order by score desc) as rank
from public.verified_daily_runs;

create or replace view public.season_leaderboard as
select player_id, season_id, sum(score)::bigint as score, count(*)::integer as verified_runs,
       dense_rank() over (partition by season_id order by sum(score) desc) as rank
from public.verified_daily_runs
group by player_id, season_id;
