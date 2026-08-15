begin;

create function public.admin_inspect_rose_import(p_import_id uuid)
returns table (
  stagione_id bigint,
  stagione text,
  players bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select target.stagione_id::bigint, season.codice::text, count(player.id)::bigint
  from public.importazioni target
  join public.stagioni season on season.id = target.stagione_id
  left join public.rose_giocatori player on player.stagione_id = target.stagione_id
  where target.id = p_import_id
    and target.tipo = 'rose'
    and target.stato in ('pubblicata', 'pubblicata_con_warning')
    and target.id = (
      select latest.id
      from public.importazioni latest
      where latest.tipo = 'rose'
        and latest.stagione_id = target.stagione_id
        and latest.stato in ('pubblicata', 'pubblicata_con_warning')
      order by latest.completata_il desc nulls last, latest.created_at desc, latest.id desc
      limit 1
    )
  group by target.stagione_id, season.codice
  having count(player.id) > 0;
$$;

revoke all on function public.admin_inspect_rose_import(uuid) from public, anon, authenticated;
grant execute on function public.admin_inspect_rose_import(uuid) to service_role;

create function public.admin_delete_rose_import(
  p_import_id uuid,
  p_deleted_by uuid
)
returns table (
  deleted_players bigint,
  deleted_season_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.importazioni%rowtype;
  latest_import_id uuid;
  player_count bigint;
begin
  if p_deleted_by is null or not exists (select 1 from auth.users where id = p_deleted_by) then
    raise exception 'Identità amministrativa non valida.' using errcode = '42501';
  end if;

  select * into target
  from public.importazioni
  where id = p_import_id
  for update;

  if not found or target.tipo <> 'rose' or target.stagione_id is null then
    raise exception 'Importazione Rose non trovata.' using errcode = 'P0002';
  end if;
  if target.stato not in ('pubblicata', 'pubblicata_con_warning') then
    raise exception 'Solo la fotografia Rose pubblicata può essere eliminata.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rose-snapshot-' || target.stagione_id::text, 0)
  );

  select latest.id into latest_import_id
  from public.importazioni latest
  where latest.tipo = 'rose'
    and latest.stagione_id = target.stagione_id
    and latest.stato in ('pubblicata', 'pubblicata_con_warning')
  order by latest.completata_il desc nulls last, latest.created_at desc, latest.id desc
  limit 1;

  if latest_import_id is distinct from target.id then
    raise exception 'L’importazione selezionata non rappresenta la fotografia Rose corrente.' using errcode = '22023';
  end if;

  select count(*) into player_count
  from public.rose_giocatori
  where stagione_id = target.stagione_id;
  if player_count = 0 then
    raise exception 'La fotografia Rose corrente è già vuota.' using errcode = '22023';
  end if;

  delete from public.rose_giocatori
  where stagione_id = target.stagione_id;

  update public.importazioni
  set stato = 'eliminata', deleted_at = statement_timestamp(), deleted_by = p_deleted_by
  where id = target.id;

  return query select player_count, target.stagione_id::bigint;
end;
$$;

revoke all on function public.admin_delete_rose_import(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_rose_import(uuid, uuid) to service_role;

commit;
