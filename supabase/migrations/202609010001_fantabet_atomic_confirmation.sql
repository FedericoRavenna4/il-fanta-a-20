begin;

create or replace function public.save_my_fantabet_prediction(
  p_bet_id bigint,
  p_scelta text,
  p_exact_home smallint default null,
  p_exact_away smallint default null
)
returns table (
  id bigint,
  bet_id bigint,
  scelta text,
  exact_home smallint,
  exact_away smallint,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_round_id bigint;
  v_bet_type text;
  v_opens_at timestamptz;
  v_deadline timestamptz;
  v_now timestamptz;
begin
  if v_profile_id is null then
    raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select bet.round_id into v_round_id
  from public.fantabet_bets bet
  where bet.id = p_bet_id;
  if not found then
    raise exception 'FANTABET_GIOCATA_NON_TROVATA' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fantabet-player-' || v_profile_id::text || '-' || v_round_id::text, 0)
  );

  select bet.bet_type, round.opens_at, round.deadline_at
  into v_bet_type, v_opens_at, v_deadline
  from public.fantabet_bets bet
  join public.fantabet_rounds round on round.id = bet.round_id
  where bet.id = p_bet_id and bet.round_id = v_round_id and round.status = 'pubblicata';
  if not found then
    raise exception 'FANTABET_PRONOSTICI_CHIUSI' using errcode = '42501';
  end if;

  v_now := clock_timestamp();
  if v_now < v_opens_at or v_now >= v_deadline then
    raise exception 'FANTABET_PRONOSTICI_CHIUSI' using errcode = '42501';
  end if;

  if (v_bet_type in ('1X2', 'FANTAPUNTEGGIO_1X2') and (
      p_scelta is null or p_scelta not in ('1', 'X', '2')
      or p_exact_home is not null or p_exact_away is not null
    ))
    or (v_bet_type = 'UNDER_OVER_2_5' and (
      p_scelta is null or p_scelta not in ('UNDER', 'OVER')
      or p_exact_home is not null or p_exact_away is not null
    ))
    or (v_bet_type = 'RISULTATO_ESATTO' and (
      p_scelta is null or p_scelta <> 'ESATTO'
      or p_exact_home is null or p_exact_away is null
      or p_exact_home not between 0 and 20 or p_exact_away not between 0 and 20
    ))
    or v_bet_type not in ('1X2', 'FANTAPUNTEGGIO_1X2', 'UNDER_OVER_2_5', 'RISULTATO_ESATTO')
  then
    raise exception 'FANTABET_PRONOSTICO_NON_VALIDO' using errcode = '22023';
  end if;

  insert into public.fantabet_predictions as prediction
    (profile_id, bet_id, scelta, exact_home, exact_away)
  values
    (v_profile_id, p_bet_id, p_scelta, p_exact_home, p_exact_away)
  on conflict (profile_id, bet_id) do update
    set scelta = excluded.scelta,
        exact_home = excluded.exact_home,
        exact_away = excluded.exact_away
    where prediction.scelta is distinct from excluded.scelta
       or prediction.exact_home is distinct from excluded.exact_home
       or prediction.exact_away is distinct from excluded.exact_away;

  return query
  select prediction.id, prediction.bet_id, prediction.scelta,
    prediction.exact_home, prediction.exact_away, clock_timestamp()
  from public.fantabet_predictions prediction
  where prediction.profile_id = v_profile_id and prediction.bet_id = p_bet_id;
end;
$$;

