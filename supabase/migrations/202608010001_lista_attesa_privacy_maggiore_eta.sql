begin;

alter table public.lista_attesa
  alter column data_nascita drop not null;

alter table public.lista_attesa
  add column if not exists maggiorenne_dichiarato boolean not null default false;

comment on column public.lista_attesa.maggiorenne_dichiarato is
  'Dichiarazione resa dal candidato di avere almeno 18 anni.';

commit;
