begin;

-- Distingue un consumo autenticato da un tentativo che ha comunque bruciato
-- atomicamente il token. I token precedenti restano usati ma non riutilizzabili.
alter table public.arcade_run_tokens
  add column if not exists consumed_valid boolean not null default false;

create or replace function public.consuma_arcade_run_token_v2(
  p_nonce text,
  p_player_id uuid,
  p_nome_giocatore_normalizzato text,
  p_societa_id integer
)
returns table (stato text, started_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.arcade_run_tokens%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_player_id is null then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  update public.arcade_run_tokens
  set used_at = v_now,
      player_id = coalesce(player_id, p_player_id),
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

  if v_token.player_id is distinct from p_player_id
     or v_token.nome_giocatore_normalizzato <> p_nome_giocatore_normalizzato
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

create or replace function public.salva_record_arcade_v3(
  p_nonce text,
  p_player_id uuid,
  p_nome_giocatore text,
  p_societa_id integer,
  p_livello smallint,
  p_metri integer
)
returns table (salvato boolean, livello_record smallint, metri_record integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nome text := regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g');
  v_normalized text := lower(regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g'));
  v_record public.classifica_arcade%rowtype;
begin
  if p_player_id is null
     or char_length(v_nome) < 2
     or char_length(v_nome) > 30
     or p_livello not between 1 and 3
     or p_metri < 100
     or p_societa_id is null
     or p_societa_id <= 0 then
    raise exception 'record_non_valido';
  end if;

  if not exists (
    select 1 from public.arcade_players ap
    where ap.player_id = p_player_id
      and ap.nickname_normalized = v_normalized
  ) then
    raise exception 'identita_non_valida';
  end if;

  if not exists (
    select 1 from public.arcade_run_tokens art
    where art.nonce = p_nonce
      and art.used_at is not null
      and art.consumed_valid = true
      and art.player_id = p_player_id
      and art.nome_giocatore_normalizzato = v_normalized
      and art.societa_id = p_societa_id
  ) then
    raise exception 'token_non_valido';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('score:' || p_player_id::text, 0));

  select * into v_record
  from public.classifica_arcade
  where player_id = p_player_id
  order by coalesce(livello, 1) desc, metri desc, updated_at asc, created_at asc, id asc
  limit 1
  for update;

  if not found then
    insert into public.classifica_arcade (
      player_id, nome_giocatore, nome_giocatore_normalizzato,
      societa_id, livello, metri
    ) values (
      p_player_id, v_nome, v_normalized, p_societa_id, p_livello, p_metri
    )
    returning * into v_record;
    return query select true, v_record.livello, v_record.metri;
    return;
  end if;

  if p_livello > coalesce(v_record.livello, 1)
     or (p_livello = coalesce(v_record.livello, 1) and p_metri > v_record.metri) then
    update public.classifica_arcade
    set nome_giocatore = v_nome,
        nome_giocatore_normalizzato = v_normalized,
        societa_id = p_societa_id,
        livello = p_livello,
        metri = p_metri,
        updated_at = now()
    where id = v_record.id
    returning * into v_record;
    return query select true, v_record.livello, v_record.metri;
    return;
  end if;

  return query select false, v_record.livello, v_record.metri;
end;
$$;

revoke all on function public.consuma_arcade_run_token_v2(text, uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.salva_record_arcade_v3(text, uuid, text, integer, smallint, integer)
  from public, anon, authenticated;
grant execute on function public.consuma_arcade_run_token_v2(text, uuid, text, integer)
  to service_role;
grant execute on function public.salva_record_arcade_v3(text, uuid, text, integer, smallint, integer)
  to service_role;

commit;
