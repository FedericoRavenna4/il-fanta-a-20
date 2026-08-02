begin;

-- Identita persistente del giocatore. I record storici restano senza player_id:
-- nessun UUID viene inventato o assegnato in base al solo nickname.
create table if not exists public.arcade_players (
  player_id uuid primary key,
  nickname text not null,
  nickname_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilita con un'eventuale esecuzione parziale della prima bozza locale.
alter table public.arcade_players
  add column if not exists nickname_normalized text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'arcade_players'
      and column_name = 'nickname_normalizzato'
  ) then
    execute $sql$
      update public.arcade_players
      set nickname_normalized = nickname_normalizzato
      where nickname_normalized is null
    $sql$;
  end if;
end
$$;

update public.arcade_players
set nickname_normalized = lower(regexp_replace(btrim(nickname), '\s+', ' ', 'g'))
where nickname_normalized is null;

alter table public.arcade_players
  alter column nickname_normalized set not null;

create unique index if not exists arcade_players_nickname_normalized_uidx
  on public.arcade_players (nickname_normalized);

alter table public.arcade_players enable row level security;
revoke all on table public.arcade_players from public, anon, authenticated;
grant select, insert, update on table public.arcade_players to service_role;

alter table public.classifica_arcade
  add column if not exists player_id uuid null;

alter table public.arcade_run_tokens
  add column if not exists player_id uuid null;

alter table public.arcade_run_tokens
  add column if not exists consumed_valid boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classifica_arcade'::regclass
      and conname = 'classifica_arcade_player_id_fkey'
  ) then
    alter table public.classifica_arcade
      add constraint classifica_arcade_player_id_fkey
      foreign key (player_id) references public.arcade_players(player_id)
      on delete set null not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.arcade_run_tokens'::regclass
      and conname = 'arcade_run_tokens_player_id_fkey'
  ) then
    alter table public.arcade_run_tokens
      add constraint arcade_run_tokens_player_id_fkey
      foreign key (player_id) references public.arcade_players(player_id)
      on delete set null not valid;
  end if;
end
$$;

alter table public.classifica_arcade
  validate constraint classifica_arcade_player_id_fkey;
alter table public.arcade_run_tokens
  validate constraint arcade_run_tokens_player_id_fkey;

-- Il vecchio vincolo sul nickname non rappresenta piu l'identita. La nuova
-- unicita e garantita da arcade_players, mentre i record legacy restano null.
drop index if exists public.classifica_arcade_nome_giocatore_normalizzato_uidx;

create unique index if not exists classifica_arcade_player_id_uidx
  on public.classifica_arcade (player_id)
  where player_id is not null;

create index if not exists classifica_arcade_player_ranking_idx
  on public.classifica_arcade
  (player_id, livello desc, metri desc, updated_at asc, created_at asc);

create index if not exists arcade_run_tokens_player_id_idx
  on public.arcade_run_tokens (player_id, expires_at desc);

-- Rimuove soltanto le firme obsolete della bozza Player ID, se una precedente
-- esecuzione parziale le avesse create. Le RPC legacy usate dal runtime attuale
-- restano disponibili fino all'attivazione applicativa definitiva.
drop function if exists public.assegna_nickname_arcade(uuid, text);
drop function if exists public.salva_record_arcade_v3(uuid, text, integer, smallint, integer);

create or replace function public.assegna_nickname_arcade(
  p_player_id uuid,
  p_nickname text,
  p_nickname_normalized text
)
returns table (
  accepted boolean,
  status text,
  nickname text,
  nickname_normalized text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nickname text := regexp_replace(btrim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
  v_normalized text := lower(regexp_replace(btrim(coalesce(p_nickname_normalized, '')), '\s+', ' ', 'g'));
  v_expected text;
  v_owner uuid;
begin
  v_expected := lower(v_nickname);

  if p_player_id is null
     or char_length(v_nickname) < 2
     or char_length(v_nickname) > 30
     or v_nickname ~ '[<>[:cntrl:]]'
     or v_normalized <> v_expected then
    return query select false, 'invalid'::text, null::text, null::text;
    return;
  end if;

  -- Serializza sia il nickname sia il Player ID: due richieste concorrenti non
  -- possono assegnare lo stesso nome o cambiare lo stesso profilo in parallelo.
  perform pg_advisory_xact_lock(hashtextextended('nickname:' || v_normalized, 0));
  perform pg_advisory_xact_lock(hashtextextended('player:' || p_player_id::text, 0));

  select ap.player_id into v_owner
  from public.arcade_players ap
  where ap.nickname_normalized = v_normalized
  for update;

  if found and v_owner <> p_player_id then
    return query select false, 'nickname_taken'::text, null::text, v_normalized;
    return;
  end if;

  insert into public.arcade_players (player_id, nickname, nickname_normalized)
  values (p_player_id, v_nickname, v_normalized)
  on conflict (player_id) do update
    set nickname = excluded.nickname,
        nickname_normalized = excluded.nickname_normalized,
        updated_at = now();

  return query select true, 'assigned'::text, v_nickname, v_normalized;
exception
  when unique_violation then
    return query select false, 'nickname_taken'::text, null::text, v_normalized;
end;
$$;

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

  -- L'UPDATE rende il consumo atomico. Un token legacy ancora valido (player_id
  -- null) puo essere legato al Player ID del primo tentativo verificato.
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

  -- La firma e la plausibilita sono verificate dal server Next.js. La RPC
  -- accetta soltanto il nonce gia consumato atomicamente dalla v2 e coerente
  -- con la stessa identita, nickname e societa.
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
  order by coalesce(livello, 1) desc,
           metri desc,
           updated_at asc,
           created_at asc,
           id asc
  limit 1
  for update;

  if not found then
    insert into public.classifica_arcade (
      player_id,
      nome_giocatore,
      nome_giocatore_normalizzato,
      societa_id,
      livello,
      metri
    ) values (
      p_player_id,
      v_nome,
      v_normalized,
      p_societa_id,
      p_livello,
      p_metri
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

revoke all on function public.assegna_nickname_arcade(uuid, text, text) from public, anon, authenticated;
revoke all on function public.consuma_arcade_run_token_v2(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.salva_record_arcade_v3(text, uuid, text, integer, smallint, integer) from public, anon, authenticated;

grant execute on function public.assegna_nickname_arcade(uuid, text, text) to service_role;
grant execute on function public.consuma_arcade_run_token_v2(text, uuid, text, integer) to service_role;
grant execute on function public.salva_record_arcade_v3(text, uuid, text, integer, smallint, integer) to service_role;

comment on table public.arcade_players is
  'Identita persistenti Arcade. Il Player ID identifica il browser ma non e un segreto di autenticazione.';

commit;
