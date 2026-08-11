begin;

-- Keep submitted profiles available to the participation timeline. A profile
-- becomes publishable only after at least one submitted round is fully scored.
create or replace function private.fantabet_base_leaderboard()
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
  with active_rounds as (
    select round.id
    from public.fantabet_rounds round
    join public.stagioni season on season.id = round.stagione_id
    where season.attiva = true
  ),
  complete_rounds as (
    select evaluation.round_id
    from private.fantabet_round_evaluation evaluation
    join active_rounds active on active.id = evaluation.round_id
    where evaluation.fully_evaluable
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
      on submission.profile_id = result.profile_id
     and submission.round_id = result.round_id
    join complete_rounds complete on complete.round_id = result.round_id
    join public.fantabet_rounds round on round.id = result.round_id
    group by result.profile_id, result.round_id,
      round.required_predictions, round.perfect_multiplier
  ),
  prediction_totals as (
    select
      profile.id as profile_id,
      sum(case
        when score.prediction_count = score.required_predictions
         and score.correct_count = score.required_predictions
          then score.base_points * score.perfect_multiplier
        else score.base_points
      end)::bigint as punti_totali,
      count(*)::bigint as giornate_giocate,
      sum(score.correct_count)::bigint as pronostici_corretti,
      count(*) filter (
        where score.prediction_count = score.required_predictions
          and score.correct_count = score.required_predictions
      )::bigint as schedine_perfette
    from scored_slips score
    join public.profiles profile on profile.id = score.profile_id
    where score.prediction_count = score.required_predictions
    group by profile.id
  ),
  expired_rounds as (
    select
      round.id,
      round.deadline_at,
      round.required_predictions,
      round.consistency_block_size,
      round.consistency_bonus_points
    from public.fantabet_rounds round
    join active_rounds active on active.id = round.id
    where round.status in ('pubblicata', 'chiusa', 'valutata')
      and round.deadline_at <= statement_timestamp()
  ),
  submitted_participation as (
    select submission.profile_id, submission.round_id
    from public.fantabet_round_submissions submission
    join expired_rounds round on round.id = submission.round_id
  ),
  participating_profiles as (
    -- Submission membership is broader than public leaderboard visibility:
    -- only the final giornate_giocate filter decides publishability.
    select distinct submission.profile_id
    from public.fantabet_round_submissions submission
    join public.fantabet_rounds round on round.id = submission.round_id
    join active_rounds active on active.id = round.id
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
    join expired_rounds round on round.deadline_at > profile.created_at
    left join submitted_participation participation
      on participation.profile_id = profile.id
     and participation.round_id = round.id
  ),
  streak_positions as (
    select
      timeline.*,
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
      sum(case
        when mod(streak_position, consistency_block_size) = 0
          then consistency_bonus_points
        else 0
      end)::bigint as punti_bonus_costanza
    from streak_positions
    group by profile_id
  ),
  current_streaks as (
    select
      timeline.profile_id,
      case
        when bool_or(timeline.complete and timeline.reverse_order = 1)
          then coalesce(
            max(streak_row.streak_position)
              filter (where timeline.reverse_order = 1),
            0
          )
        else 0
      end::bigint as streak_attuale
    from participation_timeline timeline
    left join streak_positions streak_row
      on streak_row.profile_id = timeline.profile_id
     and streak_row.round_id = timeline.round_id
    group by timeline.profile_id
  ),
  totals as (
    select
      profile.id as profile_id,
      profile.username,
      profile.username_normalizzato,
      coalesce(prediction.punti_totali, 0)::bigint as punti_pronostici,
      coalesce(consistency.punti_bonus_costanza, 0)::bigint
        as punti_bonus_costanza,
      (
        coalesce(prediction.punti_totali, 0)
        + coalesce(consistency.punti_bonus_costanza, 0)
      )::bigint as punti_totali,
      coalesce(prediction.giornate_giocate, 0)::bigint as giornate_giocate,
      coalesce(prediction.pronostici_corretti, 0)::bigint
        as pronostici_corretti,
      coalesce(prediction.schedine_perfette, 0)::bigint
        as schedine_perfette,
      coalesce(streak.streak_attuale, 0)::bigint as streak_attuale
    from participating_profiles participant
    join public.profiles profile on profile.id = participant.profile_id
    left join prediction_totals prediction on prediction.profile_id = profile.id
    left join consistency_totals consistency
      on consistency.profile_id = profile.id
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
      order by
        totals.punti_totali desc,
        totals.schedine_perfette desc,
        totals.pronostici_corretti desc,
        totals.username_normalizzato asc,
        totals.profile_id asc
    )::bigint as posizione
  from totals
  where totals.giornate_giocate > 0
  order by posizione;
$$;

revoke all on function private.fantabet_base_leaderboard()
  from public, anon, authenticated;

comment on function private.fantabet_base_leaderboard() is
  'Authoritative FantaBet base leaderboard. Profiles are publishable only after at least one submitted round is fully evaluated, independently of points.';

commit;
