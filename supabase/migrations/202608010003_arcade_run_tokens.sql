begin;

create table if not exists public.arcade_run_tokens (
  nonce text primary key,
  nome_giocatore_normalizzato text not null,
  societa_id integer not null,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint arcade_run_tokens_valid_window check (expires_at > started_at)
);

create index if not exists arcade_run_tokens_cleanup_idx
  on public.arcade_run_tokens (expires_at, used_at);

alter table public.arcade_run_tokens enable row level security;

create or replace function public.consuma_arcade_run_token(
  p_nonce text,
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
  v_ora timestamptz := clock_timestamp();
begin
  select * into v_token
  from public.arcade_run_tokens
  where nonce = p_nonce
  for update;

  if not found then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  if v_token.used_at is not null then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  update public.arcade_run_tokens
  set used_at = v_ora
  where nonce = p_nonce;

  if v_token.expires_at <= v_ora then
    return query select 'expired'::text, v_token.started_at;
    return;
  end if;

  if v_token.nome_giocatore_normalizzato <> p_nome_giocatore_normalizzato
    or v_token.societa_id <> p_societa_id then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;

  delete from public.arcade_run_tokens
  where expires_at < v_ora - interval '1 day'
     or used_at < v_ora - interval '1 day';

  return query select 'consumed'::text, v_token.started_at;
end;
$$;

revoke all on table public.arcade_run_tokens from public, anon, authenticated;
revoke all on function public.consuma_arcade_run_token(text, text, integer) from public, anon, authenticated;
grant execute on function public.consuma_arcade_run_token(text, text, integer) to service_role;

commit;
