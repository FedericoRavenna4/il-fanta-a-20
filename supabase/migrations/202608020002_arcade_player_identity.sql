begin;

create table if not exists public.arcade_players (
  player_id uuid primary key,
  nickname text not null,
  nickname_normalizzato text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arcade_players enable row level security;
revoke all on table public.arcade_players from anon, authenticated;
grant select, insert, update on table public.arcade_players to service_role;

-- I record storici restano invariati e continuano a essere raggruppati per nickname.
alter table public.classifica_arcade add column if not exists player_id uuid null;
alter table public.arcade_run_tokens add column if not exists player_id uuid null;

drop index if exists public.classifica_arcade_nome_giocatore_normalizzato_uidx;
create index if not exists classifica_arcade_player_ranking_idx
  on public.classifica_arcade (player_id, livello desc, metri desc, updated_at asc);

create or replace function public.assegna_nickname_arcade(
  p_player_id uuid,
  p_nome_giocatore text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nome text := regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g');
  v_normalizzato text;
  v_owner uuid;
begin
  if p_player_id is null or char_length(v_nome) < 2 or char_length(v_nome) > 30
     or v_nome ~ '[<>[:cntrl:]]' then
    return false;
  end if;
  v_normalizzato := lower(v_nome);
  perform pg_advisory_xact_lock(hashtextextended(v_normalizzato, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_player_id::text, 1));

  select player_id into v_owner
  from public.arcade_players
  where nickname_normalizzato = v_normalizzato;
  if found and v_owner <> p_player_id then return false; end if;

  insert into public.arcade_players (player_id, nickname, nickname_normalizzato)
  values (p_player_id, v_nome, v_normalizzato)
  on conflict (player_id) do update
    set nickname = excluded.nickname,
        nickname_normalizzato = excluded.nickname_normalizzato,
        updated_at = now();
  -- Associa al primo proprietario verificato gli eventuali risultati precedenti
  -- allo schema Player ID, senza modificarne nome, punteggio o data.
  update public.classifica_arcade
  set player_id = p_player_id
  where player_id is null and nome_giocatore_normalizzato = v_normalizzato;
  return true;
exception when unique_violation then
  return false;
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
declare v_token public.arcade_run_tokens%rowtype;
begin
  update public.arcade_run_tokens set used_at = now()
  where nonce = p_nonce and used_at is null
  returning * into v_token;
  if not found then return query select 'invalid'::text, null::timestamptz; return; end if;
  if v_token.expires_at < now() then return query select 'expired'::text, v_token.started_at; return; end if;
  if v_token.player_id is distinct from p_player_id
     or v_token.nome_giocatore_normalizzato <> p_nome_giocatore_normalizzato
     or v_token.societa_id <> p_societa_id then
    return query select 'invalid'::text, v_token.started_at; return;
  end if;
  return query select 'consumed'::text, v_token.started_at;
end;
$$;

create or replace function public.salva_record_arcade_v3(
  p_player_id uuid,
  p_nome_giocatore text,
  p_societa_id integer,
  p_livello smallint,
  p_metri integer
)
returns table (salvato boolean, metri_record integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nome text := regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g');
  v_normalizzato text;
  v_record public.classifica_arcade%rowtype;
begin
  v_normalizzato := lower(v_nome);
  if p_player_id is null or p_livello not between 1 and 3 or p_metri < 100 then
    raise exception 'record_non_valido';
  end if;
  if not exists (select 1 from public.arcade_players where player_id = p_player_id and nickname_normalizzato = v_normalizzato) then
    raise exception 'identita_non_valida';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_player_id::text, 0));
  select * into v_record from public.classifica_arcade
  where player_id = p_player_id
  order by coalesce(livello, 1) desc, metri desc, updated_at asc, created_at asc, id asc
  limit 1 for update;
  if not found then
    insert into public.classifica_arcade
      (player_id, nome_giocatore, nome_giocatore_normalizzato, societa_id, livello, metri)
    values (p_player_id, v_nome, v_normalizzato, p_societa_id, p_livello, p_metri)
    returning * into v_record;
    return query select true, v_record.metri; return;
  end if;
  if p_livello > coalesce(v_record.livello, 1)
     or (p_livello = coalesce(v_record.livello, 1) and p_metri > v_record.metri) then
    update public.classifica_arcade set
      nome_giocatore = v_nome, nome_giocatore_normalizzato = v_normalizzato,
      societa_id = p_societa_id, livello = p_livello, metri = p_metri, updated_at = now()
    where id = v_record.id returning * into v_record;
    return query select true, v_record.metri; return;
  end if;
  return query select false, v_record.metri;
end;
$$;

revoke all on function public.assegna_nickname_arcade(uuid, text) from public;
revoke all on function public.consuma_arcade_run_token_v2(text, uuid, text, integer) from public;
revoke all on function public.salva_record_arcade_v3(uuid, text, integer, smallint, integer) from public;
grant execute on function public.assegna_nickname_arcade(uuid, text) to service_role;
grant execute on function public.consuma_arcade_run_token_v2(text, uuid, text, integer) to service_role;
grant execute on function public.salva_record_arcade_v3(uuid, text, integer, smallint, integer) to service_role;

commit;
