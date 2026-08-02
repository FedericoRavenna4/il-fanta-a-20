begin;

-- Migliora le letture della Top 100 senza modificare o eliminare record esistenti.
create index if not exists classifica_arcade_livello_metri_data_idx
  on public.classifica_arcade (livello desc, metri desc, updated_at asc);

drop function if exists public.salva_record_arcade(text, integer, smallint, integer);

create function public.salva_record_arcade(
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
  v_nome text;
  v_nome_normalizzato text;
  v_record public.classifica_arcade%rowtype;
begin
  v_nome := upper(regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g'));
  v_nome_normalizzato := lower(v_nome);

  if char_length(v_nome) < 2 or char_length(v_nome) > 50 then
    raise exception 'nome_giocatore_non_valido';
  end if;
  if p_livello not between 1 and 3 then
    raise exception 'livello_non_valido';
  end if;
  if p_metri < 100 then
    raise exception 'metri_non_validi';
  end if;
  if p_societa_id is null or p_societa_id <= 0 then
    raise exception 'societa_non_valida';
  end if;

  insert into public.classifica_arcade (
    nome_giocatore,
    nome_giocatore_normalizzato,
    societa_id,
    livello,
    metri
  ) values (
    v_nome,
    v_nome_normalizzato,
    p_societa_id,
    p_livello,
    p_metri
  )
  on conflict (nome_giocatore_normalizzato) do update
  set nome_giocatore = excluded.nome_giocatore,
      societa_id = excluded.societa_id,
      livello = excluded.livello,
      metri = excluded.metri,
      updated_at = now()
  where excluded.livello > public.classifica_arcade.livello
     or (
       excluded.livello = public.classifica_arcade.livello
       and excluded.metri > public.classifica_arcade.metri
     )
  returning * into v_record;

  if found then
    return query select true, v_record.metri;
  end if;

  select * into v_record
  from public.classifica_arcade
  where nome_giocatore_normalizzato = v_nome_normalizzato;
  return query select false, v_record.metri;
end;
$$;

revoke all on function public.salva_record_arcade(text, integer, smallint, integer) from public;
grant execute on function public.salva_record_arcade(text, integer, smallint, integer) to service_role;

commit;
