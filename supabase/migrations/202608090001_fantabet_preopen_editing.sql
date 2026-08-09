begin;

-- Una round pubblicata resta configurabile soltanto finché la sua finestra non è iniziata.
create or replace function public.validate_fantabet_round_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total_bets integer;
  valid_bets integer;
  distinct_matches integer;
  distinct_orders integer;
  config_changed boolean;
begin
  if tg_op = 'UPDATE' then
    config_changed :=
      new.stagione_id is distinct from old.stagione_id
      or new.numero_giornata is distinct from old.numero_giornata
      or new.opens_at is distinct from old.opens_at
      or new.deadline_at is distinct from old.deadline_at
      or new.round_type is distinct from old.round_type
      or new.rules_version is distinct from old.rules_version
      or new.required_predictions is distinct from old.required_predictions
      or new.perfect_multiplier is distinct from old.perfect_multiplier
      or new.consistency_block_size is distinct from old.consistency_block_size
      or new.consistency_bonus_points is distinct from old.consistency_bonus_points;

    if old.status <> 'bozza' and config_changed and not (
      old.status = 'pubblicata'
      and statement_timestamp() < old.opens_at
      and statement_timestamp() < new.opens_at
    ) then
      raise exception 'FANTABET_CONFIGURAZIONE_APERTA_IMMUTABILE' using errcode = '55000';
    end if;

    if old.status <> new.status and not (
      (old.status = 'bozza' and new.status in ('pubblicata', 'annullata'))
      or (old.status = 'pubblicata' and new.status in ('chiusa', 'annullata'))
      or (old.status = 'chiusa' and new.status in ('valutata', 'annullata'))
    ) then
      raise exception 'FANTABET_TRANSIZIONE_STATO_NON_VALIDA' using errcode = '22023';
    end if;
  end if;

  if new.status = 'pubblicata' and tg_op = 'INSERT' then
    raise exception 'FANTABET_CREARE_PRIMA_LA_BOZZA' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and new.status = 'pubblicata' and old.status <> 'pubblicata' then
    if new.deadline_at <= statement_timestamp() then
      raise exception 'FANTABET_DEADLINE_GIA_TRASCORSA' using errcode = '22023';
    end if;
    if new.round_type <> 'STANDARD' or new.rules_version <> 1
      or new.required_predictions <> 5 or new.perfect_multiplier <> 2
      or new.consistency_block_size <> 5 or new.consistency_bonus_points <> 10 then
      raise exception 'FANTABET_REGOLE_NON_SUPPORTATE' using errcode = '22023';
    end if;
    select count(*), count(*) filter (where
      (bet_type = '1X2' and points_value = 3)
      or (bet_type = 'UNDER_OVER_2_5' and points_value = 1)
      or (bet_type = 'RISULTATO_ESATTO' and points_value = 10)
      or (bet_type = 'FANTAPUNTEGGIO_1X2' and points_value = 2)
    ), count(distinct partita_id), count(distinct display_order)
    into total_bets, valid_bets, distinct_matches, distinct_orders
    from public.fantabet_bets where round_id = new.id;
    if total_bets <> 5 or valid_bets <> 5 or distinct_matches <> 5 or distinct_orders <> 5
      or (select count(*) from public.fantabet_bets where round_id = new.id and bet_type = '1X2') <> 2
      or (select count(*) from public.fantabet_bets where round_id = new.id and bet_type = 'UNDER_OVER_2_5') <> 1
      or (select count(*) from public.fantabet_bets where round_id = new.id and bet_type = 'RISULTATO_ESATTO') <> 1
      or (select count(*) from public.fantabet_bets where round_id = new.id and bet_type = 'FANTAPUNTEGGIO_1X2') <> 1 then
      raise exception 'FANTABET_ROUND_NON_PUBBLICABILE' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_published_fantabet_bets()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_round_id bigint;
  round_status text;
  round_opens_at timestamptz;
begin
  target_round_id := case when tg_op = 'DELETE' then old.round_id else new.round_id end;
  select status, opens_at into round_status, round_opens_at
  from public.fantabet_rounds where id = target_round_id;
  if round_status <> 'bozza' and not (round_status = 'pubblicata' and statement_timestamp() < round_opens_at) then
    raise exception 'FANTABET_GIOCATE_APERTE_IMMUTABILI' using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and new.round_id <> old.round_id then
    raise exception 'FANTABET_ROUND_GIOCATA_IMMUTABILE' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.validate_fantabet_round_publication() from public, anon, authenticated;
revoke all on function public.protect_published_fantabet_bets() from public, anon, authenticated;

commit;
