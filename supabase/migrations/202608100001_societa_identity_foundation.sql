-- Fase 1: identita corrente delle societa, slug canonici stabili e rinomina sicura.
-- Questa migration non migra alcun consumer frontend e deve essere revisionata prima del run remoto.

begin;

create or replace function public.set_societa_nome_normalizzato()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.nome_normalizzato := public.normalize_societa_name(
    coalesce(new.nome_personalizzato, new.nome_ufficiale)
  );
  return new;
end;
$$;

drop trigger if exists societa_set_nome_normalizzato on public.societa;
create trigger societa_set_nome_normalizzato
before insert or update of nome_ufficiale, nome_personalizzato
on public.societa
for each row execute function public.set_societa_nome_normalizzato();

revoke all on function public.set_societa_nome_normalizzato()
  from public, anon, authenticated;

alter table public.societa
  add column slug text null;

update public.societa company
set slug = seed.slug
from (values
  (1, 'kung-fu-parma-calcio'),
  (2, 'coolinese-fc'),
  (3, 'analanta'),
  (4, 'cagliarithanos'),
  (5, 'iroman'),
  (6, 'i-leccendari'),
  (7, 'interstellar'),
  (8, 'viva-la-pisa'),
  (9, 'brodena'),
  (10, 'bolagna'),
  (11, 'milantatori'),
  (12, 'predatorino'),
  (13, 'como-habilis'),
  (14, 'hellas-tronza'),
  (15, 'materassuolo'),
  (16, 'cremonelle'),
  (17, 'napolizia'),
  (18, 'fiorentoni-pepperoni'),
  (19, 'venezio-greggio-fc'),
  (20, 'scoreggiana'),
  (21, 'juventrap'),
  (22, 'fel-lazio'),
  (23, 'genoa-lang'),
  (24, 'bario-roggero'),
  (25, 'licorto-muso-fc'),
  (26, 'palermavai-ma-vieni-ma-chi-sono'),
  (27, 'andrea-e-giugliano'),
  (28, 'ospitaletto'),
  (29, 'pescaramuccia'),
  (30, 'bacarpi-schitz'),
  (31, 'mantovai'),
  (32, 'frosilvione'),
  (33, 'monzarella-e-pomodoro'),
  (34, 'juve-scabbia'),
  (35, 'padovaincul'),
  (36, 'spezial-one'),
  (37, 'empoliticamente-scorretto'),
  (38, 'cartanzaro'),
  (39, 'fc-cesenartico'),
  (40, 'virtus-tavernello'),
  (41, 'fc-tiramisudtirol'),
  (42, 'lanarhoades-vicenza'),
  (43, 'scarenate-l-inferno'),
  (44, 'ciolone-milano'),
  (45, 'el-dolomitazo'),
  (46, 'cittasnella'),
  (47, 'virtual-verona'),
  (48, 'albionoleffe'),
  (49, 'as-giana-erminio'),
  (50, 'lecco-benfica'),
  (51, 'communion-brescia'),
  (52, 'aurora-pro-patriarcato'),
  (53, 'next-gengis-khan'),
  (54, 'pro-verchell'),
  (55, 'triest-in-peace'),
  (56, 'fc-arzignano-vacchiappo'),
  (57, 'lumezzanegger'),
  (58, 'novar'),
  (59, 'pergoletette'),
  (60, 'trento-la-fortuna'),
  (61, 'agnellino'),
  (62, 'forlippo-inzaghi'),
  (63, 'campobasta'),
  (64, 'pontedera'),
  (65, 'gubbiodsq'),
  (66, 'ravengers-fc'),
  (67, 'pascoli'),
  (68, 'arezzo-parlo-io'),
  (69, 'guidonia-montecieco'),
  (70, 'pinetonic'),
  (71, 'cobra-11'),
  (72, 'pesarotti'),
  (73, 'rimiccoli'),
  (74, 'ternani'),
  (75, 'baci-perugina-fc'),
  (76, 'torres'),
  (77, 'piagnese'),
  (78, 'intercettazioni-u23'),
  (79, 'naspicerno'),
  (80, 'siracusa'),
  (81, 'sampdodoria'),
  (82, 'sambenedetta-domenica'),
  (83, 'cassarano'),
  (84, 'monopoly'),
  (85, 'croton-fioc'),
  (86, 'kakasertana'),
  (87, 'ficarrarese-e-picone'),
  (88, 'biancavese'),
  (89, 'benevengo'),
  (90, 'accattania'),
  (91, 'us-lattina-calcio-1932'),
  (92, 'audace-cerizola'),
  (93, 'sorry-scusa-sorrento'),
  (94, 'borentus-trapani'),
  (95, 'vosenza'),
  (96, 'patata-lanta-un23'),
  (97, 'altamourinho'),
  (98, 'foggin-mare'),
  (99, 'salernitonica'),
  (100, 'con-mollica-o-senza')
) as seed(id, slug)
where company.id = seed.id;

do $$
declare
  missing_ids text;
  company_count integer;
  minimum_id integer;
  maximum_id integer;
