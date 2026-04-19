create table if not exists public.survey_runtime_state (
  id text primary key,
  phase text not null default 'live',
  closed_at timestamptz,
  finalized_at timestamptz,
  final_results_snapshot jsonb,
  final_banner_message text,
  grace_players jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_runtime_state
drop constraint if exists survey_runtime_state_phase_check;

alter table public.survey_runtime_state
add constraint survey_runtime_state_phase_check
check (phase in ('live', 'closing', 'finalized'));

drop trigger if exists survey_runtime_state_updated_at on public.survey_runtime_state;
create trigger survey_runtime_state_updated_at
before update on public.survey_runtime_state
for each row
execute function public.handle_updated_at();

alter table public.survey_runtime_state enable row level security;

drop policy if exists "public read survey runtime state" on public.survey_runtime_state;
create policy "public read survey runtime state"
on public.survey_runtime_state
for select
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'survey_runtime_state'
  ) then
    alter publication supabase_realtime add table public.survey_runtime_state;
  end if;
end $$;
