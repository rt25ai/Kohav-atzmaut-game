alter table public.questions
drop constraint if exists questions_correct_option_index_check;

alter table public.questions
add constraint questions_correct_option_index_check
check (correct_option_index between 0 and 3);

alter table public.players
add column if not exists participant_type text;

update public.players
set participant_type = 'solo_male'
where participant_type is null;

alter table public.players
alter column participant_type set default 'solo_male';

alter table public.players
alter column participant_type set not null;

alter table public.players
drop constraint if exists players_participant_type_check;

alter table public.players
add constraint players_participant_type_check
check (participant_type in ('solo_male', 'solo_female', 'family'));