begin
  select count(*)::integer, min(id), max(id)
  into company_count, minimum_id, maximum_id
  from public.societa;

  if company_count <> 100 or minimum_id <> 1 or maximum_id <> 100 then
    raise exception 'SOCIETA_SLUG_BASELINE_INATTESA: attese 100 societa con ID 1-100, trovate % con range %-%',
      company_count, minimum_id, maximum_id;
  end if;

  select string_agg(id::text, ', ' order by id)
  into missing_ids
  from public.societa
  where slug is null;

  if missing_ids is not null then
    raise exception 'SOCIETA_SLUG_BACKFILL_INCOMPLETO: ID senza slug: %', missing_ids;
  end if;
end;
$$;

alter table public.societa
  alter column slug set not null,
  add constraint societa_slug_formato check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint societa_slug_unique unique (slug);

create table public.societa_slug_aliases (
  slug text primary key,
  societa_id integer not null references public.societa(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint societa_slug_aliases_slug_formato
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index societa_slug_aliases_societa_id_idx
  on public.societa_slug_aliases (societa_id);

create or replace function public.validate_societa_canonical_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.societa.slug_namespace', 0)
  );

  if exists (
    select 1
    from public.societa_slug_aliases alias
    where alias.slug = new.slug
  ) then
    raise exception 'SOCIETA_SLUG_AMBIGUO: lo slug % esiste gia come alias', new.slug
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger societa_validate_canonical_slug
before insert or update of slug on public.societa
for each row execute function public.validate_societa_canonical_slug();

revoke all on function public.validate_societa_canonical_slug()
  from public, anon, authenticated;

create or replace function public.validate_societa_slug_alias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.societa.slug_namespace', 0)
  );

  if exists (
    select 1
    from public.societa company
    where company.slug = new.slug
  ) then
    raise exception 'SOCIETA_SLUG_AMBIGUO: lo slug % e gia canonico', new.slug
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger societa_slug_aliases_validate
before insert or update of slug on public.societa_slug_aliases
for each row execute function public.validate_societa_slug_alias();

revoke all on function public.validate_societa_slug_alias()
  from public, anon, authenticated;

alter table public.societa_slug_aliases enable row level security;

revoke all on table public.societa_slug_aliases from public, anon, authenticated;
grant select on table public.societa_slug_aliases to anon, authenticated;
grant select, insert, update, delete on table public.societa_slug_aliases to service_role;

create policy societa_slug_aliases_public_read_active
on public.societa_slug_aliases
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.societa company
    where company.id = societa_slug_aliases.societa_id
      and company.attiva = true
  )
);

create or replace function public.admin_rename_societa(
  p_societa_id integer,
  p_nome_ufficiale text,
  p_nome_personalizzato text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  company public.societa%rowtype;
  old_name text;
  old_normalized text;
  new_name text;
  new_normalized text;
begin
  if p_nome_ufficiale is null or pg_catalog.btrim(p_nome_ufficiale) = '' then
    raise exception 'SOCIETA_NOME_UFFICIALE_OBBLIGATORIO' using errcode = '23514';
  end if;

  select * into company
  from public.societa
  where id = p_societa_id
  for update;

  if not found then
    raise exception 'SOCIETA_NON_TROVATA' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.societa.name_namespace', 0)
  );

  old_name := coalesce(company.nome_personalizzato, company.nome_ufficiale);
  old_normalized := public.normalize_societa_name(old_name);
  new_name := coalesce(
    nullif(pg_catalog.btrim(p_nome_personalizzato), ''),
    pg_catalog.btrim(p_nome_ufficiale)
  );
  new_normalized := public.normalize_societa_name(new_name);

  if exists (
    select 1 from public.societa other
    where other.nome_normalizzato = new_normalized
      and other.id <> p_societa_id
  ) then
    raise exception 'SOCIETA_NOME_AMBIGUO: il nuovo nome appartiene a un altra societa'
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.societa_alias alias
    where alias.alias_normalizzato = new_normalized
      and alias.societa_id <> p_societa_id
  ) then
    raise exception 'SOCIETA_NOME_AMBIGUO: il nuovo nome appartiene agli alias di un altra societa'
      using errcode = '23505';
  end if;

  if old_normalized <> new_normalized then
    if exists (
      select 1 from public.societa_alias alias
      where alias.alias_normalizzato = old_normalized
        and alias.societa_id <> p_societa_id
    ) then
      raise exception 'SOCIETA_ALIAS_AMBIGUO: il vecchio nome appartiene a un altra societa'
        using errcode = '23505';
    end if;

    insert into public.societa_alias (societa_id, alias, alias_normalizzato, fonte)
    values (p_societa_id, old_name, old_normalized, 'rinomina_amministrativa')
    on conflict (societa_id, alias_normalizzato) do nothing;
  end if;

  update public.societa
  set nome_ufficiale = pg_catalog.btrim(p_nome_ufficiale),
      nome_personalizzato = nullif(pg_catalog.btrim(p_nome_personalizzato), '')
  where id = p_societa_id;

  -- Il trigger calcola nome_normalizzato. ID e slug non sono inclusi nell'UPDATE.
end;
$$;

revoke all on function public.admin_rename_societa(integer, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_rename_societa(integer, text, text)
  to service_role;

commit;
