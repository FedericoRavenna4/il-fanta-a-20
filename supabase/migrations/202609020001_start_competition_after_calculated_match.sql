begin;

create or replace function private.start_competition_after_calculated_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stato = 'calcolata' then
    update public.edizioni_competizioni
    set stato = 'in_corso'
    where id = new.edizione_competizione_id
      and stato = 'programmata';
  end if;

  return new;
end;
$$;

drop trigger if exists partite_start_competition_after_calculated_match on public.partite;
create trigger partite_start_competition_after_calculated_match
after insert or update of stato on public.partite
for each row
execute function private.start_competition_after_calculated_match();

revoke all on function private.start_competition_after_calculated_match() from public, anon, authenticated;
grant execute on function private.start_competition_after_calculated_match() to service_role;

commit;
