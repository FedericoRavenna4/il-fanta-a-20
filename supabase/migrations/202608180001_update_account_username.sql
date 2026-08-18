begin;

create or replace function public.update_my_username(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := auth.uid();
  v_username text := pg_catalog.btrim(coalesce(p_username, ''));
  v_normalized text;
  v_profile public.profiles%rowtype;
begin
  if v_account_id is null then
    raise exception 'SESSIONE_NON_VALIDA' using errcode = '42501';
  end if;

  if v_username !~ '^[A-Za-z][A-Za-z0-9_]{2,23}$' then
    raise exception 'USERNAME_NON_VALIDO' using errcode = '22023';
  end if;

  v_normalized := public.normalize_account_username(v_username);

  if exists (
    select 1
    from public.reserved_usernames reserved
    where reserved.username_normalizzato = v_normalized
  ) then
    raise exception 'USERNAME_RISERVATO' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles profile
    where profile.username_normalizzato = v_normalized
      and profile.id <> v_account_id
  ) then
    raise exception 'USERNAME_GIA_IN_USO' using errcode = '23505';
  end if;

  update public.profiles
  set username = v_username,
      username_normalizzato = v_normalized
  where id = v_account_id
  returning * into v_profile;

  if not found then
    raise exception 'PROFILO_NON_TROVATO' using errcode = 'P0002';
  end if;

  update public.classifica_arcade
  set nome_giocatore = v_username,
      nome_giocatore_normalizzato = v_normalized,
      updated_at = pg_catalog.now()
  where profile_id = v_account_id;

  return v_profile;
end;
$$;

revoke all on function public.update_my_username(text)
from public, anon;

grant execute on function public.update_my_username(text)
to authenticated;

commit;