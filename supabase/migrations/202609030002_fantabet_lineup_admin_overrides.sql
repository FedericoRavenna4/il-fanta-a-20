begin;

create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_fantabet_player_name(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(extensions.unaccent(input)),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

revoke all on function public.normalize_fantabet_player_name(text) from public, anon, authenticated;
grant execute on function public.normalize_fantabet_player_name(text) to service_role;

create or replace function public.admin_upsert_fantabet_lineups(
  p_stagione_id bigint,
  p_numero_giornata integer,
  p_lineups jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_lineup_id bigint;
  v_snapshot_unchanged boolean;
begin
  if p_stagione_id is null
    or not exists (select 1 from public.stagioni season where season.id = p_stagione_id)
    or p_numero_giornata is null
    or p_numero_giornata not between 1 and 38
    or p_lineups is null
    or pg_catalog.jsonb_typeof(p_lineups) <> 'array'
    or pg_catalog.jsonb_array_length(p_lineups) <> 2
  then
    raise exception 'FANTABET_LINEUPS_SCOPE_INVALIDO' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'fantabet-lineups-' || p_stagione_id::text || '-' || p_numero_giornata::text,
      0
    )
  );

  create temporary table incoming_lineups on commit drop as
  select
    row.societa_id,
    nullif(pg_catalog.btrim(row.modulo), '') as modulo,
    row.players,
    row.captain_order,
    row.vice_captain_order,
    row.player_ids,
    row.captain,
    row.vice_captain,
    case
      when row.players is not null and row.player_ids is null and row.captain is null and row.vice_captain is null then 'new'
      when row.players is null and row.captain_order is null and row.vice_captain_order is null
        and row.player_ids is not null and row.captain is not null and row.vice_captain is not null then 'legacy'
      else 'invalid'
    end as payload_format
  from pg_catalog.jsonb_to_recordset(p_lineups) as row(
    societa_id bigint,
    modulo text,
    players jsonb,
    captain_order smallint,
    vice_captain_order smallint,
    player_ids jsonb,
    captain jsonb,
    vice_captain jsonb
  );

  if (select count(*) from incoming_lineups) <> 2
    or (select count(distinct lineup.societa_id) from incoming_lineups lineup) <> 2
    or exists (
      select 1
      from incoming_lineups lineup
      where lineup.societa_id is null
        or not exists (select 1 from public.societa team where team.id = lineup.societa_id)
        or (lineup.modulo is not null and lineup.modulo !~ '^[0-9](-[0-9]){2,4}$')
        or lineup.payload_format = 'invalid'
        or (lineup.payload_format = 'new' and (
          pg_catalog.jsonb_typeof(lineup.players) <> 'array'
          or pg_catalog.jsonb_array_length(lineup.players) <> 11
          or lineup.captain_order is null or lineup.captain_order not between 1 and 11
          or lineup.vice_captain_order is null or lineup.vice_captain_order not between 1 and 11
          or lineup.captain_order = lineup.vice_captain_order
        ))
    )
  then
    raise exception 'FANTABET_LINEUPS_INVALIDE' using errcode = '22023';
  end if;

  if (select count(distinct lineup.payload_format) from incoming_lineups lineup) <> 1 then
    raise exception 'FANTABET_LINEUPS_FORMATO_AMBIGUO' using errcode = '22023';
  end if;

  if exists (select 1 from incoming_lineups lineup where lineup.payload_format = 'legacy') then
    if exists (
      select 1 from incoming_lineups lineup
      where pg_catalog.jsonb_typeof(lineup.player_ids) <> 'array'
        or pg_catalog.jsonb_array_length(lineup.player_ids) <> 11
        or pg_catalog.jsonb_typeof(lineup.captain) <> 'number'
        or pg_catalog.jsonb_typeof(lineup.vice_captain) <> 'number'
        or lineup.captain = lineup.vice_captain
    ) or exists (
      select 1
      from incoming_lineups lineup
      cross join lateral pg_catalog.jsonb_array_elements(lineup.player_ids) player(value)
      where pg_catalog.jsonb_typeof(player.value) <> 'number'
        or player.value #>> '{}' !~ '^[1-9][0-9]*$'
        or pg_catalog.length(player.value #>> '{}') > 19
        or (pg_catalog.length(player.value #>> '{}') = 19 and player.value #>> '{}' > '9223372036854775807')
    ) or exists (
      select 1 from incoming_lineups lineup
      where lineup.captain #>> '{}' !~ '^[1-9][0-9]*$'
        or lineup.vice_captain #>> '{}' !~ '^[1-9][0-9]*$'
        or not (lineup.player_ids @> pg_catalog.jsonb_build_array(lineup.captain))
        or not (lineup.player_ids @> pg_catalog.jsonb_build_array(lineup.vice_captain))
    ) or exists (
      select 1
      from incoming_lineups lineup
      cross join lateral pg_catalog.jsonb_array_elements(lineup.player_ids) player(value)
      group by lineup.societa_id
      having count(*) <> 11 or count(distinct player.value #>> '{}') <> 11
    ) then
      raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode = '22023';
    end if;

    update incoming_lineups lineup
    set players = (
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'source', 'roster', 'roster_player_id', player.value
      ) order by player.ordinality)
      from pg_catalog.jsonb_array_elements(lineup.player_ids) with ordinality player(value, ordinality)
    ),
    captain_order = (
      select player.ordinality::smallint
      from pg_catalog.jsonb_array_elements(lineup.player_ids) with ordinality player(value, ordinality)
      where player.value = lineup.captain
    ),
    vice_captain_order = (
      select player.ordinality::smallint
      from pg_catalog.jsonb_array_elements(lineup.player_ids) with ordinality player(value, ordinality)
      where player.value = lineup.vice_captain
    );
  end if;

  if not exists (
    select 1
    from public.partite game
    join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
    where edition.stagione_id = p_stagione_id
      and game.giornata_lega = p_numero_giornata
      and game.societa_casa_id in (select lineup.societa_id from incoming_lineups lineup)
      and game.societa_trasferta_id in (select lineup.societa_id from incoming_lineups lineup)
  )
  then
    raise exception 'FANTABET_LINEUPS_PARTITA_FUORI_SCOPE' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.fantabet_rounds round
    where round.stagione_id = p_stagione_id and round.numero_giornata = p_numero_giornata
  ) and not exists (
    select 1
    from public.fantabet_rounds round
    join public.fantabet_bets bet on bet.round_id = round.id
    join public.partite game on game.id = bet.partita_id
    where round.stagione_id = p_stagione_id
      and round.numero_giornata = p_numero_giornata
      and game.societa_casa_id in (select lineup.societa_id from incoming_lineups lineup)
      and game.societa_trasferta_id in (select lineup.societa_id from incoming_lineups lineup)
  )
  then
    raise exception 'FANTABET_LINEUPS_PARTITA_NON_SELEZIONATA' using errcode = '22023';
  end if;

  create temporary table lineup_leagues on commit drop as
  select lineup.societa_id, pg_catalog.min(roster.lega_codice) as lega_codice
  from incoming_lineups lineup
  join public.rose_giocatori roster
    on roster.stagione_id = p_stagione_id and roster.societa_id = lineup.societa_id
  group by lineup.societa_id
  having count(distinct roster.lega_codice) = 1;

  if (select count(*) from lineup_leagues) <> 2 then
    raise exception 'FANTABET_LINEUPS_LEGA_INVALIDA' using errcode = '22023';
  end if;

  create temporary table incoming_players on commit drop as
  select
    lineup.societa_id,
    player.ordinality::smallint as ordine,
    player.value as raw_player,
    player.value ->> 'source' as source,
    player.value -> 'roster_player_id' as raw_roster_player_id,
    player.value ->> 'player' as manual_player,
    player.value ->> 'role' as manual_role,
    player.value -> 'override_confirmed' as raw_override_confirmed
  from incoming_lineups lineup
  cross join lateral pg_catalog.jsonb_array_elements(lineup.players)
    with ordinality as player(value, ordinality);

  if (select count(*) from incoming_players) <> 22
    or exists (
      select 1
      from incoming_players player
      where pg_catalog.jsonb_typeof(player.raw_player) <> 'object'
        or player.source is null
        or player.source not in ('roster', 'manual')
        or (
          player.source = 'roster'
          and (
            player.raw_roster_player_id is null
            or pg_catalog.jsonb_typeof(player.raw_roster_player_id) <> 'number'
            or player.raw_roster_player_id #>> '{}' !~ '^[1-9][0-9]*$'
            or pg_catalog.length(player.raw_roster_player_id #>> '{}') > 19
            or (
              pg_catalog.length(player.raw_roster_player_id #>> '{}') = 19
              and player.raw_roster_player_id #>> '{}' > '9223372036854775807'
            )
            or player.manual_player is not null
            or player.manual_role is not null
          )
        )
        or (
          player.source = 'manual'
          and (
            player.raw_roster_player_id is not null
            or player.manual_player is null
            or pg_catalog.char_length(pg_catalog.btrim(player.manual_player)) not between 1 and 120
            or public.normalize_fantabet_player_name(player.manual_player) = ''
            or player.manual_role not in ('P', 'D', 'C', 'A')
            or player.raw_override_confirmed is distinct from 'true'::jsonb
          )
        )
    )
  then
    raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode = '22023';
  end if;

  create temporary table resolved_players (
    societa_id bigint not null,
    ordine smallint not null,
    giocatore text not null,
    giocatore_normalizzato text not null,
    ruolo text not null,
    primary key (societa_id, ordine)
  ) on commit drop;

  insert into resolved_players (societa_id, ordine, giocatore, giocatore_normalizzato, ruolo)
  select
    player.societa_id,
    player.ordine,
    roster.giocatore,
    roster.giocatore_normalizzato,
    roster.ruolo
  from incoming_players player
  join public.rose_giocatori roster
    on roster.id = (player.raw_roster_player_id #>> '{}')::bigint
   and roster.stagione_id = p_stagione_id
  join lineup_leagues league
    on league.societa_id = player.societa_id
   and league.lega_codice = roster.lega_codice
  where player.source = 'roster'
    and (
      roster.societa_id = player.societa_id
      or player.raw_override_confirmed = 'true'::jsonb
    );

  insert into resolved_players (societa_id, ordine, giocatore, giocatore_normalizzato, ruolo)
  select
    player.societa_id,
    player.ordine,
    pg_catalog.btrim(player.manual_player),
    public.normalize_fantabet_player_name(player.manual_player),
    player.manual_role
  from incoming_players player
  where player.source = 'manual';

  if (select count(*) from resolved_players) <> 22
    or exists (
      select 1
      from resolved_players player
      where player.ordine not between 1 and 11
        or pg_catalog.btrim(player.giocatore) = ''
        or pg_catalog.btrim(player.giocatore_normalizzato) = ''
        or player.ruolo not in ('P', 'D', 'C', 'A')
    )
    or exists (
      select 1
      from resolved_players player
      group by player.societa_id, player.giocatore_normalizzato
      having count(*) > 1
    )
  then
    raise exception 'FANTABET_TITOLARI_INVALIDI' using errcode = '22023';
  end if;

  for v_item in select * from incoming_lineups loop
    v_lineup_id := null;
    v_snapshot_unchanged := false;

    select
      existing.id,
      (select count(*) from public.fantabet_lineup_players saved where saved.lineup_id = existing.id) = 11
      and not exists (
        select 1
        from resolved_players incoming
        left join public.fantabet_lineup_players saved
          on saved.lineup_id = existing.id and saved.ordine = incoming.ordine
        where incoming.societa_id = v_item.societa_id
          and (
            saved.giocatore is distinct from incoming.giocatore
            or saved.giocatore_normalizzato is distinct from incoming.giocatore_normalizzato
            or saved.ruolo is distinct from incoming.ruolo
          )
      )
    into v_lineup_id, v_snapshot_unchanged
    from public.fantabet_lineups existing
    where existing.stagione_id = p_stagione_id
      and existing.numero_giornata = p_numero_giornata
      and existing.societa_id = v_item.societa_id;

    if pg_catalog.coalesce(v_snapshot_unchanged, false) then
      if exists (
        select 1
        from public.fantabet_lineups existing
        where existing.id = v_lineup_id
          and existing.modulo is not distinct from v_item.modulo
          and existing.captain_order is not distinct from v_item.captain_order
          and existing.vice_captain_order is not distinct from v_item.vice_captain_order
      ) then
        continue;
      end if;

      update public.fantabet_lineups
      set modulo = v_item.modulo,
          captain_order = v_item.captain_order,
          vice_captain_order = v_item.vice_captain_order,
          updated_at = pg_catalog.clock_timestamp()
      where id = v_lineup_id;
      continue;
    end if;

    insert into public.fantabet_lineups as current (
      stagione_id, numero_giornata, societa_id, modulo, captain_order, vice_captain_order
    )
    values (
      p_stagione_id, p_numero_giornata, v_item.societa_id, v_item.modulo,
      v_item.captain_order, v_item.vice_captain_order
    )
    on conflict (stagione_id, numero_giornata, societa_id) do update
    set modulo = excluded.modulo,
        captain_order = excluded.captain_order,
        vice_captain_order = excluded.vice_captain_order,
        updated_at = pg_catalog.clock_timestamp()
    returning id into v_lineup_id;

    delete from public.fantabet_lineup_players saved where saved.lineup_id = v_lineup_id;

    insert into public.fantabet_lineup_players (
      lineup_id, giocatore, giocatore_normalizzato, ruolo, ordine
    )
    select
      v_lineup_id, player.giocatore, player.giocatore_normalizzato, player.ruolo, player.ordine
    from resolved_players player
    where player.societa_id = v_item.societa_id
    order by player.ordine;
  end loop;

  return true;
end;
$$;

revoke all on function public.admin_upsert_fantabet_lineups(bigint, integer, jsonb)
from public, anon, authenticated;
grant execute on function public.admin_upsert_fantabet_lineups(bigint, integer, jsonb)
to service_role;

commit;
