begin;

-- The previously deployed unfiltered base did not isolate seasons. Replace it
-- locally before wrapping the public leaderboard so every scoring component
-- derives from the single season marked active.
create or replace function private.fantabet_global_leaderboard_unfiltered()
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
    -- Open submissions remain internal timeline candidates. Public visibility
    -- is still enforced by private.fantabet_base_leaderboard(), whose deployed
    -- contract requires giornate_giocate > 0.
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



-- A support starts from the first championship matchday that had not already
-- been calculated when the support was selected. updated_at is deliberately
-- not used: later corrections must never make an old match newly eligible.
alter table public.profile_supports
  add column eligible_from_giornata smallint;

alter table public.profile_supports disable trigger profile_supports_immutable;
update public.profile_supports support
set eligible_from_giornata = coalesce((
  select max(game.giornata_lega) + 1
  from public.partite game
  join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
  join public.competizioni competition on competition.id = edition.competizione_id
  where edition.stagione_id = support.stagione_id
    and competition.tipo = 'campionato'
    and game.stato = 'calcolata'
    and support.societa_id in (game.societa_casa_id, game.societa_trasferta_id)
), 1);
alter table public.profile_supports enable trigger profile_supports_immutable;

alter table public.profile_supports
  alter column eligible_from_giornata set not null,
  add constraint profile_supports_eligible_matchday_positive
    check (eligible_from_giornata > 0);

create table public.fantabet_support_match_events (
  id bigint generated by default as identity primary key,
  profile_id uuid not null references public.profiles(id),
  stagione_id smallint not null references public.stagioni(id),
  societa_id bigint not null references public.societa(id),
  partita_id bigint not null references public.partite(id),
  punti smallint not null check (punti in (0, 1, 3)),
  outcome text not null check (outcome in ('vittoria', 'pareggio', 'sconfitta')),
  recognized_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  constraint fantabet_support_match_event_support_fkey
    foreign key (profile_id, stagione_id, societa_id)
    references public.profile_supports(profile_id, stagione_id, societa_id),
  constraint fantabet_support_match_event_unique unique (profile_id, partita_id)
);

create index fantabet_support_match_events_profile_idx
  on public.fantabet_support_match_events (profile_id, stagione_id);

alter table public.fantabet_support_match_events enable row level security;
revoke all on public.fantabet_support_match_events from public, anon, authenticated;
grant select, insert on public.fantabet_support_match_events to service_role;
grant select on public.fantabet_support_match_events to authenticated;

create policy fantabet_support_match_events_read_own
on public.fantabet_support_match_events for select
to authenticated
using (profile_id = (select auth.uid()));

