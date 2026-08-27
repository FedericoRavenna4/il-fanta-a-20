begin;

create table public.fantabet_lineups (
  id bigint generated always as identity primary key,
  stagione_id bigint not null references public.stagioni(id) on delete restrict,
  numero_giornata integer not null check (numero_giornata between 1 and 38),
  societa_id bigint not null references public.societa(id) on delete restrict,
  modulo text null check (modulo is null or modulo ~ '^[0-9](-[0-9]){2,4}$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (stagione_id, numero_giornata, societa_id)
);

-- Snapshot consultivo: nessuna FK verso rose_giocatori. La Rosa corrente viene
-- validata nella RPC, ma i suoi DELETE/reimport non devono mai essere bloccati.
create table public.fantabet_lineup_players (
  lineup_id bigint not null references public.fantabet_lineups(id) on delete cascade,
  giocatore text not null check (pg_catalog.btrim(giocatore) <> ''),
  giocatore_normalizzato text not null check (pg_catalog.btrim(giocatore_normalizzato) <> ''),
  ruolo text not null check (ruolo in ('P','D','C','A')),
  ordine smallint not null check (ordine between 1 and 11),
  primary key (lineup_id, ordine)
);

create index fantabet_lineups_round_idx on public.fantabet_lineups (stagione_id, numero_giornata);
alter table public.fantabet_lineups enable row level security;
alter table public.fantabet_lineup_players enable row level security;
revoke all on public.fantabet_lineups, public.fantabet_lineup_players from public, anon, authenticated;
grant select, insert, update, delete on public.fantabet_lineups, public.fantabet_lineup_players to service_role;
grant usage, select on sequence public.fantabet_lineups_id_seq to service_role;

create function public.admin_upsert_fantabet_lineups(p_stagione_id bigint, p_numero_giornata integer, p_lineups jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_item record; v_lineup_id bigint; v_count integer; v_unchanged boolean;
begin
  if p_stagione_id is null or not exists (select 1 from public.stagioni where id=p_stagione_id)
    or p_numero_giornata is null or p_numero_giornata not between 1 and 38
    or p_lineups is null or pg_catalog.jsonb_typeof(p_lineups)<>'array' or pg_catalog.jsonb_array_length(p_lineups)<>2 then
    raise exception 'FANTABET_LINEUPS_SCOPE_INVALIDO' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fantabet-lineups-'||p_stagione_id::text||'-'||p_numero_giornata::text,0));
  create temporary table incoming_lineups on commit drop as
    select row.societa_id, nullif(pg_catalog.btrim(row.modulo),'') as modulo, row.player_ids
    from pg_catalog.jsonb_to_recordset(p_lineups) row(societa_id bigint, modulo text, player_ids jsonb);
  if (select count(*) from incoming_lineups)<>2 or (select count(distinct societa_id) from incoming_lineups)<>2
    or exists(select 1 from incoming_lineups where societa_id is null or not exists(select 1 from public.societa s where s.id=incoming_lineups.societa_id)
      or (modulo is not null and modulo !~ '^[0-9](-[0-9]){2,4}$')) then
    raise exception 'FANTABET_LINEUPS_INVALIDE' using errcode='22023';
  end if;
  if exists(select 1 from incoming_lineups where player_ids is null or coalesce(pg_catalog.jsonb_typeof(player_ids),'null')<>'array') then
    raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode='22023';
  end if;
  if exists(select 1 from incoming_lineups where pg_catalog.jsonb_array_length(player_ids)<>11) then
    raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode='22023';
  end if;
  create temporary table incoming_players on commit drop as
    select lineup.societa_id,player.ordinality::smallint as ordine,player.value as raw_id,player.value #>> '{}' as player_id_text
    from incoming_lineups lineup cross join lateral pg_catalog.jsonb_array_elements(lineup.player_ids) with ordinality player;
  if exists (
    select 1 from incoming_players where pg_catalog.jsonb_typeof(raw_id)<>'number'
      or player_id_text !~ '^[0-9]+$' or player_id_text='0' or pg_catalog.length(player_id_text)>19
      or (pg_catalog.length(player_id_text)=19 and player_id_text>'9223372036854775807')
  ) or exists (
    select 1 from incoming_players group by societa_id having count(*)<>11 or count(distinct player_id_text)<>11
  ) then raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode='22023'; end if;
  if not exists (
    select 1 from public.partite game join public.edizioni_competizioni edition on edition.id=game.edizione_competizione_id
    where edition.stagione_id=p_stagione_id and game.giornata_lega=p_numero_giornata
      and game.societa_casa_id in (select societa_id from incoming_lineups)
      and game.societa_trasferta_id in (select societa_id from incoming_lineups)
  ) then raise exception 'FANTABET_LINEUPS_PARTITA_FUORI_SCOPE' using errcode='22023'; end if;
  if exists (select 1 from public.fantabet_rounds where stagione_id=p_stagione_id and numero_giornata=p_numero_giornata)
    and not exists (
      select 1 from public.fantabet_rounds round join public.fantabet_bets bet on bet.round_id=round.id join public.partite game on game.id=bet.partita_id
      where round.stagione_id=p_stagione_id and round.numero_giornata=p_numero_giornata
        and game.societa_casa_id in (select societa_id from incoming_lineups)
        and game.societa_trasferta_id in (select societa_id from incoming_lineups)
    ) then raise exception 'FANTABET_LINEUPS_PARTITA_NON_SELEZIONATA' using errcode='22023'; end if;

  for v_item in select * from incoming_lineups loop
    select count(*) into v_count from incoming_players players
      join public.rose_giocatori roster on roster.id=players.player_id_text::bigint and roster.stagione_id=p_stagione_id and roster.societa_id=v_item.societa_id
      where players.societa_id=v_item.societa_id;
    if v_count<>11 then raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode='22023'; end if;
    v_lineup_id:=null; v_unchanged:=false;
    select existing.id, existing.modulo is not distinct from v_item.modulo
      and (select count(*) from public.fantabet_lineup_players saved where saved.lineup_id=existing.id)=11
      and not exists (
        select 1 from incoming_players incoming
        join public.rose_giocatori roster on roster.id=incoming.player_id_text::bigint
        left join public.fantabet_lineup_players saved on saved.lineup_id=existing.id and saved.ordine=incoming.ordine
        where incoming.societa_id=v_item.societa_id and (saved.giocatore_normalizzato is distinct from roster.giocatore_normalizzato
          or saved.giocatore is distinct from roster.giocatore or saved.ruolo is distinct from roster.ruolo
        )
      ) into v_lineup_id,v_unchanged
    from public.fantabet_lineups existing
    where existing.stagione_id=p_stagione_id and existing.numero_giornata=p_numero_giornata and existing.societa_id=v_item.societa_id;
    if coalesce(v_unchanged,false) then continue; end if;
    insert into public.fantabet_lineups as current(stagione_id,numero_giornata,societa_id,modulo)
      values(p_stagione_id,p_numero_giornata,v_item.societa_id,v_item.modulo)
      on conflict(stagione_id,numero_giornata,societa_id) do update set modulo=excluded.modulo,updated_at=clock_timestamp()
      returning id into v_lineup_id;
    delete from public.fantabet_lineup_players where lineup_id=v_lineup_id;
    insert into public.fantabet_lineup_players(lineup_id,giocatore,giocatore_normalizzato,ruolo,ordine)
      select v_lineup_id,roster.giocatore,roster.giocatore_normalizzato,roster.ruolo,player.ordinality::smallint
      from incoming_players player join public.rose_giocatori roster on roster.id=player.player_id_text::bigint
      where player.societa_id=v_item.societa_id order by player.ordine;
  end loop;
  return true;
end; $$;
revoke all on function public.admin_upsert_fantabet_lineups(bigint,integer,jsonb) from public,anon,authenticated;
grant execute on function public.admin_upsert_fantabet_lineups(bigint,integer,jsonb) to service_role;

create function public.public_fantabet_lineups(p_stagione_id bigint,p_numero_giornata integer,p_societa_ids bigint[])
returns table(societa_id bigint,societa_nome text,modulo text,players jsonb)
language sql stable security definer set search_path='' as $$
  select lineup.societa_id,coalesce(nullif(pg_catalog.btrim(team.nome_personalizzato),''),team.nome_ufficiale),lineup.modulo,
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('order',entry.ordine,'name',entry.giocatore,'role',entry.ruolo) order by entry.ordine)
  from public.fantabet_lineups lineup join public.societa team on team.id=lineup.societa_id
  join public.fantabet_lineup_players entry on entry.lineup_id=lineup.id
  where lineup.stagione_id=p_stagione_id and lineup.numero_giornata=p_numero_giornata and lineup.societa_id=any(p_societa_ids)
  group by lineup.id,lineup.societa_id,coalesce(nullif(pg_catalog.btrim(team.nome_personalizzato),''),team.nome_ufficiale),lineup.modulo having count(*)=11;
$$;
revoke all on function public.public_fantabet_lineups(bigint,integer,bigint[]) from public;
grant execute on function public.public_fantabet_lineups(bigint,integer,bigint[]) to anon,authenticated,service_role;

commit;
