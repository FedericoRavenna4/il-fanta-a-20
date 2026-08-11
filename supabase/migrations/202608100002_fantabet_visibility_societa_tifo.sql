begin;

-- Reconcile migration history with the column already introduced manually on
-- the remote database. This remains safe both before and after that manual DDL.
alter table public.societa
  add column if not exists storia_tifo text;

comment on column public.societa.storia_tifo is
  'Short persuasive copy for the supported-team catalog; distinct from the full company history.';

-- Preserve every competitive calculation from the deployed base function.
-- Only profiles with at least one evaluated played round may leave this wrapper.
create or replace function public.fantabet_global_leaderboard()
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
    where source.giornate_giocate > 0
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

comment on function public.fantabet_global_leaderboard() is
  'FantaBet leaderboard visible only after giornate_giocate > 0, with prediction, consistency and support components kept separate.';

commit;