create function private.sync_fantabet_support_match_events(
  p_partita_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted bigint;
begin
  delete from public.fantabet_support_match_events event
  where (p_partita_id is null or event.partita_id = p_partita_id)
    and not exists (
      select 1
      from public.partite game
      join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
      join public.competizioni competition on competition.id = edition.competizione_id
      join public.profile_supports support
        on support.profile_id = event.profile_id
       and support.stagione_id = edition.stagione_id
       and support.societa_id = event.societa_id
      join public.profiles profile on profile.id = support.profile_id
      where game.id = event.partita_id
        and competition.tipo = 'campionato'
        and game.stato = 'calcolata'
        and game.gol_casa is not null
        and game.gol_trasferta is not null
        and support.societa_id in (game.societa_casa_id, game.societa_trasferta_id)
        and game.giornata_lega >= support.eligible_from_giornata
        and profile.societa_id is null
        and not exists (
          select 1 from public.profile_support_ineligibilities ineligibility
          where ineligibility.profile_id = support.profile_id
            and ineligibility.stagione_id = support.stagione_id
        )
    );

  insert into public.fantabet_support_match_events (
    profile_id, stagione_id, societa_id, partita_id, punti, outcome, recognized_at
  )
  select
    support.profile_id,
    support.stagione_id,
    support.societa_id,
    game.id,
    case
      when game.gol_casa = game.gol_trasferta then 1
      when (support.societa_id = game.societa_casa_id and game.gol_casa > game.gol_trasferta)
        or (support.societa_id = game.societa_trasferta_id and game.gol_trasferta > game.gol_casa) then 3
      else 0
    end,
    case
      when game.gol_casa = game.gol_trasferta then 'pareggio'
      when (support.societa_id = game.societa_casa_id and game.gol_casa > game.gol_trasferta)
        or (support.societa_id = game.societa_trasferta_id and game.gol_trasferta > game.gol_casa) then 'vittoria'
      else 'sconfitta'
    end,
    clock_timestamp()
  from public.partite game
  join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
  join public.competizioni competition on competition.id = edition.competizione_id
  join public.profile_supports support
    on support.stagione_id = edition.stagione_id
   and support.societa_id in (game.societa_casa_id, game.societa_trasferta_id)
   and game.giornata_lega >= support.eligible_from_giornata
  join public.profiles profile on profile.id = support.profile_id
  where competition.tipo = 'campionato'
    and game.stato = 'calcolata'
    and game.gol_casa is not null
    and game.gol_trasferta is not null
    and profile.societa_id is null
    and not exists (
      select 1 from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id
        and ineligibility.stagione_id = support.stagione_id
    )
    and (p_partita_id is null or game.id = p_partita_id)
  on conflict (profile_id, partita_id) do update
  set punti = excluded.punti,
      outcome = excluded.outcome,
      recognized_at = excluded.recognized_at
  where fantabet_support_match_events.punti is distinct from excluded.punti
     or fantabet_support_match_events.outcome is distinct from excluded.outcome;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function private.sync_fantabet_support_match_events(bigint)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.sync_fantabet_support_match_events(bigint)
  to service_role;

create function private.trigger_sync_fantabet_support_match_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_fantabet_support_match_events(new.id);
  return new;
end;
$$;

revoke all on function private.trigger_sync_fantabet_support_match_events()
  from public, anon, authenticated;

create trigger partite_sync_fantabet_support_match_events
after insert or update of stato, gol_casa, gol_trasferta on public.partite
for each row execute function private.trigger_sync_fantabet_support_match_events();

-- Replace the selection RPC without weakening its ownership or season checks.
create or replace function public.select_my_supported_team(
  p_stagione_id smallint,
  p_societa_id bigint
)
returns public.profile_supports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_support public.profile_supports%rowtype;
  v_eligible_from_giornata smallint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_profile.societa_id is not null then raise exception 'official_profile_cannot_support' using errcode = '42501'; end if;
  if not exists (select 1 from public.stagioni where id = p_stagione_id and attiva = true) then
    raise exception 'season_not_active' using errcode = '22023';
  end if;
  if not exists (select 1 from public.societa where id = p_societa_id and attiva = true) then
    raise exception 'team_not_available' using errcode = '22023';
  end if;

  select coalesce(max(game.giornata_lega) + 1, 1)::smallint
  into v_eligible_from_giornata
  from public.partite game
  join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
  join public.competizioni competition on competition.id = edition.competizione_id
  where edition.stagione_id = p_stagione_id
    and competition.tipo = 'campionato'
    and game.stato = 'calcolata'
    and p_societa_id in (game.societa_casa_id, game.societa_trasferta_id);

  insert into public.profile_supports (
    profile_id, stagione_id, societa_id, eligible_from_giornata
  ) values (
    auth.uid(), p_stagione_id, p_societa_id, v_eligible_from_giornata
  ) returning * into v_support;
  return v_support;
exception when unique_violation then
  raise exception 'support_already_selected' using errcode = '23505';
end;
$$;

-- Some environments received the deployed 002 before this public helper was
-- added to its reconstructed local source. Its absence is therefore a valid
-- post-002 state; the 003 establishes the authoritative signature below.
drop function if exists public.public_profile_support_summary(uuid);
create function public.public_profile_support_summary(p_profile_id uuid)
returns table (
  stagione_id smallint, societa_id bigint, selected_at timestamptz,
  punti_tifo bigint, punti_bonus_tifo bigint,
  trophy_types text[], resolved_trophy_types text[]
)
language sql stable security definer set search_path = ''
as $$
  select support.stagione_id, support.societa_id, support.selected_at,
    coalesce((
      select sum(match_event.punti)::bigint
      from public.fantabet_support_match_events match_event
      where match_event.profile_id = support.profile_id
        and match_event.stagione_id = support.stagione_id
    ), 0::bigint),
    coalesce(sum(trophy_event.punti), 0)::bigint,
    coalesce(array_agg(rule.trophy_type order by trophy_event.recognized_at)
      filter (where rule.trophy_type is not null), array[]::text[]),
    coalesce((
      select array_agg(distinct resolved_rule.trophy_type)
      from public.edizioni_competizioni resolved_edition
      join public.fantabet_support_bonus_rules resolved_rule
        on resolved_rule.competizione_id = resolved_edition.competizione_id
      where resolved_edition.stagione_id = support.stagione_id
        and resolved_edition.stato = 'conclusa'
        and resolved_edition.societa_vincitrice_id is not null
        and resolved_edition.winner_recorded_at is not null
        and support.selected_at <= resolved_edition.winner_recorded_at
        and exists (
          select 1 from public.partite game
          where game.edizione_competizione_id = resolved_edition.id
            and support.societa_id in (game.societa_casa_id, game.societa_trasferta_id)
        )
    ), array[]::text[])
  from public.profile_supports support
  join public.profiles profile on profile.id = support.profile_id
  join public.stagioni season on season.id = support.stagione_id and season.attiva = true
  left join public.fantabet_support_bonus_events trophy_event
    on trophy_event.profile_id = support.profile_id
   and trophy_event.stagione_id = support.stagione_id
  left join public.edizioni_competizioni trophy_edition
    on trophy_edition.id = trophy_event.edizione_competizione_id
  left join public.fantabet_support_bonus_rules rule
    on rule.competizione_id = trophy_edition.competizione_id
  where support.profile_id = p_profile_id
    and profile.societa_id is null
    and not exists (
      select 1 from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id
        and ineligibility.stagione_id = support.stagione_id
    )
  group by support.profile_id, support.stagione_id, support.societa_id, support.selected_at;
$$;
revoke all on function public.public_profile_support_summary(uuid)
  from public, anon, authenticated;
grant execute on function public.public_profile_support_summary(uuid)
  to anon, authenticated, service_role;

-- The deployed 002 already preserved the visibility-filtered FantaBet source as
-- private.fantabet_base_leaderboard(). Replace only its public wrapper because
-- the returned shape now gains punti_tifo.
drop function public.fantabet_global_leaderboard();
create function public.fantabet_global_leaderboard()
returns table (
  profile_id uuid, username text, punti_pronostici bigint,
  punti_bonus_costanza bigint, punti_tifo bigint, punti_bonus_tifo bigint,
  punti_totali bigint, giornate_giocate bigint, pronostici_corretti bigint,
  schedine_perfette bigint, streak_attuale bigint, posizione bigint
)
language sql stable security definer set search_path = ''
as $$
  with support_points as (
    select event.profile_id, sum(event.punti)::bigint as punti_tifo
    from public.fantabet_support_match_events event
    join public.profiles profile on profile.id = event.profile_id
    join public.stagioni season on season.id = event.stagione_id and season.attiva = true
    where profile.societa_id is null
      and not exists (
        select 1 from public.profile_support_ineligibilities ineligibility
        where ineligibility.profile_id = event.profile_id
          and ineligibility.stagione_id = event.stagione_id
    )
    group by event.profile_id
  ), trophy_points as (
    select event.profile_id, sum(event.punti)::bigint as punti_bonus_tifo
    from public.fantabet_support_bonus_events event
    join public.profiles profile on profile.id = event.profile_id
    join public.stagioni season on season.id = event.stagione_id and season.attiva = true
    where profile.societa_id is null
      and not exists (
        select 1 from public.profile_support_ineligibilities ineligibility
        where ineligibility.profile_id = event.profile_id
          and ineligibility.stagione_id = event.stagione_id
      )
    group by event.profile_id
  ), totals as (
    select source.*, profile.username_normalizzato,
      coalesce(support.punti_tifo, 0::bigint) as punti_tifo,
      coalesce(trophy.punti_bonus_tifo, 0::bigint) as punti_bonus_tifo
    from private.fantabet_base_leaderboard() source
    join public.profiles profile on profile.id = source.profile_id
    left join support_points support on support.profile_id = source.profile_id
    left join trophy_points trophy on trophy.profile_id = source.profile_id
  )
  select totals.profile_id, totals.username, totals.punti_pronostici,
    totals.punti_bonus_costanza, totals.punti_tifo, totals.punti_bonus_tifo,
    totals.punti_totali + totals.punti_tifo + totals.punti_bonus_tifo,
    totals.giornate_giocate, totals.pronostici_corretti,
    totals.schedine_perfette, totals.streak_attuale,
    row_number() over (order by
      totals.punti_totali + totals.punti_tifo + totals.punti_bonus_tifo desc,
      totals.schedine_perfette desc, totals.pronostici_corretti desc,
      totals.username_normalizzato, totals.profile_id)::bigint
  from totals
  order by 12;
$$;

revoke all on function public.fantabet_global_leaderboard()
  from public, anon, authenticated;
grant execute on function public.fantabet_global_leaderboard()
  to anon, authenticated, service_role;

commit;
