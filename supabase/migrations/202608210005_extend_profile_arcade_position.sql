begin;

drop function if exists public.public_profile_competitive_positions(uuid);

create function public.public_profile_competitive_positions(p_profile_id uuid)
returns table (
  fantabet_position bigint,
  fantabet_points bigint,
  arcade_position bigint,
  arcade_level smallint,
  arcade_meters integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with fantabet as (
    select leaderboard.profile_id, leaderboard.posizione, leaderboard.punti_totali
    from public.fantabet_global_leaderboard() leaderboard
    where leaderboard.profile_id = p_profile_id
  ), arcade_ranked as (
    select score.profile_id, score.livello, score.metri,
      row_number() over (
        order by score.livello desc, score.metri desc,
          score.updated_at asc, score.created_at asc, score.id asc
      )::bigint as posizione
    from public.classifica_arcade score
    where score.profile_id is not null
  )
  select fantabet.posizione, fantabet.punti_totali, arcade.posizione,
    arcade.livello, arcade.metri
  from (select 1) singleton
  left join fantabet on true
  left join arcade_ranked arcade on arcade.profile_id = p_profile_id;
$$;

revoke all on function public.public_profile_competitive_positions(uuid)
  from public, anon, authenticated;
grant execute on function public.public_profile_competitive_positions(uuid)
  to anon, authenticated, service_role;

commit;
