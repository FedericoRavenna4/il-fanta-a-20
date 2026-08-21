begin;

create function private.sync_arcade_user_emblems()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint := 0;
  v_rows bigint := 0;
begin
  insert into public.user_emblem_unlocks (
    profile_id, emblem_id, unlocked_at, source_type, source_ref
  )
  select score.profile_id, emblem.id, pg_catalog.clock_timestamp(),
    'arcade_first_score', score.id::text
  from public.classifica_arcade score
  join public.user_emblems emblem
    on emblem.id = 5 and emblem.slug = 'insert-coin' and emblem.categoria = 'arcade'
  where score.profile_id is not null
  on conflict (profile_id, emblem_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (
    profile_id, emblem_id, unlocked_at, source_type, source_ref
  )
  select score.profile_id, emblem.id, pg_catalog.clock_timestamp(),
    'arcade_first_promotion', score.id::text
  from public.classifica_arcade score
  join public.user_emblems emblem
    on emblem.id = 6 and emblem.slug = 'salto-di-qualita' and emblem.categoria = 'arcade'
  where score.profile_id is not null
    and coalesce(score.livello, 1::smallint) >= 2
  on conflict (profile_id, emblem_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  with ranked as (
    select score.id, score.profile_id,
      pg_catalog.row_number() over (
        order by coalesce(score.livello, 1::smallint) desc,
          score.metri desc,
          score.updated_at asc,
          score.created_at asc,
          score.id asc
      ) as posizione
    from public.classifica_arcade score
    where score.profile_id is not null
  )
  insert into public.user_emblem_unlocks (
    profile_id, emblem_id, unlocked_at, source_type, source_ref
  )
  select ranked.profile_id, emblem.id, pg_catalog.clock_timestamp(),
    'arcade_top_10', ranked.id::text
  from ranked
  join public.user_emblems emblem
    on emblem.id = 11 and emblem.slug = 'top-player' and emblem.categoria = 'arcade'
  where ranked.posizione <= 10
  on conflict (profile_id, emblem_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  with ranked as (
    select score.id, score.profile_id,
      pg_catalog.row_number() over (
        order by coalesce(score.livello, 1::smallint) desc,
          score.metri desc,
          score.updated_at asc,
          score.created_at asc,
          score.id asc
      ) as posizione
    from public.classifica_arcade score
    where score.profile_id is not null
  )
  insert into public.user_emblem_unlocks (
    profile_id, emblem_id, unlocked_at, source_type, source_ref
  )
  select ranked.profile_id, emblem.id, pg_catalog.clock_timestamp(),
    'arcade_first_place', ranked.id::text
  from ranked
  join public.user_emblems emblem
    on emblem.id = 16 and emblem.slug = 'ingiocabile' and emblem.categoria = 'arcade'
  where ranked.posizione = 1
  on conflict (profile_id, emblem_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  return v_count;
end;
$$;

revoke all on function private.sync_arcade_user_emblems()
from public, anon, authenticated;
grant execute on function private.sync_arcade_user_emblems()
to service_role;

create function private.trigger_sync_arcade_user_emblems()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_arcade_user_emblems();
  return null;
end;
$$;

revoke all on function private.trigger_sync_arcade_user_emblems()
from public, anon, authenticated;
grant execute on function private.trigger_sync_arcade_user_emblems()
to service_role;

create trigger arcade_user_emblems_after_score
after insert or update of livello, metri, profile_id
on public.classifica_arcade
for each statement
execute function private.trigger_sync_arcade_user_emblems();

select private.sync_arcade_user_emblems();

commit;