create or replace function public.save_and_confirm_my_fantabet_round(
  p_round_id bigint,
  p_predictions jsonb
)
returns table (
  round_id bigint,
  profile_id uuid,
  submitted_at timestamptz,
  confirmed boolean,
  prediction_count integer,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_required integer;
  v_distinct integer;
  v_opens_at timestamptz;
  v_deadline timestamptz;
  v_now timestamptz;
  v_submitted_at timestamptz;
  v_count integer;
begin
  if v_profile_id is null then
    raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fantabet-player-' || v_profile_id::text || '-' || p_round_id::text, 0)
  );

  select round.required_predictions, round.opens_at, round.deadline_at
  into v_required, v_opens_at, v_deadline
  from public.fantabet_rounds round
  where round.id = p_round_id and round.status = 'pubblicata';
  if not found then
    raise exception 'FANTABET_ROUND_NON_CONFERMABILE' using errcode = '22023';
  end if;
  v_now := clock_timestamp();
  if v_now < v_opens_at then
    raise exception 'FANTABET_ROUND_NON_CONFERMABILE' using errcode = '22023';
  end if;
  if v_now >= v_deadline then
    raise exception 'FANTABET_DEADLINE_SCADUTA' using errcode = '42501';
  end if;
  v_submitted_at := v_now;
  if p_predictions is null or jsonb_typeof(p_predictions) <> 'array'
    or jsonb_array_length(p_predictions) <> v_required then
    raise exception 'FANTABET_SCHEDINA_INCOMPLETA' using errcode = '22023';
  end if;

  select count(*)::integer into v_count
  from public.fantabet_bets bet where bet.round_id = p_round_id;
  if v_count <> v_required then
    raise exception 'FANTABET_CONFIGURAZIONE_INVALIDA' using errcode = '22023';
  end if;

  with payload as (
    select * from jsonb_to_recordset(p_predictions) as item(
      bet_id bigint, scelta text, exact_home smallint, exact_away smallint
    )
  )
  select count(*), count(distinct payload.bet_id)
  into v_count, v_distinct
  from payload
  join public.fantabet_bets bet on bet.id = payload.bet_id and bet.round_id = p_round_id;
  if v_count <> v_required or v_distinct <> v_required or v_count <> jsonb_array_length(p_predictions) then
    raise exception 'FANTABET_GIOCATE_INVALIDE' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_predictions) as payload(
      bet_id bigint, scelta text, exact_home smallint, exact_away smallint
    )
    join public.fantabet_bets bet on bet.id = payload.bet_id and bet.round_id = p_round_id
    where
      (bet.bet_type in ('1X2', 'FANTAPUNTEGGIO_1X2') and (
        payload.scelta is null or payload.scelta not in ('1', 'X', '2') or payload.exact_home is not null or payload.exact_away is not null
      ))
      or (bet.bet_type = 'UNDER_OVER_2_5' and (
        payload.scelta is null or payload.scelta not in ('UNDER', 'OVER') or payload.exact_home is not null or payload.exact_away is not null
      ))
      or (bet.bet_type = 'RISULTATO_ESATTO' and (
        payload.scelta is null or payload.scelta <> 'ESATTO' or payload.exact_home is null or payload.exact_away is null
        or payload.exact_home not between 0 and 20 or payload.exact_away not between 0 and 20
      ))
      or bet.bet_type not in ('1X2', 'FANTAPUNTEGGIO_1X2', 'UNDER_OVER_2_5', 'RISULTATO_ESATTO')
  ) then
    raise exception 'FANTABET_PRONOSTICO_NON_VALIDO' using errcode = '22023';
  end if;

  insert into public.fantabet_predictions as prediction
    (profile_id, bet_id, scelta, exact_home, exact_away)
  select v_profile_id, payload.bet_id, payload.scelta, payload.exact_home, payload.exact_away
  from jsonb_to_recordset(p_predictions) as payload(
    bet_id bigint, scelta text, exact_home smallint, exact_away smallint
  )
  on conflict (profile_id, bet_id) do update
    set scelta = excluded.scelta,
        exact_home = excluded.exact_home,
        exact_away = excluded.exact_away
    where prediction.scelta is distinct from excluded.scelta
       or prediction.exact_home is distinct from excluded.exact_home
       or prediction.exact_away is distinct from excluded.exact_away;

  select count(*)::integer into v_count
  from public.fantabet_predictions prediction
  join public.fantabet_bets bet on bet.id = prediction.bet_id
  where prediction.profile_id = v_profile_id and bet.round_id = p_round_id;
  if v_count <> jsonb_array_length(p_predictions) then
    raise exception 'FANTABET_SCHEDINA_INCOMPLETA' using errcode = '22023';
  end if;

  insert into public.fantabet_round_submissions as submission
    (profile_id, round_id, submitted_at, updated_at)
  values (v_profile_id, p_round_id, v_submitted_at, v_submitted_at)
  on conflict (profile_id, round_id) do nothing;

  return query
  select submission.round_id, submission.profile_id, submission.submitted_at,
    true, v_count, clock_timestamp()
  from public.fantabet_round_submissions submission
  where submission.profile_id = v_profile_id and submission.round_id = p_round_id;
