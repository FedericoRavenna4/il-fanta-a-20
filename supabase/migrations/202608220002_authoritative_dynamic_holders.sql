begin;

create table private.societa_performance_record_sources (
  partita_id bigint primary key references public.partite(id) on delete cascade,
  eligible boolean not null,
  observed_at timestamptz not null default clock_timestamp(),
  home_value numeric null,
  away_value numeric null,
  home_reached_at timestamptz null,
  away_reached_at timestamptz null
);
revoke all on table private.societa_performance_record_sources from public,anon,authenticated;

-- Existing calculated rows predate reliable provenance and are explicitly
-- tombstoned: a later correction must never promote them into the pool.
insert into private.societa_performance_record_sources(partita_id,eligible)
select id,false from public.partite where stato='calcolata'
on conflict(partita_id) do nothing;

do $$ begin
  if (select count(*) from public.societa_emblem_holder_history where emblem_key='titano' and held_until is null)<>1
    or (select count(*) from public.societa_emblem_holder_history where emblem_key='titano' and held_until is null and societa_id=10 and record_value=94)<>1
    or (select count(*) from public.societa_emblem_holder_history where emblem_key='abisso' and held_until is null)<>1
    or (select count(*) from public.societa_emblem_holder_history where emblem_key='abisso' and held_until is null and societa_id=5 and record_value=31)<>1 then
    raise exception 'DYNAMIC_HOLDER_PROVENANCE_REQUIRED' using errcode='23514';
  end if;
end $$;

create or replace function private.track_societa_performance_source()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' and new.stato='calcolata' then
    insert into private.societa_performance_record_sources(partita_id,eligible,home_value,away_value,home_reached_at,away_reached_at)
    values(new.id,true,new.fantapunti_casa,new.fantapunti_trasferta,statement_timestamp(),statement_timestamp()) on conflict(partita_id) do nothing;
  elsif tg_op='UPDATE' and old.stato='calcolata' then
    insert into private.societa_performance_record_sources(partita_id,eligible) values(new.id,false) on conflict(partita_id) do nothing;
    update private.societa_performance_record_sources source set
      home_reached_at=case when source.eligible and source.home_value is distinct from new.fantapunti_casa then statement_timestamp() else source.home_reached_at end,
      away_reached_at=case when source.eligible and source.away_value is distinct from new.fantapunti_trasferta then statement_timestamp() else source.away_reached_at end,
      home_value=case when source.eligible then new.fantapunti_casa else source.home_value end,
      away_value=case when source.eligible then new.fantapunti_trasferta else source.away_value end
    where source.partita_id=new.id and new.stato='calcolata';
  elsif tg_op='UPDATE' and old.stato<>'calcolata' and new.stato='calcolata' then
    insert into private.societa_performance_record_sources(partita_id,eligible,home_value,away_value,home_reached_at,away_reached_at)
    values(new.id,true,new.fantapunti_casa,new.fantapunti_trasferta,statement_timestamp(),statement_timestamp())
    on conflict(partita_id) do update set
      home_reached_at=case when societa_performance_record_sources.eligible and societa_performance_record_sources.home_value is distinct from excluded.home_value then excluded.home_reached_at else societa_performance_record_sources.home_reached_at end,
      away_reached_at=case when societa_performance_record_sources.eligible and societa_performance_record_sources.away_value is distinct from excluded.away_value then excluded.away_reached_at else societa_performance_record_sources.away_reached_at end,
      home_value=case when societa_performance_record_sources.eligible then excluded.home_value else societa_performance_record_sources.home_value end,
      away_value=case when societa_performance_record_sources.eligible then excluded.away_value else societa_performance_record_sources.away_value end;
  end if;
  return new;
end $$;

drop trigger if exists societa_performance_source_after_match on public.partite;
create trigger societa_performance_source_after_match after insert or update of stato,fantapunti_casa,fantapunti_trasferta on public.partite
for each row execute function private.track_societa_performance_source();

create or replace function private.sync_societa_performance_holders()
returns void language plpgsql security definer set search_path='' as $$
declare
  v_key text; v_baseline_team bigint; v_baseline_value numeric; v_lower boolean;
  v_team bigint; v_value numeric; v_season bigint;
  v_current_team bigint; v_current_value numeric;
