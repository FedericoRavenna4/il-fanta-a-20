begin;

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
  select * into v_request
  from public.profile_verification_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if v_request.status <> 'pending' then raise exception 'request_already_reviewed' using errcode = '23505'; end if;

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
