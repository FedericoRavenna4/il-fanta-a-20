begin;

create or replace function public.admin_inspect_fantabet_round(p_round_id bigint)
returns table (
  round_id bigint,
  numero_giornata smallint,
  round_status text,
  opens_at timestamptz,
  deadline_at timestamptz,
  bets_count bigint,
  predictions_count bigint,
  participants_count bigint,
  submissions_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round.id,
    round.numero_giornata,
    round.status,
    round.opens_at,
    round.deadline_at,
    count(distinct bet.id),
    count(distinct prediction.id),
    count(distinct prediction.profile_id),
    count(distinct (submission.profile_id, submission.round_id))
  from public.fantabet_rounds round
  left join public.fantabet_bets bet
    on bet.round_id = round.id
  left join public.fantabet_predictions prediction
    on prediction.bet_id = bet.id
  left join public.fantabet_round_submissions submission
    on submission.round_id = round.id
  where round.id = p_round_id
  group by
    round.id,
    round.numero_giornata,
    round.status,
    round.opens_at,
    round.deadline_at;
$$;

create or replace function public.admin_delete_fantabet_round(p_round_id bigint)
returns table (
  deleted_rounds bigint,
  deleted_bets bigint,
  deleted_predictions bigint,
  deleted_submissions bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bets bigint;
  v_predictions bigint;
  v_submissions bigint;
begin
  if p_round_id is null or p_round_id <= 0 then
    raise exception 'FANTABET_ROUND_NON_VALIDA' using errcode = '22023';
  end if;

  perform 1
  from public.fantabet_rounds round
  where round.id = p_round_id
  for update;

  if not found then
    raise exception 'FANTABET_ROUND_NON_DISPONIBILE' using errcode = 'P0002';
  end if;

  select count(*)
  into v_bets
  from public.fantabet_bets bet
  where bet.round_id = p_round_id;

  select count(*)
  into v_predictions
  from public.fantabet_predictions prediction
  join public.fantabet_bets bet
    on bet.id = prediction.bet_id
  where bet.round_id = p_round_id;

  select count(*)
  into v_submissions
  from public.fantabet_round_submissions submission
  where submission.round_id = p_round_id;

  perform pg_catalog.set_config(
    'f20.admin_delete_fantabet_round',
    p_round_id::text,
    true
  );

  delete from public.fantabet_rounds round
  where round.id = p_round_id;

  return query
  select 1::bigint, v_bets, v_predictions, v_submissions;
end;
$$;

revoke all on function public.admin_inspect_fantabet_round(bigint)
from public, anon, authenticated;

revoke all on function public.admin_delete_fantabet_round(bigint)
from public, anon, authenticated;

grant execute on function public.admin_inspect_fantabet_round(bigint)
to service_role;

grant execute on function public.admin_delete_fantabet_round(bigint)
to service_role;

commit;