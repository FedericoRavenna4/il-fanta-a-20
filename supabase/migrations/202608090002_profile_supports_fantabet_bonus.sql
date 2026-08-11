begin;

-- The active season remains centralized in public.stagioni (one row with attiva = true).
create table public.profile_supports (
  profile_id uuid not null references public.profiles(id),
  stagione_id smallint not null references public.stagioni(id),
  societa_id bigint not null references public.societa(id),
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint profile_supports_pkey primary key (profile_id, stagione_id),
  constraint profile_supports_profile_season_team_unique unique (profile_id, stagione_id, societa_id)
);

create index profile_supports_season_team_idx
  on public.profile_supports (stagione_id, societa_id);

create function public.validate_profile_support_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.profile_id and societa_id is null) then
    raise exception 'official_profile_cannot_support' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stagioni where id = new.stagione_id and attiva = true) then
    raise exception 'season_not_active' using errcode = '22023';
  end if;
  if not exists (select 1 from public.societa where id = new.societa_id and attiva = true) then
    raise exception 'team_not_available' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profile_supports_validate_insert
before insert on public.profile_supports
for each row execute function public.validate_profile_support_insert();

revoke all on function public.validate_profile_support_insert()
  from public, anon, authenticated;

create function public.prevent_profile_support_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'profile_support_immutable' using errcode = '42501';
end;
$$;

create trigger profile_supports_immutable
before update or delete on public.profile_supports
for each row execute function public.prevent_profile_support_mutation();

revoke all on function public.prevent_profile_support_mutation()
  from public, anon, authenticated;

alter table public.profile_supports enable row level security;
revoke all on public.profile_supports from public, anon, authenticated;
grant select on public.profile_supports to authenticated;
grant select, insert on public.profile_supports to service_role;

create policy profile_supports_read_own
on public.profile_supports for select
to authenticated
using (profile_id = (select auth.uid()));

create table public.profile_support_ineligibilities (
  profile_id uuid not null,
  stagione_id smallint not null,
  officialized_at timestamptz not null default clock_timestamp(),
  reason text not null default 'became_official',
  created_at timestamptz not null default now(),
  constraint profile_support_ineligibilities_pkey primary key (profile_id, stagione_id),
  constraint profile_support_ineligibilities_support_fkey
    foreign key (profile_id, stagione_id)
    references public.profile_supports(profile_id, stagione_id),
  constraint profile_support_ineligibilities_reason_check
    check (reason = 'became_official')
);

alter table public.profile_support_ineligibilities enable row level security;
revoke all on public.profile_support_ineligibilities from public, anon, authenticated;
grant select on public.profile_support_ineligibilities to authenticated;
grant select, insert on public.profile_support_ineligibilities to service_role;

create policy profile_support_ineligibilities_read_own
on public.profile_support_ineligibilities for select
to authenticated
using (profile_id = (select auth.uid()));

create function private.freeze_profile_supports_after_officialization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.societa_id is null and new.societa_id is not null then
    insert into public.profile_support_ineligibilities (
      profile_id, stagione_id, officialized_at
    )
    select support.profile_id, support.stagione_id, clock_timestamp()
    from public.profile_supports support
    where support.profile_id = new.id
    on conflict (profile_id, stagione_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.freeze_profile_supports_after_officialization()
  from public, anon, authenticated;

create trigger profiles_freeze_supports_after_officialization
after update of societa_id on public.profiles
for each row execute function private.freeze_profile_supports_after_officialization();

create function public.select_my_supported_team(
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
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_profile.societa_id is not null then
    raise exception 'official_profile_cannot_support' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.stagioni
    where id = p_stagione_id and attiva = true
  ) then
    raise exception 'season_not_active' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.societa
    where id = p_societa_id and attiva = true
  ) then
    raise exception 'team_not_available' using errcode = '22023';
  end if;

  insert into public.profile_supports (profile_id, stagione_id, societa_id)
  values (auth.uid(), p_stagione_id, p_societa_id)
  returning * into v_support;

  return v_support;
