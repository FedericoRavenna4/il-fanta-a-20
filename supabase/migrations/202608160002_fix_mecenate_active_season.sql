begin;

create or replace function private.sync_societa_mecenate()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max_value numeric;
  v_leader_count integer;
  v_leader_id bigint;
  v_stagione_id bigint;
  v_holder_id bigint;
  v_holder_value numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('societa-defending-emblem-mecenate', 0)
  );

  select season.id
  into v_stagione_id
  from public.stagioni season
  where season.attiva = true
  order by season.id desc
  limit 1;

  if v_stagione_id is null then
    return;
  end if;

  select max(player.prezzo)
  into v_max_value
  from public.rose_giocatori player
  where player.stagione_id = v_stagione_id;

  if v_max_value is null then
    return;
  end if;

  select count(*), min(leaders.societa_id)
  into v_leader_count, v_leader_id
  from (
    select distinct player.societa_id
    from public.rose_giocatori player
    where player.stagione_id = v_stagione_id
      and player.prezzo = v_max_value
  ) leaders;

  select holder.societa_id, holder.record_value
  into v_holder_id, v_holder_value
  from public.societa_emblem_holder_history holder
  where holder.emblem_key = 'mecenate'
    and holder.held_until is null;

  if v_holder_id is null then
    if v_leader_count <> 1 then
      return;
    end if;

    insert into public.societa_emblem_holder_history (
      emblem_key,
      societa_id,
      stagione_id,
      record_value
    )
    values (
      'mecenate',
      v_leader_id,
      v_stagione_id,
      v_max_value
    );

    return;
  end if;

  if v_holder_value is not null
     and v_max_value <= v_holder_value then
    return;
  end if;

  if v_leader_count <> 1 then
    return;
  end if;

  update public.societa_emblem_holder_history
  set held_until = clock_timestamp()
  where emblem_key = 'mecenate'
    and held_until is null;

  insert into public.societa_emblem_holder_history (
    emblem_key,
    societa_id,
    stagione_id,
    record_value
  )
  values (
    'mecenate',
    v_leader_id,
    v_stagione_id,
    v_max_value
  );
end;
$$;

revoke all on function private.sync_societa_mecenate()
from public, anon, authenticated;

grant execute on function private.sync_societa_mecenate()
to service_role;

select private.sync_societa_mecenate();

commit;