begin;

alter table public.societa_emblem_holder_history
  add column if not exists record_value numeric null;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select constraint_record.conname
    from pg_catalog.pg_constraint constraint_record
    where constraint_record.conrelid = 'public.societa_emblem_holder_history'::regclass
      and constraint_record.contype = 'c'
      and pg_catalog.pg_get_constraintdef(constraint_record.oid) ilike '%emblem_key%'
  loop
    execute pg_catalog.format(
      'alter table public.societa_emblem_holder_history drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table public.societa_emblem_holder_history
  add constraint societa_emblem_holder_history_emblem_key_check
  check (emblem_key in ('titano', 'abisso', 'mecenate', 'idolo'));

-- Preserve the approved incumbents and records exactly. Existing calculated
-- matches are deliberately not backfilled for Titano or Abisso.
insert into public.societa_emblem_holder_history (
  emblem_key, societa_id, stagione_id, record_value
)
select seed.emblem_key, seed.societa_id, season.id, seed.record_value
from (values
  ('titano'::text, 10::bigint, 94::numeric),
  ('abisso'::text, 5::bigint, 31::numeric)
) as seed(emblem_key, societa_id, record_value)
cross join lateral (
  select id from public.stagioni where attiva = true order by id desc limit 1
) season
where not exists (
  select 1
  from public.societa_emblem_holder_history current_holder
  where current_holder.emblem_key = seed.emblem_key
    and current_holder.held_until is null
);

create or replace function private.register_societa_performance_record(
  p_emblem_key text,
  p_societa_id bigint,
  p_stagione_id bigint,
  p_record_value numeric,
  p_lower_is_better boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holder_id bigint;
  v_record_value numeric;
  v_is_better boolean;
begin
  if p_emblem_key not in ('titano', 'abisso')
    or p_societa_id is null
    or p_stagione_id is null
    or p_record_value is null then
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('societa-defending-emblem-' || p_emblem_key, 0)
  );

  select holder.societa_id, holder.record_value
  into v_holder_id, v_record_value
  from public.societa_emblem_holder_history holder
  where holder.emblem_key = p_emblem_key and holder.held_until is null;

  if v_holder_id is null or v_record_value is null then
    return;
  end if;

  v_is_better := case
    when p_lower_is_better then p_record_value < v_record_value
    else p_record_value > v_record_value
  end;

  -- Equality always preserves the incumbent.
  if not v_is_better then return; end if;

  update public.societa_emblem_holder_history
  set held_until = clock_timestamp()
  where emblem_key = p_emblem_key and held_until is null;

  insert into public.societa_emblem_holder_history (
    emblem_key, societa_id, stagione_id, record_value
  ) values (
    p_emblem_key, p_societa_id, p_stagione_id, p_record_value
  );
end;
$$;

create or replace function private.track_societa_match_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stagione_id bigint;
begin
  if new.stato <> 'calcolata' then return new; end if;

  select edition.stagione_id into v_stagione_id
  from public.edizioni_competizioni edition
  where edition.id = new.edizione_competizione_id;

  perform private.register_societa_performance_record(
    'titano', new.societa_casa_id, v_stagione_id, new.fantapunti_casa, false
  );
  perform private.register_societa_performance_record(
    'titano', new.societa_trasferta_id, v_stagione_id, new.fantapunti_trasferta, false
  );
  perform private.register_societa_performance_record(
    'abisso', new.societa_casa_id, v_stagione_id, new.fantapunti_casa, true
  );
  perform private.register_societa_performance_record(
    'abisso', new.societa_trasferta_id, v_stagione_id, new.fantapunti_trasferta, true
  );
  return new;
end;
$$;

create trigger societa_defending_emblems_after_match_record
after insert or update of stato, fantapunti_casa, fantapunti_trasferta
on public.partite
for each row execute function private.track_societa_match_records();

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

  select max(player.prezzo) into v_max_value from public.rose_giocatori player;
  if v_max_value is null then return; end if;

  select count(*), min(leaders.societa_id), min(leaders.stagione_id)
  into v_leader_count, v_leader_id, v_stagione_id
  from (
    select player.societa_id, min(player.stagione_id) as stagione_id
    from public.rose_giocatori player
    where player.prezzo = v_max_value
    group by player.societa_id
  ) leaders;

  select holder.societa_id, holder.record_value
  into v_holder_id, v_holder_value
  from public.societa_emblem_holder_history holder
  where holder.emblem_key = 'mecenate' and holder.held_until is null;

  if v_holder_id is not null and v_holder_value = v_max_value then return; end if;
  if v_leader_count <> 1 then return; end if;
  if v_holder_value is not null and v_max_value <= v_holder_value then return; end if;

  update public.societa_emblem_holder_history
  set held_until = clock_timestamp()
  where emblem_key = 'mecenate' and held_until is null;

  insert into public.societa_emblem_holder_history (
    emblem_key, societa_id, stagione_id, record_value
  ) values ('mecenate', v_leader_id, v_stagione_id, v_max_value);
end;
$$;

create or replace function private.trigger_sync_societa_mecenate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_societa_mecenate();
  return null;
end;
$$;

create trigger societa_defending_emblems_after_rose_change
after insert or delete or update of prezzo, societa_id
on public.rose_giocatori
for each statement execute function private.trigger_sync_societa_mecenate();

create function public.public_societa_defending_emblems(p_societa_id bigint)
returns table (
  emblem_key text,
  stato text,
  record_value numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select holder.emblem_key,
    'Da difendere'::text as stato,
    case
      when holder.emblem_key = 'idolo' then coalesce(supporters.tifosi, 0)::numeric
      else holder.record_value
    end as record_value
  from public.societa_emblem_holder_history holder
  left join public.active_supporter_counts() supporters
    on holder.emblem_key = 'idolo' and supporters.societa_id = holder.societa_id
  where holder.societa_id = p_societa_id
    and holder.held_until is null
    and holder.emblem_key in ('titano', 'abisso', 'mecenate', 'idolo');
$$;

create function public.public_all_societa_defending_emblems()
returns table (
  societa_id bigint,
  emblem_key text,
  stato text,
  record_value numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select holder.societa_id,
    holder.emblem_key,
    'Da difendere'::text as stato,
    case
      when holder.emblem_key = 'idolo' then coalesce(supporters.tifosi, 0)::numeric
      else holder.record_value
    end as record_value
  from public.societa_emblem_holder_history holder
  left join public.active_supporter_counts() supporters
    on holder.emblem_key = 'idolo' and supporters.societa_id = holder.societa_id
  where holder.held_until is null
    and holder.emblem_key in ('titano', 'abisso', 'mecenate', 'idolo');
$$;

revoke all on function private.register_societa_performance_record(text, bigint, bigint, numeric, boolean) from public, anon, authenticated;
revoke all on function private.track_societa_match_records() from public, anon, authenticated;
revoke all on function private.sync_societa_mecenate() from public, anon, authenticated;
revoke all on function private.trigger_sync_societa_mecenate() from public, anon, authenticated;
grant execute on function private.register_societa_performance_record(text, bigint, bigint, numeric, boolean) to service_role;
grant execute on function private.track_societa_match_records() to service_role;
grant execute on function private.sync_societa_mecenate() to service_role;
grant execute on function private.trigger_sync_societa_mecenate() to service_role;

revoke all on function public.public_societa_defending_emblems(bigint) from public;
revoke all on function public.public_all_societa_defending_emblems() from public;
grant execute on function public.public_societa_defending_emblems(bigint) to anon, authenticated, service_role;
grant execute on function public.public_all_societa_defending_emblems() to anon, authenticated, service_role;

-- Mecenate has no approved legacy incumbent; initialize it only when the
-- authoritative Rose history has one unique all-time leader.
select private.sync_societa_mecenate();

commit;