end;
$$;

create or replace function public.confirm_my_fantabet_round(p_round_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_required integer;
  v_count integer;
  v_opens_at timestamptz;
  v_deadline timestamptz;
  v_now timestamptz;
begin
  if v_profile_id is null then raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fantabet-player-' || v_profile_id::text || '-' || p_round_id::text, 0)
  );
  select round.required_predictions, round.opens_at, round.deadline_at into v_required, v_opens_at, v_deadline
  from public.fantabet_rounds round where round.id = p_round_id and round.status = 'pubblicata';
  if not found then raise exception 'FANTABET_ROUND_NON_CONFERMABILE' using errcode = '22023'; end if;
  v_now := clock_timestamp();
  if v_now < v_opens_at then raise exception 'FANTABET_ROUND_NON_CONFERMABILE' using errcode = '22023'; end if;
  if v_now >= v_deadline then raise exception 'FANTABET_DEADLINE_SCADUTA' using errcode = '42501'; end if;
  select count(*)::integer into v_count from public.fantabet_predictions prediction
  join public.fantabet_bets bet on bet.id = prediction.bet_id
  where prediction.profile_id = v_profile_id and bet.round_id = p_round_id;
  if v_count <> v_required then raise exception 'FANTABET_SCHEDINA_INCOMPLETA' using errcode = '22023'; end if;
  insert into public.fantabet_round_submissions(profile_id, round_id, submitted_at, updated_at)
  values (v_profile_id, p_round_id, v_now, v_now)
  on conflict (profile_id, round_id) do nothing;
  select submission.submitted_at into v_now
  from public.fantabet_round_submissions submission
  where submission.profile_id = v_profile_id and submission.round_id = p_round_id;
  return v_now;
end;
$$;

create or replace function public.reopen_my_fantabet_round(p_round_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := auth.uid();
  v_opens_at timestamptz;
  v_deadline timestamptz;
  v_now timestamptz;
begin
  if v_profile_id is null then raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fantabet-player-' || v_profile_id::text || '-' || p_round_id::text, 0)
  );
  select round.opens_at, round.deadline_at into v_opens_at, v_deadline from public.fantabet_rounds round
  where round.id = p_round_id and round.status = 'pubblicata';
  if not found then raise exception 'FANTABET_ROUND_NON_MODIFICABILE' using errcode = '22023'; end if;
  v_now := clock_timestamp();
  if v_now < v_opens_at then raise exception 'FANTABET_ROUND_NON_MODIFICABILE' using errcode = '22023'; end if;
  if v_now >= v_deadline then raise exception 'FANTABET_DEADLINE_SCADUTA' using errcode = '42501'; end if;
  delete from public.fantabet_round_submissions where profile_id = v_profile_id and round_id = p_round_id;
end;
$$;

-- All authenticated writes now pass through the advisory-lock RPCs. This also
-- closes the race for stale tabs still attempting the former direct upsert.
revoke insert, update on public.fantabet_predictions from authenticated;

revoke all on function public.save_my_fantabet_prediction(bigint,text,smallint,smallint) from public, anon;
revoke all on function public.save_and_confirm_my_fantabet_round(bigint,jsonb) from public, anon;
grant execute on function public.save_my_fantabet_prediction(bigint,text,smallint,smallint) to authenticated, service_role;
grant execute on function public.save_and_confirm_my_fantabet_round(bigint,jsonb) to authenticated, service_role;

comment on function public.save_and_confirm_my_fantabet_round(bigint,jsonb) is
  'Atomically persists the authoritative prediction set and writes the submission last under a per-profile/round advisory lock.';

commit;
