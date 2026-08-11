-- Align legacy admins with normal profiles and allow multiple verified profiles per society.
begin;

create or replace function public.create_my_legacy_profile(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_exists' using errcode = '23505';
  end if;

  insert into public.profiles (id, username, username_normalizzato)
  values (auth.uid(), pg_catalog.btrim(p_username), public.normalize_account_username(p_username))
  returning * into v_profile;
  return v_profile;
end;
$$;

revoke all on function public.create_my_legacy_profile(text) from public, anon;
grant execute on function public.create_my_legacy_profile(text) to authenticated;

create or replace function public.request_my_profile_verification(p_nome text, p_cognome text, p_societa_id integer)
returns public.profile_verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.profile_verification_requests%rowtype;
  v_nome text := pg_catalog.btrim(p_nome);
  v_cognome text := pg_catalog.btrim(p_cognome);
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if v_nome is null or char_length(v_nome) not between 2 and 80
     or v_cognome is null or char_length(v_cognome) not between 2 and 80 then
    raise exception 'invalid_identity_data' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and societa_id is null) then
    raise exception 'profile_not_eligible' using errcode = '42501';
  end if;
  if not exists (select 1 from public.societa where id = p_societa_id and attiva = true) then
    raise exception 'team_not_available' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.profile_supports support
    join public.stagioni season on season.id = support.stagione_id and season.attiva = true
    where support.profile_id = auth.uid()
  ) then
    raise exception 'active_support_already_selected' using errcode = '23505';
  end if;

  insert into public.profile_verification_requests (profile_id, societa_id, nome, cognome)
  values (auth.uid(), p_societa_id, v_nome, v_cognome)
  returning * into v_request;
  return v_request;
exception when unique_violation then
  raise exception 'verification_request_conflict' using errcode = '23505';
end;
$$;

revoke all on function public.request_my_profile_verification(text, text, integer) from public, anon, authenticated;
grant execute on function public.request_my_profile_verification(text, text, integer) to authenticated, service_role;

create or replace function public.admin_review_profile_verification_request(
  p_request_id uuid, p_decision text, p_reviewer_id uuid, p_note_admin text default null
)
returns public.profile_verification_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.profile_verification_requests%rowtype;
begin
  if p_decision not in ('approved', 'rejected') or p_reviewer_id is null then
    raise exception 'invalid_review' using errcode = '22023';
  end if;
  select * into v_request from public.profile_verification_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if v_request.status <> 'pending' then raise exception 'request_already_reviewed' using errcode = '23505'; end if;
  if v_request.profile_id = p_reviewer_id then
    raise exception 'self_review_not_allowed' using errcode = '42501';
  end if;

  if p_decision = 'approved' then
    if not exists (select 1 from public.societa where id = v_request.societa_id and attiva = true) then
      raise exception 'team_not_available' using errcode = '22023';
    end if;
    update public.profiles
    set societa_id = v_request.societa_id, updated_at = now()
    where id = v_request.profile_id and societa_id is null;
    if not found then raise exception 'profile_not_eligible' using errcode = '42501'; end if;
  end if;

  update public.profile_verification_requests
  set status = p_decision, reviewed_at = now(), reviewed_by = p_reviewer_id,
      note_admin = nullif(pg_catalog.btrim(p_note_admin), '')
  where id = p_request_id
  returning * into v_request;
  return v_request;
end;
$$;

revoke all on function public.admin_review_profile_verification_request(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_review_profile_verification_request(uuid, text, uuid, text)
  to service_role;

commit;
