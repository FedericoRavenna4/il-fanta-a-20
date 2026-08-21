begin;

drop function if exists public.admin_publish_rose_snapshot(bigint, uuid, jsonb);

create function public.admin_publish_rose_snapshot(
  p_stagione_id bigint, p_lega_codice text, p_import_id uuid, p_rows jsonb
)
returns table (inserted bigint, updated bigint, removed bigint, unchanged bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lega_codice text := pg_catalog.lower(pg_catalog.btrim(p_lega_codice));
  v_inserted bigint := 0;
  v_updated bigint := 0;
  v_removed bigint := 0;
  v_unchanged bigint := 0;
begin
  if p_stagione_id is null or p_import_id is null or p_rows is null
     or pg_catalog.jsonb_typeof(p_rows) <> 'array'
     or v_lega_codice not in ('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c') then
    raise exception 'Snapshot Rose per lega non valido';
  end if;
  if not exists (select 1 from public.stagioni where id = p_stagione_id) then
    raise exception 'Stagione non valida';
  end if;
  if not exists (
    select 1 from public.importazioni
    where id = p_import_id and stagione_id = p_stagione_id and tipo = 'rose' and stato = 'validata'
      and riepilogo ->> 'legaCodice' = v_lega_codice
  ) then
    raise exception 'Importazione Rose per lega non validata';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rose-snapshot-' || p_stagione_id::text || '-' || v_lega_codice, 0)
  );

  create temporary table rose_snapshot_rows on commit drop as
  select p_stagione_id as stagione_id,
    pg_catalog.lower(pg_catalog.btrim(row.lega_codice)) as lega_codice,
    row.societa_id, row.giocatore, row.giocatore_normalizzato,
    nullif(pg_catalog.btrim(row.squadra_reale), '') as squadra_reale,
    pg_catalog.upper(row.ruolo) as ruolo, row.prezzo, p_import_id as import_batch_id
  from pg_catalog.jsonb_to_recordset(p_rows) as row(
    lega_codice text, societa_id bigint, giocatore text, giocatore_normalizzato text,
    squadra_reale text, ruolo text, prezzo numeric
  );

  if not exists (select 1 from rose_snapshot_rows) then raise exception 'La fotografia Rose è vuota'; end if;
  if exists (select 1 from rose_snapshot_rows where lega_codice is distinct from v_lega_codice) then
    raise exception 'Il payload Rose contiene una lega diversa dallo scope dichiarato';
  end if;
  if exists (select 1 from rose_snapshot_rows group by giocatore_normalizzato having count(*) > 1) then
    raise exception 'Calciatore duplicato nella fotografia della lega';
  end if;
  if exists (
    select 1 from rose_snapshot_rows
    where societa_id is null or giocatore is null or pg_catalog.btrim(giocatore) = ''
      or giocatore_normalizzato is null or pg_catalog.btrim(giocatore_normalizzato) = ''
      or ruolo is null or ruolo not in ('P','D','C','A') or prezzo is null or prezzo < 0
  ) then raise exception 'La fotografia Rose contiene righe non valide'; end if;
  if exists (
    select 1 from rose_snapshot_rows snapshot
    left join public.societa team on team.id = snapshot.societa_id where team.id is null
  ) then raise exception 'Società Rose non valida'; end if;

  select count(*) into v_unchanged
  from rose_snapshot_rows incoming join public.rose_giocatori current
    on current.stagione_id = p_stagione_id and current.lega_codice = v_lega_codice
   and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  where current.societa_id = incoming.societa_id and current.giocatore = incoming.giocatore
    and current.squadra_reale is not distinct from incoming.squadra_reale
    and current.ruolo = incoming.ruolo and current.prezzo = incoming.prezzo;

  select count(*) into v_updated
  from rose_snapshot_rows incoming join public.rose_giocatori current
    on current.stagione_id = p_stagione_id and current.lega_codice = v_lega_codice
   and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  where current.societa_id is distinct from incoming.societa_id
     or current.giocatore is distinct from incoming.giocatore
     or current.squadra_reale is distinct from incoming.squadra_reale
     or current.ruolo is distinct from incoming.ruolo or current.prezzo is distinct from incoming.prezzo;

  select count(*) into v_inserted from rose_snapshot_rows incoming
  where not exists (
    select 1 from public.rose_giocatori current
    where current.stagione_id = p_stagione_id and current.lega_codice = v_lega_codice
      and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  );

  select count(*) into v_removed from public.rose_giocatori current
  where current.stagione_id = p_stagione_id and current.lega_codice = v_lega_codice
    and not exists (
      select 1 from rose_snapshot_rows incoming
      where incoming.giocatore_normalizzato = current.giocatore_normalizzato
    );

  if not exists (
    select 1 from public.importazioni
    where id = p_import_id
      and (riepilogo ->> 'insert')::bigint = v_inserted
      and (riepilogo ->> 'update')::bigint = v_updated
      and (riepilogo ->> 'rimossi')::bigint = v_removed
      and (riepilogo ->> 'unchanged')::bigint = v_unchanged
  ) then
    raise exception 'Lo stato delle Rose non coincide più con l''anteprima';
  end if;

  insert into public.rose_giocatori as existing (
    stagione_id, lega_codice, societa_id, giocatore, giocatore_normalizzato,
    squadra_reale, ruolo, prezzo, import_batch_id
  )
  select stagione_id, lega_codice, societa_id, giocatore, giocatore_normalizzato,
    squadra_reale, ruolo, prezzo, import_batch_id from rose_snapshot_rows
  on conflict (stagione_id, lega_codice, giocatore_normalizzato) do update set
    societa_id = excluded.societa_id, giocatore = excluded.giocatore,
    squadra_reale = excluded.squadra_reale, ruolo = excluded.ruolo,
    prezzo = excluded.prezzo, import_batch_id = excluded.import_batch_id
  where existing.societa_id is distinct from excluded.societa_id
     or existing.giocatore is distinct from excluded.giocatore
     or existing.squadra_reale is distinct from excluded.squadra_reale
     or existing.ruolo is distinct from excluded.ruolo
     or existing.prezzo is distinct from excluded.prezzo;

  delete from public.rose_giocatori current
  where current.stagione_id = p_stagione_id and current.lega_codice = v_lega_codice
    and not exists (
      select 1 from rose_snapshot_rows incoming
      where incoming.giocatore_normalizzato = current.giocatore_normalizzato
    );

  return query select v_inserted, v_updated, v_removed, v_unchanged;
