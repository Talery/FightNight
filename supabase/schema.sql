create table if not exists public.leaderboard (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  epithet text not null check (char_length(epithet) between 1 and 100),
  level integer not null check (level between 1 and 999),
  score integer not null check (score between 0 and 2147483647),
  victories integer not null check (victories between 0 and 2147483647),
  died_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

create policy "leaderboard is public to read"
  on public.leaderboard for select
  using (true);

create policy "anonymous runs may be submitted"
  on public.leaderboard for insert
  with check (true);

create policy "a run may only improve its own score"
  on public.leaderboard for update
  using (true)
  with check (true);

create index if not exists leaderboard_score_idx on public.leaderboard (score desc);
