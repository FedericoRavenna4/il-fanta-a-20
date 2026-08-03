-- Run only if 202608030001_societa_registry.sql has already been applied.
-- This migration has not been executed automatically.

begin;

create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_societa_name(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent(input)), '[^a-z0-9]+', '', 'g');
$$;

do $$
begin
  if exists (
    select 1
    from public.societa
    group by public.normalize_societa_name(coalesce(nome_personalizzato, nome_ufficiale))
    having count(*) > 1
  ) then
    raise exception 'Normalizzazione società annullata: collisione tra nomi di società';
  end if;

  if exists (
    select 1
    from public.societa_alias
    group by public.normalize_societa_name(alias)
    having count(distinct societa_id) > 1
  ) then
    raise exception 'Normalizzazione società annullata: collisione alias tra società diverse';
  end if;
end;
$$;

delete from public.societa_alias duplicate
using public.societa_alias canonical
where duplicate.societa_id = canonical.societa_id
  and duplicate.id > canonical.id
  and public.normalize_societa_name(duplicate.alias) =
      public.normalize_societa_name(canonical.alias);

update public.societa
set nome_normalizzato = public.normalize_societa_name(
  coalesce(nome_personalizzato, nome_ufficiale)
);

update public.societa_alias
set alias_normalizzato = public.normalize_societa_name(alias);

commit;
