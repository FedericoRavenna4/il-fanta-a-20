begin;

-- Preserve the already-applied submission-aware implementation as an internal
-- source, then expose only profiles with at least one fully evaluated round.
alter function public.fantabet_global_leaderboard() set schema private;
alter function private.fantabet_global_leaderboard()
  rename to fantabet_global_leaderboard_unfiltered;

revoke all on function private.fantabet_global_leaderboard_unfiltered()
  from public, anon, authenticated;

create function public.fantabet_global_leaderboard()
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
  select
    source.profile_id,
    source.username,
    source.punti_pronostici,
    source.punti_bonus_costanza,
    source.punti_totali,
    source.giornate_giocate,
    source.pronostici_corretti,
    source.schedine_perfette,
    source.streak_attuale,
    row_number() over (
      order by source.posizione
    )::bigint as posizione
  from private.fantabet_global_leaderboard_unfiltered() source
  where source.giornate_giocate > 0
  order by posizione;
$$;

revoke all on function public.fantabet_global_leaderboard()
  from public, anon, authenticated;
grant execute on function public.fantabet_global_leaderboard()
  to anon, authenticated, service_role;

comment on function public.fantabet_global_leaderboard() is
  'Public FantaBet leaderboard. A profile becomes visible only after at least one submitted round is fully evaluable and scored.';

commit;
