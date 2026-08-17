begin;

alter table public.classifica_arcade
  add column if not exists profile_id uuid null;

alter table public.arcade_run_tokens
  add column if not exists profile_id uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classifica_arcade'::regclass
      and conname = 'classifica_arcade_profile_id_fkey'
  ) then
    alter table public.classifica_arcade
      add constraint classifica_arcade_profile_id_fkey
      foreign key (profile_id) references public.profiles(id)
      on delete set null not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.arcade_run_tokens'::regclass
      and conname = 'arcade_run_tokens_profile_id_fkey'
  ) then
    alter table public.arcade_run_tokens
      add constraint arcade_run_tokens_profile_id_fkey
      foreign key (profile_id) references public.profiles(id)
      on delete set null not valid;
  end if;
end
$$;

alter table public.classifica_arcade
  validate constraint classifica_arcade_profile_id_fkey;
alter table public.arcade_run_tokens
  validate constraint arcade_run_tokens_profile_id_fkey;

create unique index if not exists classifica_arcade_profile_id_uidx
  on public.classifica_arcade (profile_id)
  where profile_id is not null;

create index if not exists arcade_run_tokens_profile_id_idx
  on public.arcade_run_tokens (profile_id, expires_at desc);

create or replace function public.consuma_arcade_run_token_v3(
  p_nonce text,
  p_profile_id uuid,
  p_societa_id integer
)
returns table (stato text, started_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.arcade_run_tokens%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_profile_id is null then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  update public.arcade_run_tokens
  set used_at = v_now,
      consumed_valid = false
  where nonce = p_nonce
    and used_at is null
  returning * into v_token;

  if not found then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  if v_token.expires_at <= v_now then
    return query select 'expired'::text, v_token.started_at;
    return;
  end if;

  if v_token.profile_id is distinct from p_profile_id
     or v_token.societa_id <> p_societa_id then
    return query select 'invalid'::text, v_token.started_at;
    return;
  end if;

  update public.arcade_run_tokens
  set consumed_valid = true
  where nonce = p_nonce;

  delete from public.arcade_run_tokens
  where expires_at < v_now - interval '1 day'
     or used_at < v_now - interval '1 day';

  return query select 'consumed'::text, v_token.started_at;
end;
$$;

create or replace function public.salva_record_arcade_v4(
  p_nonce text,
  p_profile_id uuid,
  p_societa_id integer,
  p_livello smallint,
  p_metri integer
)
returns table (salvato boolean, livello_record smallint, metri_record integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_normalized text;
  v_record public.classifica_arcade%rowtype;
begin
  if p_profile_id is null
   or p_livello is null
   or p_livello not between 1 and 3
   or p_metri is null
   or p_metri < 100
   or p_societa_id is null
   or p_societa_id <= 0 then
  raise exception 'record_non_valido';
end if;

  select profile.username, profile.username_normalizzato
  into v_username, v_normalized
  from public.profiles profile
  where profile.id = p_profile_id;

  if not found or v_username is null or v_normalized is null then
    raise exception 'identita_non_valida';
  end if;

  if not exists (
    select 1 from public.arcade_run_tokens token
    where token.nonce = p_nonce
      and token.used_at is not null
      and token.consumed_valid = true
      and token.profile_id = p_profile_id
      and token.societa_id = p_societa_id
  ) then
    raise exception 'token_non_valido';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('arcade-account-score:' || p_profile_id::text, 0)
  );

  select * into v_record
  from public.classifica_arcade
  where profile_id = p_profile_id
  order by coalesce(livello, 1) desc, metri desc, updated_at asc, created_at asc, id asc
  limit 1
  for update;

  if not found then
    insert into public.classifica_arcade (
      profile_id, player_id, nome_giocatore, nome_giocatore_normalizzato,
      societa_id, livello, metri
    ) values (
      p_profile_id, null, v_username, v_normalized,
      p_societa_id, p_livello, p_metri
    )
    returning * into v_record;
    return query select true, v_record.livello, v_record.metri;
    return;
  end if;

  if p_livello > coalesce(v_record.livello, 1)
     or (p_livello = coalesce(v_record.livello, 1) and p_metri > v_record.metri) then
    update public.classifica_arcade
    set nome_giocatore = v_username,
        nome_giocatore_normalizzato = v_normalized,
        societa_id = p_societa_id,
        livello = p_livello,
        metri = p_metri,
        updated_at = pg_catalog.now()
    where id = v_record.id
    returning * into v_record;
    return query select true, v_record.livello, v_record.metri;
    return;
  end if;

  return query select false, v_record.livello, v_record.metri;
end;
$$;

revoke all on function public.consuma_arcade_run_token_v3(text, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.salva_record_arcade_v4(text, uuid, integer, smallint, integer)
  from public, anon, authenticated;
grant execute on function public.consuma_arcade_run_token_v3(text, uuid, integer)
  to service_role;
grant execute on function public.salva_record_arcade_v4(text, uuid, integer, smallint, integer)
  to service_role;

comment on column public.classifica_arcade.profile_id is
  'Identita Account Fanta a 20 autorevole per i record Arcade account-based.';
comment on column public.arcade_run_tokens.profile_id is
  'Account autenticato ricavato server-side all avvio della corsa.';

commit;