begin
  foreach v_key in array array['titano'::text,'abisso'::text] loop
    v_lower:=v_key='abisso';
    v_baseline_team:=case when v_lower then 5 else 10 end;
    v_baseline_value:=case when v_lower then 31 else 94 end;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('societa-defending-emblem-'||v_key,0));

    select holder.societa_id,holder.record_value into v_current_team,v_current_value
    from public.societa_emblem_holder_history holder where holder.emblem_key=v_key and holder.held_until is null;

    with performances as (
      select game.societa_casa_id societa_id,edition.stagione_id,game.fantapunti_casa value,source.home_reached_at reached_at,game.id source_id,0 side
      from public.partite game join private.societa_performance_record_sources source on source.partita_id=game.id and source.eligible
      join public.edizioni_competizioni edition on edition.id=game.edizione_competizione_id
      where game.stato='calcolata' and game.fantapunti_casa is not null
      union all
      select game.societa_trasferta_id,edition.stagione_id,game.fantapunti_trasferta,source.away_reached_at,game.id,1
      from public.partite game join private.societa_performance_record_sources source on source.partita_id=game.id and source.eligible
      join public.edizioni_competizioni edition on edition.id=game.edizione_competizione_id
      where game.stato='calcolata' and game.fantapunti_trasferta is not null
      union all select v_baseline_team,(select stagione_id from public.societa_emblem_holder_history where emblem_key=v_key and societa_id=v_baseline_team and record_value=v_baseline_value order by held_from limit 1),v_baseline_value,'-infinity'::timestamptz,0,-1
    )
    select candidate.societa_id,candidate.value,candidate.stagione_id into v_team,v_value,v_season
    from performances candidate
    order by
      case when v_lower then candidate.value end asc,
      case when not v_lower then candidate.value end desc,
      case when not v_lower and candidate.societa_id=v_current_team then 0 else 1 end,
      case when v_lower then candidate.reached_at end desc,
      case when v_lower then candidate.source_id end desc,
      case when v_lower then candidate.side end desc,
      candidate.societa_id
    limit 1;

    if v_current_team=v_team then
      if v_current_value is distinct from v_value then update public.societa_emblem_holder_history set record_value=v_value,stagione_id=v_season where emblem_key=v_key and held_until is null;end if;
      continue;
    end if;
    update public.societa_emblem_holder_history set held_until=clock_timestamp() where emblem_key=v_key and held_until is null;
    insert into public.societa_emblem_holder_history(emblem_key,societa_id,stagione_id,record_value) values(v_key,v_team,v_season,v_value);
  end loop;
end $$;

create or replace function private.trigger_sync_societa_performance_holders()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.sync_societa_performance_holders();return null;end $$;

drop trigger if exists societa_defending_emblems_after_match_record on public.partite;
drop trigger if exists societa_performance_holders_after_match on public.partite;
create trigger societa_performance_holders_after_match
after insert or delete or update of stato,fantapunti_casa,fantapunti_trasferta,societa_casa_id,societa_trasferta_id,edizione_competizione_id
on public.partite for each statement execute function private.trigger_sync_societa_performance_holders();

create or replace function private.sync_societa_mecenate()
returns void language plpgsql security definer set search_path='' as $$
declare v_season bigint;v_max numeric;v_count integer;v_team bigint;v_current_team bigint;v_current_value numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('societa-defending-emblem-mecenate',0));
  select id into v_season from public.stagioni where attiva=true order by id desc limit 1;
  if v_season is null then return;end if;
  select societa_id,record_value into v_current_team,v_current_value from public.societa_emblem_holder_history where emblem_key='mecenate' and held_until is null;
  select max(prezzo) into v_max from public.rose_giocatori where stagione_id=v_season;
  if v_max is null then
    update public.societa_emblem_holder_history set held_until=clock_timestamp() where emblem_key='mecenate' and held_until is null;
    return;
  end if;
  select count(*),min(societa_id) into v_count,v_team from (select distinct societa_id from public.rose_giocatori where stagione_id=v_season and prezzo=v_max) leaders;
  if v_current_team is not null and v_current_value=v_max and exists(select 1 from public.rose_giocatori where stagione_id=v_season and societa_id=v_current_team and prezzo=v_max) then return;end if;
  if v_count<>1 then return;end if;
  if v_current_team=v_team then
    update public.societa_emblem_holder_history set record_value=v_max,stagione_id=v_season where emblem_key='mecenate' and held_until is null and record_value is distinct from v_max;
    return;
  end if;
  update public.societa_emblem_holder_history set held_until=clock_timestamp() where emblem_key='mecenate' and held_until is null;
  insert into public.societa_emblem_holder_history(emblem_key,societa_id,stagione_id,record_value) values('mecenate',v_team,v_season,v_max);
end $$;

revoke all on function private.sync_societa_performance_holders() from public,anon,authenticated;
revoke all on function private.trigger_sync_societa_performance_holders() from public,anon,authenticated;
revoke all on function private.track_societa_performance_source() from public,anon,authenticated;
revoke all on function private.sync_societa_mecenate() from public,anon,authenticated;
grant execute on function private.sync_societa_performance_holders() to service_role;
grant execute on function private.trigger_sync_societa_performance_holders() to service_role;
grant execute on function private.track_societa_performance_source() to service_role;
grant execute on function private.sync_societa_mecenate() to service_role;

select private.sync_societa_mecenate();

commit;
