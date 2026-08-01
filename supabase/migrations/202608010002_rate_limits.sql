begin;

create table if not exists public.rate_limits (
  ambito text not null,
  chiave_hash text not null,
  finestra_inizio timestamptz not null default now(),
  tentativi integer not null default 1 check (tentativi > 0),
  primary key (ambito, chiave_hash)
);

alter table public.rate_limits enable row level security;

create or replace function public.consuma_rate_limit(
  p_chiave_hash text,
  p_ambito text,
  p_limite integer,
  p_finestra_secondi integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ora timestamptz := clock_timestamp();
  v_tentativi integer;
begin
  if p_chiave_hash !~ '^[a-f0-9]{64}$'
    or p_ambito not in ('waitlist_submission', 'arcade_record')
    or p_limite < 1
    or p_finestra_secondi < 1 then
    raise exception 'parametri_rate_limit_non_validi';
  end if;

  insert into public.rate_limits (ambito, chiave_hash, finestra_inizio, tentativi)
  values (p_ambito, p_chiave_hash, v_ora, 1)
  on conflict (ambito, chiave_hash) do update
  set tentativi = case
        when public.rate_limits.finestra_inizio <= v_ora - make_interval(secs => p_finestra_secondi)
          then 1
        else public.rate_limits.tentativi + 1
      end,
      finestra_inizio = case
        when public.rate_limits.finestra_inizio <= v_ora - make_interval(secs => p_finestra_secondi)
          then v_ora
        else public.rate_limits.finestra_inizio
      end
  returning tentativi into v_tentativi;

  delete from public.rate_limits
  where finestra_inizio < v_ora - interval '7 days';

  return v_tentativi <= p_limite;
end;
$$;

revoke all on table public.rate_limits from public, anon, authenticated;
revoke all on function public.consuma_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consuma_rate_limit(text, text, integer, integer) to service_role;

commit;
