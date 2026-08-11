begin;

create table public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  societa_id integer not null references public.societa(id) on delete restrict,
  nome text not null check (char_length(nome) between 2 and 80 and nome = btrim(nome)),
  cognome text not null check (char_length(cognome) between 2 and 80 and cognome = btrim(cognome)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  note_admin text,
  constraint profile_verification_review_coherent check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index profile_verification_one_pending_per_profile
  on public.profile_verification_requests (profile_id)
  where status = 'pending';

create index profile_verification_status_created_idx
  on public.profile_verification_requests (status, created_at desc);

alter table public.profile_verification_requests enable row level security;
revoke all on public.profile_verification_requests from public, anon, authenticated;
grant select on public.profile_verification_requests to authenticated;
grant select, insert, update on public.profile_verification_requests to service_role;

create policy profile_verification_read_own
on public.profile_verification_requests for select to authenticated
using (profile_id = auth.uid());

create function public.request_my_profile_verification(
  p_nome text,
  p_cognome text,
  p_societa_id integer
)
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
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
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
  if exists (select 1 from public.profiles where societa_id = p_societa_id and id <> auth.uid()) then
    raise exception 'team_already_verified' using errcode = '23505';
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

revoke all on function public.request_my_profile_verification(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.request_my_profile_verification(text, text, integer)
  to authenticated, service_role;

create function private.block_support_while_verification_pending()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.profile_verification_requests
    where profile_id = new.profile_id and status = 'pending'
  ) then
    raise exception 'verification_pending' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.block_support_while_verification_pending()
  from public, anon, authenticated;

create trigger profile_supports_block_pending_verification
before insert on public.profile_supports
for each row execute function private.block_support_while_verification_pending();

create function public.admin_review_profile_verification_request(
  p_request_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note_admin text default null
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
    perform pg_catalog.pg_advisory_xact_lock(v_request.societa_id::bigint);
    if not exists (select 1 from public.societa where id = v_request.societa_id and attiva = true) then
      raise exception 'team_not_available' using errcode = '22023';
    end if;
    if exists (select 1 from public.profiles where societa_id = v_request.societa_id and id <> v_request.profile_id) then
      raise exception 'team_already_verified' using errcode = '23505';
    end if;
    update public.profiles
    set societa_id = v_request.societa_id, updated_at = now()
    where id = v_request.profile_id and societa_id is null;
    if not found then raise exception 'profile_not_eligible' using errcode = '42501'; end if;
  end if;

  update public.profile_verification_requests
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = p_reviewer_id,
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

comment on table public.profile_verification_requests is
  'Richieste sottoposte a verifica umana fuori banda; nessuna approvazione automatica.';

commit;
