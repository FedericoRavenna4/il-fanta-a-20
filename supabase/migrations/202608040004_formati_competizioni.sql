begin;

update public.edizioni_competizioni ec
set formato = case c.tipo
  when 'campionato' then 'campionato'
  when 'coppa_nazionale' then 'gironi_eliminazione_diretta'
  when 'coppa_europea' then 'gironi_eliminazione_diretta'
  when 'playoff_promozione' then 'formula_1'
end
from public.competizioni c
where c.id = ec.competizione_id
  and c.tipo in (
    'campionato',
    'coppa_nazionale',
    'coppa_europea',
    'playoff_promozione'
  );

do $$
begin
  if exists (
    select 1
    from public.edizioni_competizioni ec
    left join public.competizioni c on c.id = ec.competizione_id
    where c.id is null
       or c.tipo not in (
         'campionato',
         'coppa_nazionale',
         'coppa_europea',
         'playoff_promozione'
       )
  ) then
    raise exception 'Anomalia formati: esistono edizioni senza una competizione riconosciuta';
  end if;

  if exists (
    select 1
    from public.edizioni_competizioni
    where formato is null
  ) then
    raise exception 'Anomalia formati: almeno una edizione ha formato NULL';
  end if;

  if exists (
    select 1
    from public.edizioni_competizioni
    where formato not in (
      'campionato',
      'gironi_eliminazione_diretta',
      'formula_1'
    )
  ) then
    raise exception 'Anomalia formati: almeno una edizione ha un formato non ammesso';
  end if;
end;
$$;

alter table public.edizioni_competizioni
  drop constraint if exists edizioni_competizioni_formato_ammesso;

alter table public.edizioni_competizioni
  add constraint edizioni_competizioni_formato_ammesso
  check (
    formato is not null
    and formato in (
      'campionato',
      'gironi_eliminazione_diretta',
      'formula_1'
    )
  );

alter table public.edizioni_competizioni
  drop column if exists numero_giornate;

commit;
