begin;

create or replace function public.fantabet_round_leaderboard(p_round_id bigint)
returns table (
  profile_id uuid,
  username text,
  punti_pronostici bigint,
  punti_bonus_costanza bigint,
  punti_totali bigint,
  pronostici_corretti bigint,
  schedina_perfetta boolean,
  posizione bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with target_round as (
    select round.id, round.deadline_at, round.required_predictions,
      round.perfect_multiplier
    from public.fantabet_rounds round
    where round.id = p_round_id
      and round.status in ('pubblicata', 'chiusa', 'valutata')
  ),
  participants as (
    select submission.profile_id
    from public.fantabet_round_submissions submission
    join target_round target on target.id = submission.round_id
      and target.deadline_at <= statement_timestamp()
    join private.fantabet_round_evaluation evaluation
      on evaluation.round_id = target.id and evaluation.fully_evaluable
  ),
  raw_score as (
    select result.profile_id, count(*)::bigint as prediction_count,
      count(*) filter (where result.correct)::bigint as correct_count,
      coalesce(sum(result.earned_points), 0)::bigint as base_points
    from private.fantabet_prediction_results result
    join participants participant on participant.profile_id = result.profile_id
    join target_round target on target.id = result.round_id
      and target.deadline_at <= statement_timestamp()
    join private.fantabet_round_evaluation evaluation
      on evaluation.round_id = target.id and evaluation.fully_evaluable
    group by result.profile_id
  ),
  expired_rounds as (
    select round.id, round.deadline_at, round.consistency_block_size,
      round.consistency_bonus_points
    from public.fantabet_rounds round
    join target_round target on round.deadline_at <= target.deadline_at
    where round.status in ('pubblicata', 'chiusa', 'valutata')
      and round.deadline_at <= statement_timestamp()
  ),
  participation_timeline as (
    select participant.profile_id, round.id as round_id, round.deadline_at,
      round.consistency_block_size, round.consistency_bonus_points,
      submission.round_id is not null as complete,
      sum(case when submission.round_id is not null then 0 else 1 end) over (
        partition by participant.profile_id order by round.deadline_at, round.id
      ) as streak_group
    from participants participant
    join public.profiles profile on profile.id = participant.profile_id
    join expired_rounds round on round.deadline_at > profile.created_at
    left join public.fantabet_round_submissions submission
      on submission.profile_id = participant.profile_id and submission.round_id = round.id
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
  target_bonus as (
    select position.profile_id,
      case when mod(position.streak_position, position.consistency_block_size) = 0
        then position.consistency_bonus_points else 0 end::bigint as bonus_points
    from streak_positions position
    where position.round_id = p_round_id
  ),
  totals as (
    select profile.id as profile_id, profile.username, profile.username_normalizzato,
      case when score.prediction_count = target.required_predictions
        then case when score.correct_count = target.required_predictions
          then score.base_points * target.perfect_multiplier else score.base_points end
        else 0 end::bigint as punti_pronostici,
      coalesce(bonus.bonus_points, 0)::bigint as punti_bonus_costanza,
      coalesce(score.correct_count, 0)::bigint as pronostici_corretti,
      coalesce(score.prediction_count = target.required_predictions
        and score.correct_count = target.required_predictions, false) as schedina_perfetta
    from participants participant
    join public.profiles profile on profile.id = participant.profile_id
    cross join target_round target
    left join raw_score score on score.profile_id = profile.id
    left join target_bonus bonus on bonus.profile_id = profile.id
  )
  select totals.profile_id, totals.username, totals.punti_pronostici,
    totals.punti_bonus_costanza,
    (totals.punti_pronostici + totals.punti_bonus_costanza)::bigint as punti_totali,
    totals.pronostici_corretti, totals.schedina_perfetta,
    row_number() over (
      order by totals.punti_pronostici + totals.punti_bonus_costanza desc,
        totals.schedina_perfetta desc, totals.pronostici_corretti desc,
        totals.username_normalizzato asc, totals.profile_id asc
    )::bigint as posizione
  from totals
  order by posizione;
$$;

revoke all on function public.fantabet_round_leaderboard(bigint) from public, anon, authenticated;
grant execute on function public.fantabet_round_leaderboard(bigint) to anon, authenticated;
grant execute on function public.fantabet_round_leaderboard(bigint) to service_role;

comment on function public.fantabet_round_leaderboard(bigint) is
  'Submission-aware derived leaderboard for one FantaBet round; exposes public profile identity and derived game totals only.';

commit;
