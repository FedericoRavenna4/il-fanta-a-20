begin;

alter table public.competizioni
  drop constraint if exists competizioni_tipo_ammesso;

alter table public.competizioni
  add constraint competizioni_tipo_ammesso
  check (
    tipo in (
      'campionato',
      'coppa_nazionale',
      'coppa_europea',
      'playoff_promozione'
    )
  );

insert into public.competizioni (
  codice,
  nome,
  tipo,
  divisione_riferimento,
  livello,
  attiva
) values (
  'scatto-promozione',
  'Scatto Promozione',
  'playoff_promozione',
  'Serie C',
  3,
  true
)
on conflict (codice) do nothing;

insert into public.edizioni_competizioni (
  competizione_id,
  stagione_id,
  nome_edizione,
  formato,
  numero_squadre,
  numero_giornate,
  stato,
  data_inizio,
  data_fine,
  attiva
)
select
  c.id,
  s.id,
  'Scatto Promozione 2026/27',
  'Formula 1',
  15,
  9,
  'programmata',
  null,
  null,
  true
from public.competizioni c
join public.stagioni s on s.codice = '2026/27'
where c.codice = 'scatto-promozione'
on conflict (competizione_id, stagione_id) do nothing;

commit;
