create table if not exists public.host_announcements (
  id text primary key,
  message text not null,
  scheduled_for timestamptz not null,
  ends_mode text not null default 'until_next',
  ends_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.host_announcements
drop constraint if exists host_announcements_ends_mode_check;

alter table public.host_announcements
add constraint host_announcements_ends_mode_check
check (ends_mode in ('until_next', 'at_time'));

create index if not exists host_announcements_scheduled_idx
on public.host_announcements (scheduled_for desc);

create index if not exists host_announcements_cleared_idx
on public.host_announcements (cleared_at);

drop trigger if exists host_announcements_updated_at on public.host_announcements;
create trigger host_announcements_updated_at
before update on public.host_announcements
for each row
execute function public.handle_updated_at();

alter table public.host_announcements enable row level security;

drop policy if exists "public read host announcements" on public.host_announcements;
create policy "public read host announcements"
on public.host_announcements
for select
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'host_announcements'
  ) then
    alter publication supabase_realtime add table public.host_announcements;
  end if;
end $$;