exception
  when unique_violation then
    raise exception 'support_already_selected' using errcode = '23505';
end;
$$;

revoke all on function public.select_my_supported_team(smallint, bigint)
  from public, anon, authenticated;
grant execute on function public.select_my_supported_team(smallint, bigint)
  to authenticated, service_role;

create function public.active_supporter_counts()
returns table (societa_id bigint, tifosi bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select support.societa_id, count(*)::bigint
  from public.profile_supports support
  join public.profiles profile on profile.id = support.profile_id
  join public.stagioni season on season.id = support.stagione_id
  where season.attiva = true
    and profile.societa_id is null
    and not exists (
      select 1
      from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id
        and ineligibility.stagione_id = support.stagione_id
    )
  group by support.societa_id;
$$;

revoke all on function public.active_supporter_counts()
  from public, anon, authenticated;
grant execute on function public.active_supporter_counts()
  to anon, authenticated, service_role;

-- Winner belongs to the existing authoritative competition edition. A winner
-- can only be recorded once the edition is officially concluded.
alter table public.edizioni_competizioni
  add column societa_vincitrice_id bigint null references public.societa(id),
  add column winner_recorded_at timestamptz null,
  add constraint edizioni_competizioni_winner_only_when_concluded
    check (societa_vincitrice_id is null or stato = 'conclusa'),
  add constraint edizioni_competizioni_winner_timestamp_coherent
    check ((societa_vincitrice_id is null) = (winner_recorded_at is null));

create function public.set_competition_winner_recorded_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.societa_vincitrice_id is not null
     and new.winner_recorded_at is null then
    new.winner_recorded_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger edizioni_competizioni_a_set_winner_recorded_at
before insert or update of societa_vincitrice_id, winner_recorded_at
on public.edizioni_competizioni
for each row execute function public.set_competition_winner_recorded_at();

revoke all on function public.set_competition_winner_recorded_at()
  from public, anon, authenticated;

create function public.prevent_concluded_competition_winner_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.societa_vincitrice_id is not null
     and (
       new.societa_vincitrice_id is distinct from old.societa_vincitrice_id
       or new.winner_recorded_at is distinct from old.winner_recorded_at
     ) then
    raise exception 'competition_winner_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger edizioni_competizioni_winner_immutable
before update of societa_vincitrice_id, winner_recorded_at on public.edizioni_competizioni
for each row execute function public.prevent_concluded_competition_winner_change();

revoke all on function public.prevent_concluded_competition_winner_change()
  from public, anon, authenticated;

create table public.fantabet_support_bonus_events (
  id bigint generated by default as identity primary key,
  profile_id uuid not null references public.profiles(id),
  stagione_id smallint not null references public.stagioni(id),
  societa_id bigint not null references public.societa(id),
  edizione_competizione_id bigint not null references public.edizioni_competizioni(id),
  punti smallint not null,
  recognized_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint fantabet_support_bonus_points_check check (punti in (10, 20, 30, 40, 50)),
  constraint fantabet_support_bonus_support_fkey
    foreign key (profile_id, stagione_id, societa_id)
    references public.profile_supports(profile_id, stagione_id, societa_id),
  constraint fantabet_support_bonus_once_per_trophy
    unique (profile_id, edizione_competizione_id)
);

create index fantabet_support_bonus_profile_idx
  on public.fantabet_support_bonus_events (profile_id);
create index fantabet_support_bonus_team_season_idx
  on public.fantabet_support_bonus_events (stagione_id, societa_id);

alter table public.fantabet_support_bonus_events enable row level security;
revoke all on public.fantabet_support_bonus_events from public, anon, authenticated;
grant select on public.fantabet_support_bonus_events to authenticated;
grant select, insert on public.fantabet_support_bonus_events to service_role;

create policy fantabet_support_bonus_read_own
on public.fantabet_support_bonus_events for select
to authenticated
using (profile_id = (select auth.uid()));

create table public.fantabet_support_bonus_rules (
  competizione_id smallint primary key references public.competizioni(id),
  trophy_type text not null,
  punti smallint not null,
  constraint fantabet_support_bonus_rule_type_check check (
    trophy_type in ('campionato', 'coppa_fanta_20', 'champions_league', 'europa_league', 'conference_league')
  ),
  constraint fantabet_support_bonus_rule_points_check check (punti in (10, 20, 30, 40, 50))
);

alter table public.fantabet_support_bonus_rules enable row level security;
revoke all on public.fantabet_support_bonus_rules from public, anon, authenticated;
grant select on public.fantabet_support_bonus_rules to anon, authenticated, service_role;
create policy fantabet_support_bonus_rules_public_read
on public.fantabet_support_bonus_rules for select
to anon, authenticated
using (true);

insert into public.fantabet_support_bonus_rules (competizione_id, trophy_type, punti)
select competition.id,
  case
    when competition.tipo = 'campionato' then 'campionato'
    when competition.codice = 'coppa-fanta-20' then 'coppa_fanta_20'
    when competition.codice like 'champions-league-%' then 'champions_league'
    when competition.codice like 'europa-league-%' then 'europa_league'
    when competition.codice like 'conference-league-%' then 'conference_league'
  end,
  case
    when competition.tipo = 'campionato' then 50
    when competition.codice = 'coppa-fanta-20' then 40
    when competition.codice like 'champions-league-%' then 30
    when competition.codice like 'europa-league-%' then 20
    when competition.codice like 'conference-league-%' then 10
  end
from public.competizioni competition
where competition.tipo = 'campionato'
   or competition.codice = 'coppa-fanta-20'
   or competition.codice like 'champions-league-%'
   or competition.codice like 'europa-league-%'
   or competition.codice like 'conference-league-%';

create function private.sync_fantabet_support_bonus_events(
  p_edizione_competizione_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted bigint;
begin
  insert into public.fantabet_support_bonus_events (
    profile_id, stagione_id, societa_id, edizione_competizione_id, punti, recognized_at
  )
  select
    support.profile_id,
    support.stagione_id,
    support.societa_id,
    edition.id,
    rule.punti,
    edition.winner_recorded_at
  from public.edizioni_competizioni edition
  join public.fantabet_support_bonus_rules rule
    on rule.competizione_id = edition.competizione_id
  join public.profile_supports support
    on support.stagione_id = edition.stagione_id
   and support.societa_id = edition.societa_vincitrice_id
  join public.profiles profile on profile.id = support.profile_id
  where edition.stato = 'conclusa'
    and edition.societa_vincitrice_id is not null
    and edition.winner_recorded_at is not null
    and support.selected_at <= edition.winner_recorded_at
    and profile.societa_id is null
    and not exists (
      select 1
      from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id
        and ineligibility.stagione_id = support.stagione_id
    )
    and (p_edizione_competizione_id is null or edition.id = p_edizione_competizione_id)
  on conflict (profile_id, edizione_competizione_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function private.sync_fantabet_support_bonus_events(bigint)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.sync_fantabet_support_bonus_events(bigint)
  to service_role;

create function private.trigger_sync_fantabet_support_bonus_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_fantabet_support_bonus_events(new.id);
  return new;
end;
$$;

revoke all on function private.trigger_sync_fantabet_support_bonus_events()
  from public, anon, authenticated;

create trigger edizioni_competizioni_award_support_bonus
after insert or update of stato, societa_vincitrice_id, winner_recorded_at
on public.edizioni_competizioni
for each row execute function private.trigger_sync_fantabet_support_bonus_events();

create function public.public_profile_support_summary(p_profile_id uuid)
returns table (
  stagione_id smallint,
  societa_id bigint,
  selected_at timestamptz,
  punti_bonus_tifo bigint,
  trophy_types text[],
  resolved_trophy_types text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    support.stagione_id,
    support.societa_id,
    support.selected_at,
    coalesce(sum(event.punti), 0)::bigint,
    coalesce(
      array_agg(rule.trophy_type order by event.recognized_at)
        filter (where rule.trophy_type is not null),
      array[]::text[]
    ),
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
          select 1
          from public.partite game
          where game.edizione_competizione_id = resolved_edition.id
            and support.societa_id in (game.societa_casa_id, game.societa_trasferta_id)
        )
    ), array[]::text[]
    )
  from public.profile_supports support
  join public.profiles profile on profile.id = support.profile_id
  join public.stagioni season on season.id = support.stagione_id and season.attiva = true
  left join public.fantabet_support_bonus_events event
    on event.profile_id = support.profile_id
   and event.stagione_id = support.stagione_id
  left join public.edizioni_competizioni edition
    on edition.id = event.edizione_competizione_id
  left join public.fantabet_support_bonus_rules rule
    on rule.competizione_id = edition.competizione_id
  where support.profile_id = p_profile_id
    and profile.societa_id is null
    and not exists (
      select 1
      from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id
        and ineligibility.stagione_id = support.stagione_id
    )
  group by support.stagione_id, support.societa_id, support.selected_at;
$$;

revoke all on function public.public_profile_support_summary(uuid)
  from public, anon, authenticated;
grant execute on function public.public_profile_support_summary(uuid)
  to anon, authenticated, service_role;

-- Preserve the currently deployed and visibility-filtered leaderboard as the
-- scoring source, then add the independently auditable support component.
alter function public.fantabet_global_leaderboard() set schema private;
alter function private.fantabet_global_leaderboard()
  rename to fantabet_base_leaderboard;

revoke all on function private.fantabet_base_leaderboard()
  from public, anon, authenticated;

create function public.fantabet_global_leaderboard()
returns table (
  profile_id uuid,
  username text,
  punti_pronostici bigint,
  punti_bonus_costanza bigint,
  punti_bonus_tifo bigint,
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
  with bonus_by_profile as (
    select event.profile_id, sum(event.punti)::bigint as punti_bonus_tifo
    from public.fantabet_support_bonus_events event
    join public.profiles profile on profile.id = event.profile_id
    where profile.societa_id is null
      and not exists (
        select 1
        from public.profile_support_ineligibilities ineligibility
        where ineligibility.profile_id = event.profile_id
          and ineligibility.stagione_id = event.stagione_id
      )
    group by event.profile_id
  ), totals as (
    select
      source.*,
      profile.username_normalizzato,
      coalesce(bonus.punti_bonus_tifo, 0::bigint) as punti_bonus_tifo
    from private.fantabet_base_leaderboard() source
    join public.profiles profile on profile.id = source.profile_id
    left join bonus_by_profile bonus on bonus.profile_id = source.profile_id
  )
  select
    totals.profile_id,
    totals.username,
    totals.punti_pronostici,
    totals.punti_bonus_costanza,
    totals.punti_bonus_tifo,
    totals.punti_totali + totals.punti_bonus_tifo as punti_totali,
    totals.giornate_giocate,
    totals.pronostici_corretti,
    totals.schedine_perfette,
    totals.streak_attuale,
    row_number() over (
      order by
        totals.punti_totali + totals.punti_bonus_tifo desc,
        totals.schedine_perfette desc,
        totals.pronostici_corretti desc,
        totals.username_normalizzato,
        totals.profile_id
    )::bigint as posizione
  from totals
  order by posizione;
$$;

revoke all on function public.fantabet_global_leaderboard()
  from public, anon, authenticated;
grant execute on function public.fantabet_global_leaderboard()
  to anon, authenticated, service_role;

comment on function public.fantabet_global_leaderboard() is
  'FantaBet leaderboard with separate prediction, consistency and support bonus components. Support bonuses are always zero for official profiles.';

commit;
