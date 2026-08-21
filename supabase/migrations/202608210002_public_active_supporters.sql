begin;

create function private.active_supporter_profiles()
returns table (
  societa_id bigint,
  username text,
  username_normalizzato text,
  avatar_url text,
  avatar_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select support.societa_id,
    profile.username,
    profile.username_normalizzato,
    profile.avatar_url,
    profile.updated_at
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
    );
$$;

revoke all on function private.active_supporter_profiles()
from public, anon, authenticated;
grant execute on function private.active_supporter_profiles()
to service_role;

create or replace function public.active_supporter_counts()
returns table (societa_id bigint, tifosi bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select supporter.societa_id, count(*)::bigint
  from private.active_supporter_profiles() supporter
  group by supporter.societa_id;
$$;

revoke all on function public.active_supporter_counts()
from public, anon, authenticated;
grant execute on function public.active_supporter_counts()
to anon, authenticated, service_role;

create function public.active_supporters(p_societa_id bigint)
returns table (
  username text,
  avatar_url text,
  avatar_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select supporter.username, supporter.avatar_url, supporter.avatar_updated_at
  from private.active_supporter_profiles() supporter
  where supporter.societa_id = p_societa_id
  order by supporter.username_normalizzato, supporter.username;
$$;

revoke all on function public.active_supporters(bigint)
from public, anon, authenticated;
grant execute on function public.active_supporters(bigint)
to anon, authenticated, service_role;

commit;
