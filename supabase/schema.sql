create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.questions (
  id text primary key,
  type text not null default 'mcq',
  title text not null,
  prompt text not null,
  options jsonb not null,
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  base_points integer not null default 100,
  sort_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_missions (
  id text primary key,
  type text not null default 'photo',
  title text not null,
  prompt text not null,
  base_points integer not null,
  is_final boolean not null default false,
  sort_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  name text not null,
  participant_type text not null default 'solo_male',
  question_order text[] not null,
  mission_order text[] not null,
  current_step_index integer not null default 0,
  total_score integer not null default 0,
  correct_answers integer not null default 0,
  photo_missions_completed integer not null default 0,
  new_people_met integer not null default 0,
  combo_streak integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_rank integer
);

alter table public.questions
drop constraint if exists questions_correct_option_index_check;

alter table public.questions
add constraint questions_correct_option_index_check
check (correct_option_index between 0 and 3);

alter table public.players
add column if not exists participant_type text not null default 'solo_male';

update public.players
set participant_type = 'solo_male'
where participant_type is null;

alter table public.players
drop constraint if exists players_participant_type_check;

alter table public.players
add constraint players_participant_type_check
check (participant_type in ('solo_male', 'solo_female', 'family'));

create table if not exists public.player_answers (
  id text primary key,
  player_id text not null references public.players(id) on delete cascade,
  kind text not null,
  content_id text not null,
  step_index integer not null,
  status text not null,
  answer_option_id text,
  response_ms integer,
  points_awarded integer not null default 0,
  caption text,
  photo_url text,
  thumbnail_url text,
  mission_title text,
  new_people_met integer not null default 0,
  is_final_mission boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player_id, kind, content_id)
);

create table if not exists public.photo_uploads (
  id text primary key,
  player_id text not null references public.players(id) on delete cascade,
  player_name text not null,
  mission_id text not null,
  mission_title text not null,
  caption text,
  photo_url text not null,
  thumbnail_url text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  is_final_mission boolean not null default false
);

create table if not exists public.game_events (
  id text primary key,
  type text not null,
  message text not null,
  player_id text,
  player_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id integer primary key default 1,
  intro_text text not null,
  prize_first text not null,
  prize_second text not null,
  prize_third text not null,
  global_sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists players_total_score_idx on public.players (total_score desc, updated_at asc);
create index if not exists players_last_seen_idx on public.players (last_seen_at desc);
create index if not exists player_answers_player_idx on public.player_answers (player_id, step_index);
create index if not exists photo_uploads_created_idx on public.photo_uploads (created_at desc);
create index if not exists photo_uploads_hidden_idx on public.photo_uploads (hidden);
create index if not exists game_events_created_idx on public.game_events (created_at desc);

drop trigger if exists questions_updated_at on public.questions;
create trigger questions_updated_at
before update on public.questions
for each row
execute function public.handle_updated_at();

drop trigger if exists photo_missions_updated_at on public.photo_missions;
create trigger photo_missions_updated_at
before update on public.photo_missions
for each row
execute function public.handle_updated_at();

drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at
before update on public.players
for each row
execute function public.handle_updated_at();

drop trigger if exists admin_settings_updated_at on public.admin_settings;
create trigger admin_settings_updated_at
before update on public.admin_settings
for each row
execute function public.handle_updated_at();

alter table public.questions enable row level security;
alter table public.photo_missions enable row level security;
alter table public.players enable row level security;
alter table public.player_answers enable row level security;
alter table public.photo_uploads enable row level security;
alter table public.game_events enable row level security;
alter table public.admin_settings enable row level security;

drop policy if exists "public read questions" on public.questions;
create policy "public read questions"
on public.questions
for select
using (active = true);

drop policy if exists "public read photo missions" on public.photo_missions;
create policy "public read photo missions"
on public.photo_missions
for select
using (active = true);

drop policy if exists "public read players" on public.players;
create policy "public read players"
on public.players
for select
using (true);

drop policy if exists "public read visible photos" on public.photo_uploads;
create policy "public read visible photos"
on public.photo_uploads
for select
using (hidden = false);

drop policy if exists "public read events" on public.game_events;
create policy "public read events"
on public.game_events
for select
using (true);

drop policy if exists "public read settings" on public.admin_settings;
create policy "public read settings"
on public.admin_settings
for select
using (true);

insert into storage.buckets (id, name, public)
values ('mission-photos', 'mission-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read mission photos" on storage.objects;
create policy "public read mission photos"
on storage.objects
for select
using (bucket_id = 'mission-photos');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'photo_uploads'
  ) then
    alter publication supabase_realtime add table public.photo_uploads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_events'
  ) then
    alter publication supabase_realtime add table public.game_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_settings'
  ) then
    alter publication supabase_realtime add table public.admin_settings;
  end if;
end $$;