end;
$$;

revoke all on function public.admin_publish_rose_snapshot(bigint, text, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.admin_publish_rose_snapshot(bigint, text, uuid, jsonb)
to service_role;

drop function if exists public.admin_inspect_rose_import(uuid);

create function public.admin_inspect_rose_import(p_import_id uuid)
returns table (
  stagione_id bigint,
  stagione text,
  lega_codice text,
  players bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select imported.*, pg_catalog.lower(pg_catalog.btrim(imported.riepilogo ->> 'legaCodice')) as target_lega
    from public.importazioni imported
    where imported.id = p_import_id
      and imported.tipo = 'rose'
      and imported.stato in ('pubblicata', 'pubblicata_con_warning')
  )
  select target.stagione_id::bigint, season.codice::text, target.target_lega::text, count(player.id)::bigint
  from target
  join public.stagioni season on season.id = target.stagione_id
  left join public.rose_giocatori player
    on player.stagione_id = target.stagione_id
   and player.lega_codice = target.target_lega
  where target.target_lega in ('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c')
    and target.id = (
      select latest.id
      from public.importazioni latest
      where latest.tipo = 'rose'
        and latest.stagione_id = target.stagione_id
        and latest.stato in ('pubblicata', 'pubblicata_con_warning', 'eliminata')
        and pg_catalog.lower(pg_catalog.btrim(latest.riepilogo ->> 'legaCodice')) = target.target_lega
      order by latest.completata_il desc nulls last, latest.created_at desc, latest.id desc
      limit 1
    )
  group by target.stagione_id, season.codice, target.target_lega
  having count(player.id) > 0;
$$;

revoke all on function public.admin_inspect_rose_import(uuid)
from public, anon, authenticated;
grant execute on function public.admin_inspect_rose_import(uuid)
to service_role;

create or replace function public.admin_delete_rose_import(
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
  target_lega text;
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

  target_lega := pg_catalog.lower(pg_catalog.btrim(target.riepilogo ->> 'legaCodice'));
  if target_lega is null
     or target_lega not in ('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c') then
    raise exception 'L''importazione Rose non contiene una lega valida.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rose-snapshot-' || target.stagione_id::text || '-' || target_lega, 0)
  );

  select latest.id into latest_import_id
  from public.importazioni latest
  where latest.tipo = 'rose'
    and latest.stagione_id = target.stagione_id
    and latest.stato in ('pubblicata', 'pubblicata_con_warning', 'eliminata')
    and pg_catalog.lower(pg_catalog.btrim(latest.riepilogo ->> 'legaCodice')) = target_lega
  order by latest.completata_il desc nulls last, latest.created_at desc, latest.id desc
  limit 1;

  if latest_import_id is distinct from target.id then
    raise exception 'L''importazione selezionata non rappresenta la fotografia Rose corrente della lega.' using errcode = '22023';
  end if;

  select count(*) into player_count
  from public.rose_giocatori
  where stagione_id = target.stagione_id
    and lega_codice = target_lega;
  if player_count = 0 then
    raise exception 'La fotografia Rose corrente della lega è già vuota.' using errcode = '22023';
  end if;

  delete from public.rose_giocatori
  where stagione_id = target.stagione_id
    and lega_codice = target_lega;

  update public.importazioni
  set stato = 'eliminata', deleted_at = statement_timestamp(), deleted_by = p_deleted_by
  where id = target.id;

  return query select player_count, target.stagione_id::bigint;
end;
$$;

revoke all on function public.admin_delete_rose_import(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_delete_rose_import(uuid, uuid)
to service_role;

commit;
