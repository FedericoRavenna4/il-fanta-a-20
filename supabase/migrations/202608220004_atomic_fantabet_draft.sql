begin;

create or replace function public.admin_save_fantabet_draft(
  p_round_id bigint,
  p_expected_updated_at timestamptz,
  p_stagione_id bigint,
  p_numero_giornata integer,
  p_opens_at timestamptz,
  p_deadline_at timestamptz,
  p_bets jsonb
)
returns table(round_id bigint, updated_at timestamptz, unchanged boolean)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_round public.fantabet_rounds%rowtype;
  v_round_id bigint;
  v_updated_at timestamptz;
  v_unchanged boolean:=false;
begin
  if p_stagione_id is null or not exists(select 1 from public.stagioni where id=p_stagione_id)
    or p_numero_giornata is null or p_numero_giornata not between 1 and 38
    or p_opens_at is null or p_deadline_at is null or p_opens_at>=p_deadline_at then
    raise exception 'FANTABET_CONFIGURAZIONE_INVALIDA' using errcode='22023';
  end if;
  if p_bets is null or pg_catalog.jsonb_typeof(p_bets)<>'array' or pg_catalog.jsonb_array_length(p_bets)<>5 then
    raise exception 'FANTABET_CINQUE_PARTITE_RICHIESTE' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fantabet-scope-'||p_stagione_id::text||'-'||p_numero_giornata::text,0));
  if p_round_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fantabet-round-'||p_round_id::text,0));
    select * into v_round from public.fantabet_rounds where id=p_round_id for update;
    if not found then raise exception 'FANTABET_ROUND_NON_TROVATA' using errcode='P0002';end if;
    if p_expected_updated_at is null or v_round.updated_at is distinct from p_expected_updated_at then
      raise exception 'FANTABET_ROUND_MODIFICATA' using errcode='40001';
    end if;
    if v_round.status<>'bozza' and not(v_round.status='pubblicata' and statement_timestamp()<v_round.opens_at) then
      raise exception 'FANTABET_CONFIGURAZIONE_APERTA_IMMUTABILE' using errcode='55000';
    end if;
  elsif exists(select 1 from public.fantabet_rounds where stagione_id=p_stagione_id and numero_giornata=p_numero_giornata) then
    raise exception 'FANTABET_ROUND_GIA_ESISTENTE' using errcode='23505';
  end if;

  if (select count(distinct (item.partita_id)) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint))<>5
    or (select count(distinct item.display_order) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint))<>5
    or exists(select 1 from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint)
      where item.partita_id is null or item.bet_type is null or item.points_value is null or item.display_order is null
        or item.display_order not between 1 and 5
        or not ((item.bet_type='1X2' and item.points_value=3) or (item.bet_type='UNDER_OVER_2_5' and item.points_value=1)
          or (item.bet_type='RISULTATO_ESATTO' and item.points_value=10) or (item.bet_type='FANTAPUNTEGGIO_1X2' and item.points_value=2)))
    or (select count(*) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint) where item.bet_type='1X2')<>2
    or (select count(*) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint) where item.bet_type='UNDER_OVER_2_5')<>1
    or (select count(*) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint) where item.bet_type='RISULTATO_ESATTO')<>1
    or (select count(*) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint) where item.bet_type='FANTAPUNTEGGIO_1X2')<>1 then
    raise exception 'FANTABET_GIOCATE_INVALIDE' using errcode='22023';
  end if;

  if (select count(*) from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint)
      join public.partite game on game.id=item.partita_id
      join public.edizioni_competizioni edition on edition.id=game.edizione_competizione_id
      where edition.stagione_id=p_stagione_id and game.giornata_lega=p_numero_giornata)<>5 then
    raise exception 'FANTABET_PARTITE_FUORI_SCOPE' using errcode='22023';
  end if;

  if p_round_id is not null
    and v_round.stagione_id=p_stagione_id and v_round.numero_giornata=p_numero_giornata
    and v_round.opens_at=p_opens_at and v_round.deadline_at=p_deadline_at
    and (select count(*) from public.fantabet_bets bet
      join pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint)
        on item.partita_id=bet.partita_id and item.bet_type=bet.bet_type and item.points_value=bet.points_value and item.display_order=bet.display_order
      where bet.round_id=p_round_id)=5
    and (select count(*) from public.fantabet_bets bet where bet.round_id=p_round_id)=5 then
    return query select p_round_id,v_round.updated_at,true;
    return;
  end if;

  if p_round_id is null then
    insert into public.fantabet_rounds(stagione_id,numero_giornata,opens_at,deadline_at,status,round_type,rules_version,required_predictions,perfect_multiplier,consistency_block_size,consistency_bonus_points)
    values(p_stagione_id,p_numero_giornata,p_opens_at,p_deadline_at,'bozza','STANDARD',1,5,2,5,10)
    returning id,public.fantabet_rounds.updated_at into v_round_id,v_updated_at;
  else
    update public.fantabet_rounds set stagione_id=p_stagione_id,numero_giornata=p_numero_giornata,opens_at=p_opens_at,deadline_at=p_deadline_at
    where id=p_round_id returning id,public.fantabet_rounds.updated_at into v_round_id,v_updated_at;
    delete from public.fantabet_bets bet where bet.round_id=v_round_id;
  end if;
  insert into public.fantabet_bets(round_id,partita_id,bet_type,points_value,display_order)
  select v_round_id,item.partita_id,item.bet_type,item.points_value,item.display_order
  from pg_catalog.jsonb_to_recordset(p_bets) item(partita_id bigint,bet_type text,points_value smallint,display_order smallint);
  return query select v_round_id,v_updated_at,v_unchanged;
end;
$$;

revoke all on function public.admin_save_fantabet_draft(bigint,timestamptz,bigint,integer,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.admin_save_fantabet_draft(bigint,timestamptz,bigint,integer,timestamptz,timestamptz,jsonb) to service_role;

commit;
