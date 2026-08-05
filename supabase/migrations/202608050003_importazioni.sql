-- Incremental schema only. This migration is not executed by local import tools.

begin;

create table public.importazioni (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  stagione_id smallint null references public.stagioni(id),
  edizione_competizione_id bigint null references public.edizioni_competizioni(id),
  nome_file text not null,
  file_hash text null,
  dimensione_file bigint null,
  stato text not null default 'anteprima',
  sorgente text not null default 'leghe_fantacalcio',
  importato_da uuid null references auth.users(id),
  iniziata_il timestamptz not null default now(),
  completata_il timestamptz null,
  righe_totali integer not null default 0,
  righe_valide integer not null default 0,
  righe_inserite integer not null default 0,
  righe_aggiornate integer not null default 0,
  righe_invariate integer not null default 0,
  righe_scartate integer not null default 0,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  riepilogo jsonb not null default '{}'::jsonb,
  errori jsonb not null default '[]'::jsonb,
  warning jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint importazioni_tipo_ammesso
    check (tipo in ('calendario_campionato', 'calendario_coppa', 'rose', 'mercato', 'altro')),
  constraint importazioni_stato_ammesso
    check (stato in ('anteprima', 'validata', 'pubblicata', 'pubblicata_con_warning', 'errore', 'annullata')),
  constraint importazioni_sorgente_ammessa
    check (sorgente in ('leghe_fantacalcio', 'manuale', 'altro')),
  constraint importazioni_dimensione_file_non_negativa
    check (dimensione_file is null or dimensione_file >= 0),
  constraint importazioni_conteggi_non_negativi
    check (
      righe_totali >= 0
      and righe_valide >= 0
      and righe_inserite >= 0
      and righe_aggiornate >= 0
      and righe_invariate >= 0
      and righe_scartate >= 0
      and warning_count >= 0
      and error_count >= 0
    ),
  constraint importazioni_intervallo_temporale_valido
    check (completata_il is null or completata_il >= iniziata_il),
  constraint importazioni_calendario_richiede_edizione
    check (
      tipo not in ('calendario_campionato', 'calendario_coppa')
      or edizione_competizione_id is not null
    ),
  constraint importazioni_pubblicazione_completata
    check (
      stato not in ('pubblicata', 'pubblicata_con_warning')
      or completata_il is not null
    ),
  constraint importazioni_errore_con_dettagli
    check (stato <> 'errore' or error_count > 0),
  constraint importazioni_pubblicazione_con_warning_coerente
    check (stato <> 'pubblicata_con_warning' or warning_count > 0)
);

create index importazioni_file_hash_idx
  on public.importazioni (file_hash)
  where file_hash is not null;

create index importazioni_ricerca_idx
  on public.importazioni (
    stagione_id,
    edizione_competizione_id,
    tipo,
    stato,
    created_at desc
  );

create or replace function public.set_importazioni_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger importazioni_set_updated_at
before update on public.importazioni
for each row execute function public.set_importazioni_updated_at();

alter table public.importazioni enable row level security;

revoke all on public.importazioni from public, anon, authenticated;

alter table public.partite
  add constraint partite_import_batch_id_fkey
  foreign key (import_batch_id)
  references public.importazioni(id)
  on delete set null;

create index partite_import_batch_id_idx
  on public.partite (import_batch_id)
  where import_batch_id is not null;

alter table public.riposi_competizione
  add column import_batch_id uuid null;

alter table public.riposi_competizione
  add constraint riposi_competizione_import_batch_id_fkey
  foreign key (import_batch_id)
  references public.importazioni(id)
  on delete set null;

create index riposi_competizione_import_batch_id_idx
  on public.riposi_competizione (import_batch_id)
  where import_batch_id is not null;

commit;
