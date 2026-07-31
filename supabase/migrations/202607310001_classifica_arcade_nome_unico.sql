begin;

lock table public.classifica_arcade in share row exclusive mode;

-- Conserva per ogni nome il risultato migliore; a parità prevalgono il livello
-- più alto, il record aggiornato prima e infine la riga più vecchia.
with ranked as (
  select
    ctid,
    row_number() over (
      partition by nome_giocatore_normalizzato
      order by metri desc, livello desc, updated_at asc, created_at asc, id asc
    ) as posizione
  from public.classifica_arcade
)
delete from public.classifica_arcade classifica
using ranked
where classifica.ctid = ranked.ctid
  and ranked.posizione > 1;

-- Rimuove il precedente vincolo univoco, indipendentemente dal nome assegnato.
do $$
declare
  vincolo record;
begin
  for vincolo in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.classifica_arcade'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by chiave.ordinality)
        from unnest(con.conkey) with ordinality as chiave(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = con.conrelid
         and att.attnum = chiave.attnum
      ) @> array['nome_giocatore_normalizzato', 'societa_id']::name[]
  loop
    execute format('alter table public.classifica_arcade drop constraint %I', vincolo.conname);
  end loop;
end $$;

-- Elimina anche un eventuale indice univoco autonomo equivalente al vecchio
-- vincolo (gli indici appartenenti ai vincoli appena rimossi non esistono più).
do $$
declare
  indice record;
begin
  for indice in
    select idx.indexrelid::regclass as nome_indice
    from pg_index idx
    where idx.indrelid = 'public.classifica_arcade'::regclass
      and idx.indisunique
      and idx.indexrelid not in (
        select con.conindid from pg_constraint con
        where con.conrelid = 'public.classifica_arcade'::regclass
      )
      and pg_get_indexdef(idx.indexrelid) ilike '%nome_giocatore_normalizzato%'
      and pg_get_indexdef(idx.indexrelid) ilike '%societa_id%'
  loop
    execute format('drop index if exists %s', indice.nome_indice);
  end loop;
end $$;

create unique index if not exists classifica_arcade_nome_giocatore_normalizzato_uidx
  on public.classifica_arcade (nome_giocatore_normalizzato);

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
  v_nome := regexp_replace(btrim(coalesce(p_nome_giocatore, '')), '\s+', ' ', 'g');
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
  where excluded.metri > public.classifica_arcade.metri
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
