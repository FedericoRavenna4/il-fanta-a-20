begin;

alter table public.rose_giocatori
  add column lega_codice text not null default 'default'
  constraint rose_giocatori_lega_codice_ammesso check (
    lega_codice in ('default', 'serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c')
  );

alter table public.rose_giocatori
  alter column lega_codice drop default;

alter table public.rose_giocatori
  drop constraint rose_giocatori_stagione_id_giocatore_normalizzato_key;

alter table public.rose_giocatori
  add constraint rose_giocatori_stagione_lega_giocatore_unique
  unique (stagione_id, lega_codice, giocatore_normalizzato);

create or replace function public.admin_publish_rose_snapshot(
  p_stagione_id bigint,
  p_import_id uuid,
  p_rows jsonb
)
returns table (inserted bigint, updated bigint, removed bigint, unchanged bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted bigint := 0;
  v_updated bigint := 0;
  v_removed bigint := 0;
  v_unchanged bigint := 0;
begin
  if p_stagione_id is null or p_import_id is null or p_rows is null or pg_catalog.jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Snapshot Rose non valido';
  end if;
  if not exists (select 1 from public.stagioni where id = p_stagione_id) then raise exception 'Stagione non valida'; end if;
  if not exists (select 1 from public.importazioni where id = p_import_id and stagione_id = p_stagione_id and tipo = 'rose' and stato = 'validata') then
    raise exception 'Importazione Rose non validata';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rose-snapshot-' || p_stagione_id::text, 0)
  );

  create temporary table rose_snapshot_rows on commit drop as
  select p_stagione_id as stagione_id, pg_catalog.lower(pg_catalog.btrim(row.lega_codice)) as lega_codice,
    row.societa_id, row.giocatore, row.giocatore_normalizzato,
    nullif(pg_catalog.btrim(row.squadra_reale), '') as squadra_reale,
    pg_catalog.upper(row.ruolo) as ruolo, row.prezzo, p_import_id as import_batch_id
  from pg_catalog.jsonb_to_recordset(p_rows) as row(
    lega_codice text, societa_id bigint, giocatore text, giocatore_normalizzato text,
    squadra_reale text, ruolo text, prezzo numeric
  );

  if not exists (select 1 from rose_snapshot_rows) then raise exception 'La fotografia Rose è vuota'; end if;
  if exists (
    select 1 from rose_snapshot_rows
    group by lega_codice, giocatore_normalizzato
    having count(*) > 1
  ) then raise exception 'Calciatore duplicato nella stessa lega della fotografia Rose'; end if;
  if exists (
    select 1
    from rose_snapshot_rows
    where lega_codice is null
      or lega_codice not in ('serie-a', 'serie-b', 'serie-c-girone-a', 'serie-c-girone-b', 'serie-c-girone-c')
      or societa_id is null
      or giocatore is null
      or pg_catalog.btrim(giocatore) = ''
      or giocatore_normalizzato is null
      or pg_catalog.btrim(giocatore_normalizzato) = ''
      or ruolo is null
      or ruolo not in ('P','D','C','A')
      or prezzo is null
      or prezzo < 0
  ) then
    raise exception 'La fotografia Rose contiene righe non valide';
  end if;
  if exists (
    select 1 from rose_snapshot_rows snapshot
    left join public.societa team on team.id = snapshot.societa_id
    where team.id is null
  ) then raise exception 'Società Rose non valida'; end if;

  select count(*) into v_unchanged
  from rose_snapshot_rows incoming join public.rose_giocatori current
    on current.stagione_id = p_stagione_id
   and current.lega_codice = incoming.lega_codice
   and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  where current.societa_id = incoming.societa_id and current.giocatore = incoming.giocatore
    and current.squadra_reale is not distinct from incoming.squadra_reale
    and current.ruolo = incoming.ruolo and current.prezzo = incoming.prezzo;

  select count(*) into v_updated
  from rose_snapshot_rows incoming join public.rose_giocatori current
    on current.stagione_id = p_stagione_id
   and current.lega_codice = incoming.lega_codice
   and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  where current.societa_id is distinct from incoming.societa_id
    or current.giocatore is distinct from incoming.giocatore
    or current.squadra_reale is distinct from incoming.squadra_reale
    or current.ruolo is distinct from incoming.ruolo
    or current.prezzo is distinct from incoming.prezzo;

  select count(*) into v_inserted
  from rose_snapshot_rows incoming
  where not exists (
    select 1 from public.rose_giocatori current
    where current.stagione_id = p_stagione_id
      and current.lega_codice = incoming.lega_codice
      and current.giocatore_normalizzato = incoming.giocatore_normalizzato
  );

  select count(*) into v_removed
  from public.rose_giocatori current
  where current.stagione_id = p_stagione_id
    and not exists (
      select 1 from rose_snapshot_rows incoming
      where incoming.lega_codice = current.lega_codice
        and incoming.giocatore_normalizzato = current.giocatore_normalizzato
    );

  insert into public.rose_giocatori as existing (
    stagione_id, lega_codice, societa_id, giocatore, giocatore_normalizzato,
    squadra_reale, ruolo, prezzo, import_batch_id
  )
  select stagione_id, lega_codice, societa_id, giocatore, giocatore_normalizzato,
    squadra_reale, ruolo, prezzo, import_batch_id
  from rose_snapshot_rows
  on conflict (stagione_id, lega_codice, giocatore_normalizzato) do update set
    societa_id = excluded.societa_id,
    giocatore = excluded.giocatore,
    squadra_reale = excluded.squadra_reale,
    ruolo = excluded.ruolo,
    prezzo = excluded.prezzo,
    import_batch_id = excluded.import_batch_id
  where existing.societa_id is distinct from excluded.societa_id
    or existing.giocatore is distinct from excluded.giocatore
    or existing.squadra_reale is distinct from excluded.squadra_reale
    or existing.ruolo is distinct from excluded.ruolo
    or existing.prezzo is distinct from excluded.prezzo;

  delete from public.rose_giocatori current
  where current.stagione_id = p_stagione_id
    and not exists (
      select 1 from rose_snapshot_rows incoming
      where incoming.lega_codice = current.lega_codice
        and incoming.giocatore_normalizzato = current.giocatore_normalizzato
    );

  return query select v_inserted, v_updated, v_removed, v_unchanged;
end;
$$;

revoke all on function public.admin_publish_rose_snapshot(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_publish_rose_snapshot(bigint, uuid, jsonb) to service_role;

commit;
