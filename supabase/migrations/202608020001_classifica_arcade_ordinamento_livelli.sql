begin;

-- I record storici privi di livello equivalgono al livello 1.
update public.classifica_arcade
set livello = 1
where livello is null;

alter table public.classifica_arcade
  alter column livello set default 1,
  alter column livello set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.classifica_arcade'::regclass
      and conname = 'classifica_arcade_livello_check'
  ) then
    alter table public.classifica_arcade
      add constraint classifica_arcade_livello_check check (livello between 1 and 3);
  end if;
end
$$;

-- Migliora le letture della Top 100 senza modificare o eliminare record esistenti.
create index if not exists classifica_arcade_livello_metri_data_idx
  on public.classifica_arcade (livello desc, metri desc, updated_at asc);

create index if not exists classifica_arcade_nome_normalizzato_idx
  on public.classifica_arcade (nome_giocatore_normalizzato);

create or replace function public.salva_record_arcade_v2(
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

  -- Serializza i salvataggi dello stesso nickname senza richiedere la rimozione
  -- dei duplicati storici o un nuovo vincolo univoco.
  perform pg_advisory_xact_lock(hashtextextended(v_nome_normalizzato, 0));

  select * into v_record
  from public.classifica_arcade
  where nome_giocatore_normalizzato = v_nome_normalizzato
  order by coalesce(livello, 1) desc, metri desc, updated_at asc, created_at asc, id asc
  limit 1
  for update;

  if not found then
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
    returning * into v_record;
    return query select true, v_record.metri;
    return;
  end if;

  if p_livello > coalesce(v_record.livello, 1)
     or (p_livello = coalesce(v_record.livello, 1) and p_metri > v_record.metri) then
    update public.classifica_arcade
    set nome_giocatore = v_nome,
        nome_giocatore_normalizzato = v_nome_normalizzato,
        societa_id = p_societa_id,
        livello = p_livello,
        metri = p_metri,
        updated_at = now()
    where id = v_record.id
    returning * into v_record;
    return query select true, v_record.metri;
    return;
  end if;

  return query select false, v_record.metri;
end;
$$;

revoke all on function public.salva_record_arcade_v2(text, integer, smallint, integer) from public;
grant execute on function public.salva_record_arcade_v2(text, integer, smallint, integer) to service_role;

commit;
