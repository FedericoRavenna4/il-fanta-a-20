begin;

create table public.fantabet_round_submissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  round_id bigint not null references public.fantabet_rounds(id) on delete cascade,
  submitted_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (profile_id, round_id)
);

alter table public.fantabet_round_submissions enable row level security;
revoke all on public.fantabet_round_submissions from public, anon, authenticated;
grant select on public.fantabet_round_submissions to authenticated;

create policy "fantabet submissions read own"
on public.fantabet_round_submissions for select to authenticated
using ((select auth.uid()) = profile_id);

create or replace function public.confirm_my_fantabet_round(p_round_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  expected_count integer;
  actual_count integer;
  deadline timestamptz;
  submitted timestamptz := statement_timestamp();
begin
  if account_id is null then raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501'; end if;

  select round.required_predictions, round.deadline_at
  into expected_count, deadline
  from public.fantabet_rounds round
  where round.id = p_round_id and round.status = 'pubblicata';

  if not found then raise exception 'FANTABET_ROUND_NON_CONFERMABILE' using errcode = '22023'; end if;
  if submitted >= deadline then raise exception 'FANTABET_DEADLINE_SCADUTA' using errcode = '42501'; end if;

  select count(*)::integer into actual_count
  from public.fantabet_predictions prediction
  join public.fantabet_bets bet on bet.id = prediction.bet_id
  where prediction.profile_id = account_id and bet.round_id = p_round_id;

  if actual_count <> expected_count then raise exception 'FANTABET_SCHEDINA_INCOMPLETA' using errcode = '22023'; end if;

  insert into public.fantabet_round_submissions(profile_id, round_id, submitted_at, updated_at)
  values (account_id, p_round_id, submitted, submitted)
  on conflict (profile_id, round_id) do update
    set submitted_at = excluded.submitted_at, updated_at = excluded.updated_at;
  return submitted;
end;
$$;

create or replace function public.reopen_my_fantabet_round(p_round_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  deadline timestamptz;
begin
  if account_id is null then raise exception 'FANTABET_AUTH_REQUIRED' using errcode = '42501'; end if;
  select round.deadline_at into deadline from public.fantabet_rounds round
  where round.id = p_round_id and round.status = 'pubblicata';
  if not found then raise exception 'FANTABET_ROUND_NON_MODIFICABILE' using errcode = '22023'; end if;
  if statement_timestamp() >= deadline then raise exception 'FANTABET_DEADLINE_SCADUTA' using errcode = '42501'; end if;
  delete from public.fantabet_round_submissions where profile_id = account_id and round_id = p_round_id;
end;
$$;

create or replace function public.invalidate_fantabet_submission_on_prediction_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_round_id bigint;
begin
  if tg_op = 'UPDATE' and old.scelta is not distinct from new.scelta
    and old.exact_home is not distinct from new.exact_home
    and old.exact_away is not distinct from new.exact_away then return new; end if;
  select bet.round_id into target_round_id from public.fantabet_bets bet where bet.id = new.bet_id;
  delete from public.fantabet_round_submissions
  where profile_id = new.profile_id and round_id = target_round_id;
  return new;
end;
$$;

create trigger invalidate_fantabet_submission_after_prediction_change
after insert or update on public.fantabet_predictions
for each row execute function public.invalidate_fantabet_submission_on_prediction_change();

create or replace function public.fantabet_global_leaderboard()
returns table (
  profile_id uuid,
  username text,
  punti_pronostici bigint,
  punti_bonus_costanza bigint,
  punti_totali bigint,
  giornate_giocate bigint,
  pronostici_corretti bigint,
  schedine_perfette bigint,
  streak_attuale bigint,
  posizione bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with complete_rounds as (
    select round_id from private.fantabet_round_evaluation where fully_evaluable
  ),
  scored_slips as (
    select
      result.profile_id,
      result.round_id,
      round.required_predictions,
      round.perfect_multiplier,
      count(*) as prediction_count,
      count(*) filter (where result.correct) as correct_count,
      coalesce(sum(result.earned_points), 0)::bigint as base_points
    from private.fantabet_prediction_results result
    join public.fantabet_round_submissions submission
      on submission.profile_id = result.profile_id and submission.round_id = result.round_id
    join complete_rounds complete on complete.round_id = result.round_id
    join public.fantabet_rounds round on round.id = result.round_id
    group by result.profile_id, result.round_id, round.required_predictions, round.perfect_multiplier
  ),
  prediction_totals as (
    select
      profile.id as profile_id,
      sum(case when score.prediction_count = score.required_predictions and score.correct_count = score.required_predictions then score.base_points * score.perfect_multiplier else score.base_points end)::bigint as punti_totali,
      count(*)::bigint as giornate_giocate,
      sum(score.correct_count)::bigint as pronostici_corretti,
      count(*) filter (where score.prediction_count = score.required_predictions and score.correct_count = score.required_predictions)::bigint as schedine_perfette
    from scored_slips score
    join public.profiles profile on profile.id = score.profile_id
    where score.prediction_count = score.required_predictions
    group by profile.id
  ),
  expired_rounds as (
    select round.id, round.deadline_at, round.required_predictions,
      round.consistency_block_size, round.consistency_bonus_points
    from public.fantabet_rounds round
    where round.status in ('pubblicata', 'chiusa', 'valutata')
      and round.deadline_at <= statement_timestamp()
  ),
  submitted_participation as (
    select submission.profile_id, submission.round_id
    from public.fantabet_round_submissions submission
    join expired_rounds round on round.id = submission.round_id
  ),
  participating_profiles as (
    -- An open valid submission makes the profile visible immediately, but only
    -- expired rounds below can affect points, played rounds or consistency.
    select distinct submission.profile_id
    from public.fantabet_round_submissions submission
    join public.fantabet_rounds round on round.id = submission.round_id
    where round.status in ('pubblicata', 'chiusa', 'valutata')
  ),
  participation_timeline as (
    select
      profile.id as profile_id,
      round.id as round_id,
      round.deadline_at,
      round.consistency_block_size,
      round.consistency_bonus_points,
      participation.round_id is not null as complete,
      sum(case when participation.round_id is not null then 0 else 1 end) over (
        partition by profile.id order by round.deadline_at, round.id
      ) as streak_group,
      row_number() over (
        partition by profile.id order by round.deadline_at desc, round.id desc
      ) as reverse_order
    from participating_profiles participant
    join public.profiles profile on profile.id = participant.profile_id
    -- The account must have had a positive interval in which it could play.
    -- A round expiring exactly at/before registration cannot break its streak.
    join expired_rounds round on round.deadline_at > profile.created_at
    left join submitted_participation participation
      on participation.profile_id = profile.id and participation.round_id = round.id
  ),
  streak_positions as (
    select timeline.*,
      row_number() over (
        partition by timeline.profile_id, timeline.streak_group
        order by timeline.deadline_at, timeline.round_id
      )::bigint as streak_position
    from participation_timeline timeline
    where timeline.complete
  ),
  consistency_totals as (
    select
      profile_id,
      sum(case when mod(streak_position, consistency_block_size) = 0 then consistency_bonus_points else 0 end)::bigint as punti_bonus_costanza
    from streak_positions
    group by profile_id
  ),
  current_streaks as (
    select
      timeline.profile_id,
      case
        when bool_or(timeline.complete and timeline.reverse_order = 1)
          then coalesce(max(streak_row.streak_position) filter (where timeline.reverse_order = 1), 0)
        else 0
      end::bigint as streak_attuale
    from participation_timeline timeline
    left join streak_positions streak_row
      on streak_row.profile_id = timeline.profile_id and streak_row.round_id = timeline.round_id
    group by timeline.profile_id
  ),
  totals as (
    select
      profile.id as profile_id,
      profile.username,
      profile.username_normalizzato,
      coalesce(prediction.punti_totali, 0)::bigint as punti_pronostici,
      coalesce(consistency.punti_bonus_costanza, 0)::bigint as punti_bonus_costanza,
      (coalesce(prediction.punti_totali, 0) + coalesce(consistency.punti_bonus_costanza, 0))::bigint as punti_totali,
      coalesce(prediction.giornate_giocate, 0)::bigint as giornate_giocate,
      coalesce(prediction.pronostici_corretti, 0)::bigint as pronostici_corretti,
      coalesce(prediction.schedine_perfette, 0)::bigint as schedine_perfette,
      coalesce(streak.streak_attuale, 0)::bigint as streak_attuale
    from participating_profiles participant
    join public.profiles profile on profile.id = participant.profile_id
    left join prediction_totals prediction on prediction.profile_id = profile.id
    left join consistency_totals consistency on consistency.profile_id = profile.id
    left join current_streaks streak on streak.profile_id = profile.id
  )
  select
    totals.profile_id,
    totals.username,
    totals.punti_pronostici,
    totals.punti_bonus_costanza,
    totals.punti_totali,
    totals.giornate_giocate,
    totals.pronostici_corretti,
    totals.schedine_perfette,
    totals.streak_attuale,
    row_number() over (
      order by totals.punti_totali desc, totals.schedine_perfette desc,
        totals.pronostici_corretti desc, totals.username_normalizzato asc, totals.profile_id asc
    )::bigint as posizione
  from totals
  order by posizione;
$$;

revoke all on function public.confirm_my_fantabet_round(bigint) from public, anon;
revoke all on function public.reopen_my_fantabet_round(bigint) from public, anon;
revoke all on function public.invalidate_fantabet_submission_on_prediction_change() from public, anon, authenticated;
grant execute on function public.confirm_my_fantabet_round(bigint) to authenticated;
grant execute on function public.reopen_my_fantabet_round(bigint) to authenticated;
revoke all on function public.fantabet_global_leaderboard() from public, anon, authenticated;
grant execute on function public.fantabet_global_leaderboard() to anon, authenticated;
grant all on public.fantabet_round_submissions to service_role;
grant execute on function public.confirm_my_fantabet_round(bigint) to service_role;
grant execute on function public.reopen_my_fantabet_round(bigint) to service_role;

comment on table public.fantabet_round_submissions is
  'Authoritative, server-validated participation record. Only submitted slips enter V1 scoring, leaderboard and consistency streaks.';

commit;
