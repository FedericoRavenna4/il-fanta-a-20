-- Base Account Fanta a 20. Prepare locally and apply only after reviewing existing auth users.
begin;

create table public.reserved_usernames (
  username_normalizzato text primary key,
  created_at timestamptz not null default now()
);

insert into public.reserved_usernames (username_normalizzato) values
  ('admin'), ('administrator'), ('amministratore'), ('staff'),
  ('moderator'), ('mod'), ('official'), ('ufficiale'), ('support'),
  ('assistenza'), ('system'), ('root'), ('fantaa20'), ('fanta20'),
  ('ilfantaa20');

create or replace function public.normalize_account_username(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(btrim(input));
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalizzato text not null unique,
  societa_id integer null references public.societa(id) on delete set null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_formato_check
    check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,23}$'),
  constraint profiles_username_normalizzato_coerente_check
    check (username_normalizzato = public.normalize_account_username(username))
);

create or replace function public.validate_account_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.username is null or new.username !~ '^[A-Za-z][A-Za-z0-9_]{2,23}$' then
    raise exception 'USERNAME_NON_VALIDO' using errcode = '22023';
  end if;

  new.username_normalizzato := public.normalize_account_username(new.username);

  if exists (
    select 1
    from public.reserved_usernames reserved
    where reserved.username_normalizzato = new.username_normalizzato
  ) then
    raise exception 'USERNAME_RISERVATO' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger profiles_validate_before_insert
before insert on public.profiles
for each row execute function public.validate_account_profile();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create or replace function public.handle_new_account_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := new.raw_user_meta_data ->> 'username';

  insert into public.profiles (id, username, username_normalizzato)
  values (
    new.id,
    requested_username,
    public.normalize_account_username(requested_username)
  );

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_account_user();

alter table public.profiles enable row level security;
alter table public.reserved_usernames enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.reserved_usernames from public, anon, authenticated;
revoke all on function public.normalize_account_username(text) from public, anon, authenticated;
revoke all on function public.validate_account_profile() from public, anon, authenticated;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_account_user() from public, anon, authenticated;

grant select (id, username, societa_id, avatar_url) on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.reserved_usernames to service_role;

create policy profiles_public_read
on public.profiles for select
to anon, authenticated
using (true);

-- Profiles are intentionally immutable from the client in this first phase.
-- In particular, no INSERT, UPDATE or DELETE policy/grant is provided to authenticated.

commit;
