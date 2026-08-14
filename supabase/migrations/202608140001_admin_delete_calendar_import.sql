begin;

alter table public.importazioni
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null references auth.users(id);

alter table public.importazioni drop constraint if exists importazioni_stato_ammesso;
alter table public.importazioni add constraint importazioni_stato_ammesso
  check (stato in ('anteprima', 'validata', 'pubblicata', 'pubblicata_con_warning', 'errore', 'annullata', 'eliminata'));

create or replace function public.admin_inspect_calendar_import(p_import_id uuid)
returns table (
  matches bigint,
  calculated bigint,
  rests bigint,
  fantabet_dependencies bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(distinct game.id)::bigint,
    count(distinct game.id) filter (where game.stato = 'calcolata')::bigint,
    (select count(*) from public.riposi_competizione rest where rest.edizione_competizione_id = target.edizione_competizione_id)::bigint,
    count(distinct bet.id)::bigint
  from public.importazioni target
  left join public.partite game on game.edizione_competizione_id = target.edizione_competizione_id
  left join public.fantabet_bets bet on bet.partita_id = game.id
  where target.id = p_import_id
    and target.stato in ('pubblicata', 'pubblicata_con_warning')
    and target.edizione_competizione_id is not null
  group by target.edizione_competizione_id;
$$;

revoke all on function public.admin_inspect_calendar_import(uuid) from public, anon, authenticated;
grant execute on function public.admin_inspect_calendar_import(uuid) to service_role;

create or replace function public.admin_delete_calendar_import(
  p_import_id uuid,
  p_deleted_by uuid,
  p_acknowledge_calculated boolean default false
)
returns table (
  deleted_matches bigint,
  deleted_calculated bigint,
  deleted_rests bigint,
  deleted_support_events bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.importazioni%rowtype;
  match_count bigint;
  calculated_count bigint;
  rest_count bigint;
  support_event_count bigint;
  fantabet_dependency_count bigint;
begin
  if p_deleted_by is null or not exists (select 1 from auth.users where id = p_deleted_by) then
    raise exception 'Identità amministrativa non valida.' using errcode = '42501';
  end if;

  select * into target
  from public.importazioni
  where id = p_import_id
  for update;

  if not found or target.edizione_competizione_id is null then
    raise exception 'Importazione calendario non trovata.' using errcode = 'P0002';
  end if;
  if target.stato not in ('pubblicata', 'pubblicata_con_warning') then
    raise exception 'Solo un calendario pubblicato può essere eliminato.' using errcode = '22023';
  end if;

  select count(*), count(*) filter (where stato = 'calcolata')
    into match_count, calculated_count
  from public.partite
  where edizione_competizione_id = target.edizione_competizione_id;

  if calculated_count > 0 and not p_acknowledge_calculated then
    raise exception 'Il calendario contiene % partite calcolate: conferma rafforzata richiesta.', calculated_count using errcode = '22023';
  end if;

  select count(*) into fantabet_dependency_count
  from public.fantabet_bets bet
  join public.partite game on game.id = bet.partita_id
  where game.edizione_competizione_id = target.edizione_competizione_id;
  if fantabet_dependency_count > 0 then
    raise exception 'Eliminazione bloccata: % partite sono utilizzate da FantaBet.', fantabet_dependency_count using errcode = '23503';
  end if;

  select count(*) into rest_count from public.riposi_competizione where edizione_competizione_id = target.edizione_competizione_id;
  select count(*) into support_event_count
  from public.fantabet_support_match_events event
  join public.partite game on game.id = event.partita_id
  where game.edizione_competizione_id = target.edizione_competizione_id;

  delete from public.fantabet_support_match_events event
  using public.partite game
  where event.partita_id = game.id and game.edizione_competizione_id = target.edizione_competizione_id;
  delete from public.riposi_competizione where edizione_competizione_id = target.edizione_competizione_id;
  delete from public.partite where edizione_competizione_id = target.edizione_competizione_id;

  update public.importazioni
  set stato = 'eliminata', deleted_at = statement_timestamp(), deleted_by = p_deleted_by
  where edizione_competizione_id = target.edizione_competizione_id
    and stato in ('pubblicata', 'pubblicata_con_warning');

  return query select match_count, calculated_count, rest_count, support_event_count;
end;
$$;

revoke all on function public.admin_delete_calendar_import(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_delete_calendar_import(uuid, uuid, boolean) to service_role;

commit;
