begin;

alter table public.edizioni_competizioni add column if not exists calendar_revision bigint not null default 0;

create or replace function private.bump_calendar_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.edizioni_competizioni set calendar_revision=calendar_revision+1
  where id=case when tg_op='DELETE' then old.edizione_competizione_id else new.edizione_competizione_id end;
  return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists partite_calendar_revision on public.partite;
create trigger partite_calendar_revision after insert or update or delete on public.partite for each row execute function private.bump_calendar_revision();
drop trigger if exists riposi_calendar_revision on public.riposi_competizione;
create trigger riposi_calendar_revision after insert or update or delete on public.riposi_competizione for each row execute function private.bump_calendar_revision();
revoke all on function private.bump_calendar_revision() from public,anon,authenticated;
grant execute on function private.bump_calendar_revision() to service_role;

create or replace function public.admin_calendar_preview_state(p_edizione_competizione_id bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calendar-snapshot-'||p_edizione_competizione_id::text,0));
  if not exists(select 1 from public.edizioni_competizioni where id=p_edizione_competizione_id) then raise exception 'CALENDAR_EDITION_NOT_FOUND' using errcode='P0002';end if;
  select pg_catalog.jsonb_build_object(
    'calendarRevision',edition.calendar_revision,
    'matches',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(game) order by game.id) from public.partite game where game.edizione_competizione_id=edition.id),'[]'::jsonb),
    'rests',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(rest) order by rest.id) from public.riposi_competizione rest where rest.edizione_competizione_id=edition.id),'[]'::jsonb)
  ) into result from public.edizioni_competizioni edition where edition.id=p_edizione_competizione_id;
  return result;
end $$;
revoke all on function public.admin_calendar_preview_state(bigint) from public,anon,authenticated;
grant execute on function public.admin_calendar_preview_state(bigint) to service_role;

create or replace function public.admin_publish_calendar_snapshot(p_import_id uuid,p_admin_id uuid,p_expected_revision bigint,p_matches jsonb,p_rests jsonb)
returns table(inserted bigint,updated bigint,removed bigint,unchanged bigint,import_state text,already_published boolean)
language plpgsql security definer set search_path='' as $$
declare t public.importazioni%rowtype; rev bigint; ins bigint; upd bigint; rem bigint; same bigint; final_state text;
begin
  -- Admin authorization is intentionally enforced by requireImportAdmin(), whose
  -- authoritative allowlist lives in the server-only ADMIN_IMPORT_EMAILS setting.
  -- This service-role-only RPC additionally binds that verified identity to the
  -- import owner; there is no independent DB role table to consult.
  if p_admin_id is null or not exists(select 1 from auth.users where id=p_admin_id) then raise exception 'ADMIN_IDENTITY_INVALID' using errcode='42501';end if;
  if pg_catalog.jsonb_typeof(p_matches) is distinct from 'array' or pg_catalog.jsonb_typeof(p_rests) is distinct from 'array' then raise exception 'CALENDAR_SNAPSHOT_INVALID' using errcode='22023';end if;
  if exists(select 1 from pg_catalog.jsonb_array_elements(p_matches) element where pg_catalog.jsonb_typeof(element)<>'object') or exists(select 1 from pg_catalog.jsonb_array_elements(p_rests) element where pg_catalog.jsonb_typeof(element)<>'object') then raise exception 'CALENDAR_SNAPSHOT_INVALID' using errcode='22023';end if;
  select * into t from public.importazioni where id=p_import_id for update;
  if not found or t.tipo not in ('calendario_campionato','calendario_coppa') or t.edizione_competizione_id is null or t.importato_da is distinct from p_admin_id then raise exception 'CALENDAR_IMPORT_INVALID' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calendar-snapshot-'||t.edizione_competizione_id::text,0));
  if t.stato in ('pubblicata','pubblicata_con_warning') then return query select t.righe_inserite::bigint,t.righe_aggiornate::bigint,coalesce((t.riepilogo->>'removed')::bigint,0),t.righe_invariate::bigint,t.stato::text,true;return;end if;
  if t.stato<>'anteprima' or t.error_count<>0 then raise exception 'CALENDAR_IMPORT_NOT_PUBLISHABLE';end if;
  select calendar_revision into rev from public.edizioni_competizioni where id=t.edizione_competizione_id and stagione_id=t.stagione_id for update;
  if rev is null or rev is distinct from p_expected_revision or rev is distinct from (t.riepilogo->>'calendarRevision')::bigint then raise exception 'CALENDAR_SNAPSHOT_STALE' using errcode='40001';end if;
  create temporary table im on commit drop as select x.* from pg_catalog.jsonb_to_recordset(p_matches) x(edizione_competizione_id bigint,giornata_lega smallint,giornata_serie_a smallint,societa_casa_id bigint,societa_trasferta_id bigint,fantapunti_casa numeric,fantapunti_trasferta numeric,gol_casa smallint,gol_trasferta smallint,stato text,fonte_importazione text);
  create temporary table ir on commit drop as select x.* from pg_catalog.jsonb_to_recordset(p_rests) x(edizione_competizione_id bigint,giornata_lega smallint,giornata_serie_a smallint,societa_id bigint,fase text,girone text,raggruppamento text);
  if exists(select 1 from im where edizione_competizione_id is null or giornata_lega is null or giornata_lega<=0 or societa_casa_id is null or societa_trasferta_id is null or societa_casa_id=societa_trasferta_id or stato not in ('programmata','calcolata','rinviata','annullata'))
    or exists(select 1 from ir where edizione_competizione_id is null or giornata_lega is null or giornata_lega<=0 or societa_id is null) then raise exception 'CALENDAR_SNAPSHOT_INVALID' using errcode='22023';end if;
  if exists(select 1 from im where stato='calcolata' and (fantapunti_casa is null or fantapunti_trasferta is null or gol_casa is null or gol_trasferta is null)) then raise exception 'CALENDAR_SNAPSHOT_INVALID' using errcode='22023';end if;
  if exists(select 1 from im where edizione_competizione_id<>t.edizione_competizione_id) or exists(select 1 from ir where edizione_competizione_id<>t.edizione_competizione_id) then raise exception 'CALENDAR_SCOPE_MISMATCH';end if;
  if exists(select 1 from im group by giornata_lega,societa_casa_id,societa_trasferta_id having count(*)>1) or exists(select 1 from ir group by giornata_lega,societa_id having count(*)>1) then raise exception 'CALENDAR_SNAPSHOT_DUPLICATE';end if;
  if (select count(*) from im) is distinct from (t.riepilogo->>'partite')::bigint or (select count(*) from ir) is distinct from (t.riepilogo->>'riposi')::bigint then raise exception 'CALENDAR_SNAPSHOT_STALE' using errcode='40001';end if;
  if t.tipo='calendario_campionato' and ((select count(*) from im)<>380 or (select count(distinct giornata_lega) from im)<>38 or exists(
    select 1 from (select giornata_lega,count(*) match_count from im group by giornata_lega) day
    where day.match_count<>10 or (select count(distinct participant.societa_id) from (
      select societa_casa_id societa_id from im where giornata_lega=day.giornata_lega
      union all select societa_trasferta_id from im where giornata_lega=day.giornata_lega
    ) participant)<>20
  )) then raise exception 'CALENDAR_SNAPSHOT_INCOMPLETE' using errcode='22023';end if;
  -- These are the same destructive guards used by the current runtime plan.
  if exists(select 1 from public.partite p where p.edizione_competizione_id=t.edizione_competizione_id and p.stato='calcolata' and not exists(select 1 from im i where i.giornata_lega=p.giornata_lega and i.societa_casa_id=p.societa_casa_id and i.societa_trasferta_id=p.societa_trasferta_id)) then raise exception 'CALENDAR_CALCULATED_MATCH_MISSING' using errcode='22023';end if;
  if exists(select 1 from public.partite p where p.edizione_competizione_id=t.edizione_competizione_id and not exists(select 1 from im i where i.giornata_lega=p.giornata_lega and i.societa_casa_id=p.societa_casa_id and i.societa_trasferta_id=p.societa_trasferta_id) and (
    exists(select 1 from public.fantabet_bets b where b.partita_id=p.id) or exists(select 1 from public.fantabet_support_match_events e where e.partita_id=p.id)
  )) then raise exception 'CALENDAR_OBSOLETE_MATCH_HAS_DEPENDENCIES' using errcode='23503';end if;
  select count(*) into ins from im i where not exists(select 1 from public.partite p where p.edizione_competizione_id=t.edizione_competizione_id and p.giornata_lega=i.giornata_lega and p.societa_casa_id=i.societa_casa_id and p.societa_trasferta_id=i.societa_trasferta_id);
  select count(*) into upd from im i join public.partite p on p.edizione_competizione_id=t.edizione_competizione_id and p.giornata_lega=i.giornata_lega and p.societa_casa_id=i.societa_casa_id and p.societa_trasferta_id=i.societa_trasferta_id where (p.giornata_serie_a,p.fantapunti_casa,p.fantapunti_trasferta,p.gol_casa,p.gol_trasferta,p.stato) is distinct from (i.giornata_serie_a,i.fantapunti_casa,i.fantapunti_trasferta,i.gol_casa,i.gol_trasferta,i.stato);
  select count(*) into rem from public.partite p where p.edizione_competizione_id=t.edizione_competizione_id and not exists(select 1 from im i where i.giornata_lega=p.giornata_lega and i.societa_casa_id=p.societa_casa_id and i.societa_trasferta_id=p.societa_trasferta_id);
  same=(select count(*) from im)-ins-upd;
  ins=ins+(select count(*) from ir i where not exists(select 1 from public.riposi_competizione r where r.edizione_competizione_id=t.edizione_competizione_id and r.giornata_lega=i.giornata_lega and r.societa_id=i.societa_id));
  upd=upd+(select count(*) from ir i join public.riposi_competizione r on r.edizione_competizione_id=t.edizione_competizione_id and r.giornata_lega=i.giornata_lega and r.societa_id=i.societa_id where (r.giornata_serie_a,r.fase,r.girone,r.raggruppamento) is distinct from (i.giornata_serie_a,i.fase,i.girone,i.raggruppamento));
  same=same+(select count(*) from ir i join public.riposi_competizione r on r.edizione_competizione_id=t.edizione_competizione_id and r.giornata_lega=i.giornata_lega and r.societa_id=i.societa_id where (r.giornata_serie_a,r.fase,r.girone,r.raggruppamento) is not distinct from (i.giornata_serie_a,i.fase,i.girone,i.raggruppamento));
  rem=rem+(select count(*) from public.riposi_competizione r where r.edizione_competizione_id=t.edizione_competizione_id and not exists(select 1 from ir i where i.giornata_lega=r.giornata_lega and i.societa_id=r.societa_id));
  if ins<>(t.riepilogo->>'insert')::bigint or upd<>(t.riepilogo->>'update')::bigint or rem<>coalesce((t.riepilogo->>'removed')::bigint,0) or same<>(t.riepilogo->>'unchanged')::bigint then raise exception 'CALENDAR_SNAPSHOT_STALE' using errcode='40001';end if;
  insert into public.partite as current(edizione_competizione_id,giornata_lega,giornata_serie_a,societa_casa_id,societa_trasferta_id,fantapunti_casa,fantapunti_trasferta,gol_casa,gol_trasferta,stato,fonte_importazione,import_batch_id) select *,p_import_id from im on conflict(edizione_competizione_id,giornata_lega,societa_casa_id,societa_trasferta_id) do update set giornata_serie_a=excluded.giornata_serie_a,fantapunti_casa=excluded.fantapunti_casa,fantapunti_trasferta=excluded.fantapunti_trasferta,gol_casa=excluded.gol_casa,gol_trasferta=excluded.gol_trasferta,stato=excluded.stato,fonte_importazione=excluded.fonte_importazione,import_batch_id=excluded.import_batch_id where (current.giornata_serie_a,current.fantapunti_casa,current.fantapunti_trasferta,current.gol_casa,current.gol_trasferta,current.stato) is distinct from (excluded.giornata_serie_a,excluded.fantapunti_casa,excluded.fantapunti_trasferta,excluded.gol_casa,excluded.gol_trasferta,excluded.stato);
  delete from public.partite p where p.edizione_competizione_id=t.edizione_competizione_id and not exists(select 1 from im i where i.giornata_lega=p.giornata_lega and i.societa_casa_id=p.societa_casa_id and i.societa_trasferta_id=p.societa_trasferta_id);
  insert into public.riposi_competizione as current(edizione_competizione_id,giornata_lega,giornata_serie_a,societa_id,fase,girone,raggruppamento,import_batch_id) select *,p_import_id from ir on conflict(edizione_competizione_id,giornata_lega,societa_id) do update set giornata_serie_a=excluded.giornata_serie_a,fase=excluded.fase,girone=excluded.girone,raggruppamento=excluded.raggruppamento,import_batch_id=excluded.import_batch_id where (current.giornata_serie_a,current.fase,current.girone,current.raggruppamento) is distinct from (excluded.giornata_serie_a,excluded.fase,excluded.girone,excluded.raggruppamento);
  delete from public.riposi_competizione r where r.edizione_competizione_id=t.edizione_competizione_id and not exists(select 1 from ir i where i.giornata_lega=r.giornata_lega and i.societa_id=r.societa_id);
  final_state=case when t.warning_count>0 then 'pubblicata_con_warning' else 'pubblicata' end;
  update public.importazioni set stato=final_state,completata_il=statement_timestamp(),righe_inserite=ins,righe_aggiornate=upd,righe_invariate=same,riepilogo=riepilogo||jsonb_build_object('removed',rem) where id=t.id;
  return query select ins,upd,rem,same,final_state,false;
end $$;
revoke all on function public.admin_publish_calendar_snapshot(uuid,uuid,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_publish_calendar_snapshot(uuid,uuid,bigint,jsonb,jsonb) to service_role;
commit;
