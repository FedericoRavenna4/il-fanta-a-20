begin;

create table public.user_emblems (
  id smallint primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  nome text not null,
  rarita text not null check (rarita in ('comune', 'raro', 'epico', 'leggendario')),
  categoria text not null check (categoria in ('fantabet', 'tifo', 'arcade', 'fedelta')),
  descrizione text not null,
  asset_path text not null check (asset_path ~ '^/emblemi-utenti/[a-z0-9-]+[.]png$'),
  nascosto boolean not null default false,
  ordine smallint not null unique check (ordine > 0),
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_emblem_unlocks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emblem_id smallint not null references public.user_emblems(id) on delete restrict,
  unlocked_at timestamptz not null,
  stagione_id smallint references public.stagioni(id) on delete set null,
  source_type text not null,
  source_ref text,
  created_at timestamptz not null default now(),
  primary key (profile_id, emblem_id),
  check (char_length(source_type) between 2 and 50)
);

create index user_emblem_unlocks_profile_time_idx
  on public.user_emblem_unlocks (profile_id, unlocked_at desc);

alter table public.user_emblems enable row level security;
alter table public.user_emblem_unlocks enable row level security;
revoke all on public.user_emblems, public.user_emblem_unlocks from public, anon, authenticated;
grant select, insert on public.user_emblems, public.user_emblem_unlocks to service_role;
grant select on public.user_emblem_unlocks to authenticated;

create policy user_emblem_unlocks_read_own
on public.user_emblem_unlocks for select to authenticated
using (profile_id = auth.uid());

insert into public.user_emblems
  (id, slug, nome, rarita, categoria, descrizione, asset_path, nascosto, ordine)
values
  (1, 'prima-bet', 'Prima Bet', 'comune', 'fantabet', 'Completa la tua prima schedina nel FantaBet.', '/emblemi-utenti/prima-bet.png', false, 1),
  (2, 'ci-hai-preso', 'Ci Hai Preso', 'comune', 'fantabet', 'Indovina correttamente il tuo primo pronostico.', '/emblemi-utenti/ci-hai-preso.png', false, 2),
  (3, 'scelgo-te', 'Scelto Te!', 'comune', 'tifo', 'Scegli la prima squadra che tiferai durante la stagione.', '/emblemi-utenti/scelgo-te.png', false, 3),
  (4, 'prima-gioia', 'Prima Gioia', 'comune', 'tifo', 'La squadra che tifi conquista la sua prima vittoria mentre la sostieni.', '/emblemi-utenti/prima-gioia.png', false, 4),
  (5, 'insert-coin', 'Insert Coin', 'comune', 'arcade', 'Gioca per la prima volta al gioco Arcade del Fanta a 20.', '/emblemi-utenti/insert-coin.png', false, 5),
  (6, 'salto-di-qualita', 'Salto di Qualità', 'comune', 'arcade', 'Ottieni la tua prima promozione nel gioco Arcade.', '/emblemi-utenti/salto-di-qualita.png', true, 6),
  (7, 'primo-anno', 'Primo Anno', 'comune', 'fedelta', 'Completa la tua prima stagione nel Fanta a 20.', '/emblemi-utenti/primo-anno.png', false, 7),
  (8, 'tipster-costante', 'Tipster Costante', 'raro', 'fantabet', 'Completa 5 schedine FantaBet consecutive senza saltare un turno.', '/emblemi-utenti/tipster-costante.png', false, 8),
  (9, 'top-tipster', 'Top Tipster', 'raro', 'fantabet', 'Entra tra i migliori 3 Tipster di una giornata FantaBet.', '/emblemi-utenti/top-tipster.png', false, 9),
  (10, 'sull-onda-dell-entusiasmo', 'Sull’Onda dell’Entusiasmo', 'raro', 'tifo', 'La squadra che tifi ottiene 5 risultati utili consecutivi.', '/emblemi-utenti/sull-onda-dell-entusiasmo.png', true, 10),
  (11, 'top-player', 'Top Player', 'raro', 'arcade', 'Raggiungi la Top 10 della classifica del gioco Arcade.', '/emblemi-utenti/top-player.png', false, 11),
  (12, 'secondo-anno', 'Secondo Anno', 'raro', 'fedelta', 'Completa la tua seconda stagione nel Fanta a 20.', '/emblemi-utenti/secondo-anno.png', false, 12),
  (13, 'schedina-perfetta', 'Schedina Perfetta', 'epico', 'fantabet', 'Indovina correttamente tutti i pronostici di una singola schedina FantaBet.', '/emblemi-utenti/schedina-perfetta.png', false, 13),
  (14, 'alzala-al-cielo', 'Alzala al Cielo', 'epico', 'tifo', 'La squadra che tifi conquista un trofeo ufficiale.', '/emblemi-utenti/alzala-al-cielo.png', false, 14),
  (15, 'ancora-insieme', 'Ancora Insieme', 'epico', 'tifo', 'Scegli di tifare la stessa squadra per 2 stagioni consecutive.', '/emblemi-utenti/ancora-insieme.png', false, 15),
  (16, 'ingiocabile', 'Ingiocabile', 'epico', 'arcade', 'Raggiungi il primo posto nella classifica del gioco Arcade.', '/emblemi-utenti/ingiocabile.png', false, 16),
  (17, 'veterano', 'Veterano', 'epico', 'fedelta', 'Completa 3 stagioni nel Fanta a 20.', '/emblemi-utenti/veterano.png', true, 17),
  (18, 're-dei-tipster', 'Re dei Tipster', 'leggendario', 'fantabet', 'Vinci la classifica stagionale del FantaBet.', '/emblemi-utenti/re-dei-tipster.png', false, 18),
  (19, 'fedelta-eterna', 'Fedeltà Eterna', 'leggendario', 'tifo', 'Tifa la stessa squadra per 5 stagioni consecutive.', '/emblemi-utenti/fedelta-eterna.png', true, 19),
  (20, 'colonna-del-fanta-a-20', 'Colonna del Fanta a 20', 'leggendario', 'fedelta', 'Completa 5 stagioni nel Fanta a 20, diventando una presenza storica del progetto.', '/emblemi-utenti/colonna-del-fanta-a-20.png', false, 20);

create function private.sync_user_emblems(p_profile_id uuid default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_count bigint := 0; v_rows bigint;
begin
  -- FantaBet: only authoritative submissions and fully evaluated prediction results.
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select submission.profile_id, emblem.id, min(submission.submitted_at), min(round.stagione_id), 'fantabet_submission', min(submission.round_id)::text
  from public.fantabet_round_submissions submission
  join public.fantabet_rounds round on round.id = submission.round_id
  join public.user_emblems emblem on emblem.slug = 'prima-bet'
  where p_profile_id is null or submission.profile_id = p_profile_id
  group by submission.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select result.profile_id, emblem.id, min(round.deadline_at), min(round.stagione_id), 'fantabet_prediction', min(result.bet_id)::text
  from private.fantabet_prediction_results result
  join private.fantabet_round_evaluation evaluation on evaluation.round_id = result.round_id and evaluation.fully_evaluable
  join public.fantabet_rounds round on round.id = result.round_id
  join public.fantabet_round_submissions submission on submission.profile_id = result.profile_id and submission.round_id = result.round_id
  join public.user_emblems emblem on emblem.slug = 'ci-hai-preso'
  where result.correct and (p_profile_id is null or result.profile_id = p_profile_id)
  group by result.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select result.profile_id, emblem.id, min(round.deadline_at), min(round.stagione_id), 'fantabet_perfect_round', min(result.round_id)::text
  from private.fantabet_prediction_results result
  join private.fantabet_round_evaluation evaluation on evaluation.round_id = result.round_id and evaluation.fully_evaluable
  join public.fantabet_rounds round on round.id = result.round_id
  join public.fantabet_round_submissions submission on submission.profile_id = result.profile_id and submission.round_id = result.round_id
  join public.user_emblems emblem on emblem.slug = 'schedina-perfetta'
  where p_profile_id is null or result.profile_id = p_profile_id
  group by result.profile_id, result.round_id, round.required_predictions, emblem.id
  having count(*) = round.required_predictions and bool_and(result.correct)
  on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, source_type, source_ref)
  select base.profile_id, emblem.id, clock_timestamp(), 'fantabet_consistency', 'derived-base-leaderboard'
  from private.fantabet_base_leaderboard() base
  join public.user_emblems emblem on emblem.slug = 'tipster-costante'
  where base.punti_bonus_costanza > 0 and (p_profile_id is null or base.profile_id = p_profile_id)
  on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  with round_slips as (
    select result.profile_id, result.round_id, round.stagione_id, round.deadline_at,
      round.required_predictions, round.perfect_multiplier,
      count(*)::bigint as prediction_count,
      count(*) filter (where result.correct)::bigint as correct_count,
      coalesce(sum(result.earned_points), 0)::bigint as base_points
    from private.fantabet_prediction_results result
    join private.fantabet_round_evaluation evaluation
      on evaluation.round_id = result.round_id and evaluation.fully_evaluable
    join public.fantabet_rounds round on round.id = result.round_id
    join public.fantabet_round_submissions submission
      on submission.profile_id = result.profile_id and submission.round_id = result.round_id
    group by result.profile_id, result.round_id, round.stagione_id, round.deadline_at,
      round.required_predictions, round.perfect_multiplier
    having count(*) = round.required_predictions
  ), scored as (
    select slip.*,
      (slip.correct_count = slip.required_predictions) as perfect,
      case when slip.correct_count = slip.required_predictions
        then slip.base_points * slip.perfect_multiplier else slip.base_points end::bigint as round_points
    from round_slips slip
  ), ranked as (
    select scored.*,
      row_number() over (
        partition by scored.round_id
        order by scored.round_points desc, scored.perfect desc, scored.correct_count desc,
          profile.username_normalizzato asc, scored.profile_id asc
      )::bigint as posizione
    from scored join public.profiles profile on profile.id = scored.profile_id
  )
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select ranked.profile_id, emblem.id, ranked.deadline_at, ranked.stagione_id,
    'fantabet_round_rank', ranked.round_id::text
  from ranked join public.user_emblems emblem on emblem.slug = 'top-tipster'
  where ranked.posizione <= 3 and (p_profile_id is null or ranked.profile_id = p_profile_id)
  on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  -- Tifo: persisted support, eligible match ledger and trophy ledger preserve anti-retroactivity.
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select support.profile_id, emblem.id, min(support.selected_at), min(support.stagione_id), 'profile_support', min(support.stagione_id)::text
  from public.profile_supports support join public.user_emblems emblem on emblem.slug = 'scelgo-te'
  where (p_profile_id is null or support.profile_id = p_profile_id)
    and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = support.profile_id and blocked.stagione_id = support.stagione_id)
  group by support.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select event.profile_id, emblem.id, min(event.recognized_at), min(event.stagione_id), 'support_match', min(event.partita_id)::text
  from public.fantabet_support_match_events event join public.user_emblems emblem on emblem.slug = 'prima-gioia'
  where event.outcome = 'vittoria' and (p_profile_id is null or event.profile_id = p_profile_id)
    and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = event.profile_id and blocked.stagione_id = event.stagione_id)
  group by event.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select event.profile_id, emblem.id, min(event.recognized_at), min(event.stagione_id), 'support_trophy', min(event.edizione_competizione_id)::text
  from public.fantabet_support_bonus_events event join public.user_emblems emblem on emblem.slug = 'alzala-al-cielo'
  where (p_profile_id is null or event.profile_id = p_profile_id)
    and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = event.profile_id and blocked.stagione_id = event.stagione_id)
  group by event.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  with ordered as (
    select event.*, game.giornata_lega, sum(case when event.outcome = 'sconfitta' then 1 else 0 end) over
      (partition by event.profile_id, event.stagione_id order by game.giornata_lega, event.partita_id) as loss_group
    from public.fantabet_support_match_events event join public.partite game on game.id = event.partita_id
    where (p_profile_id is null or event.profile_id = p_profile_id)
      and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = event.profile_id and blocked.stagione_id = event.stagione_id)
  ), useful_results as (
    select ordered.*,
      row_number() over (partition by profile_id, stagione_id, loss_group order by giornata_lega, partita_id) as streak_position
    from ordered where outcome <> 'sconfitta'
  ), achieved as (
    select profile_id, stagione_id, recognized_at as achieved_at, partita_id as source_id
    from useful_results where streak_position = 5
  )
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select achieved.profile_id, emblem.id, min(achieved.achieved_at), min(achieved.stagione_id), 'support_unbeaten_streak', min(achieved.source_id)::text
  from achieved join public.user_emblems emblem on emblem.slug = 'sull-onda-dell-entusiasmo'
  group by achieved.profile_id, emblem.id on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  with history as (
    select support.*, season.anno_inizio,
      lag(support.societa_id) over (partition by support.profile_id order by season.anno_inizio) as previous_team,
      lag(season.anno_inizio) over (partition by support.profile_id order by season.anno_inizio) as previous_year
    from public.profile_supports support join public.stagioni season on season.id = support.stagione_id
    where (p_profile_id is null or support.profile_id = p_profile_id)
      and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = support.profile_id and blocked.stagione_id = support.stagione_id)
  )
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select history.profile_id, emblem.id, history.selected_at, history.stagione_id, 'support_consecutive_seasons', history.stagione_id::text
  from history join public.user_emblems emblem on emblem.slug = 'ancora-insieme'
  where history.societa_id = history.previous_team and history.anno_inizio = history.previous_year + 1
  on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;

  with ordered as (
    select support.*, season.anno_inizio,
      season.anno_inizio - row_number() over (partition by support.profile_id, support.societa_id order by season.anno_inizio)::integer as island
    from public.profile_supports support join public.stagioni season on season.id = support.stagione_id
    where (p_profile_id is null or support.profile_id = p_profile_id)
      and not exists (select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id = support.profile_id and blocked.stagione_id = support.stagione_id)
  ), achieved as (
    select profile_id, societa_id, island, max(stagione_id) as stagione_id, max(selected_at) as achieved_at
    from ordered group by profile_id, societa_id, island having count(*) >= 5
  )
  insert into public.user_emblem_unlocks (profile_id, emblem_id, unlocked_at, stagione_id, source_type, source_ref)
  select achieved.profile_id, emblem.id, achieved.achieved_at, achieved.stagione_id, 'support_five_seasons', achieved.stagione_id::text
  from achieved join public.user_emblems emblem on emblem.slug = 'fedelta-eterna'
  on conflict do nothing;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  return v_count;
end;
$$;

revoke all on function private.sync_user_emblems(uuid) from public, anon, authenticated;
grant execute on function private.sync_user_emblems(uuid) to service_role;

create function private.trigger_sync_user_emblems()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.sync_user_emblems(new.profile_id); return new; end; $$;
revoke all on function private.trigger_sync_user_emblems() from public, anon, authenticated;

create trigger user_emblems_after_fantabet_submission after insert or update on public.fantabet_round_submissions
for each row execute function private.trigger_sync_user_emblems();
create trigger user_emblems_after_profile_support after insert on public.profile_supports
for each row execute function private.trigger_sync_user_emblems();
create trigger user_emblems_after_support_match after insert or update on public.fantabet_support_match_events
for each row execute function private.trigger_sync_user_emblems();
create trigger user_emblems_after_support_trophy after insert on public.fantabet_support_bonus_events
for each row execute function private.trigger_sync_user_emblems();

create function private.trigger_sync_user_emblems_after_match()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_profile_id uuid;
begin
  for v_profile_id in
    select distinct submission.profile_id
    from public.fantabet_bets bet
    join public.fantabet_round_submissions submission on submission.round_id = bet.round_id
    where bet.partita_id = new.id
  loop
    perform private.sync_user_emblems(v_profile_id);
  end loop;
  return new;
end; $$;
revoke all on function private.trigger_sync_user_emblems_after_match() from public, anon, authenticated;
create trigger user_emblems_after_match_evaluation
after update of stato, gol_casa, gol_trasferta, fantapunti_casa, fantapunti_trasferta on public.partite
for each row when (new.stato = 'calcolata') execute function private.trigger_sync_user_emblems_after_match();

create function public.public_profile_user_emblems(p_profile_id uuid)
returns table (id smallint, slug text, nome text, rarita text, categoria text, descrizione text, asset_path text, nascosto boolean, ordine smallint, unlocked boolean, unlocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select emblem.id, case when emblem.nascosto and unlock.profile_id is null then 'secret-' || emblem.id::text else emblem.slug end,
    case when emblem.nascosto and unlock.profile_id is null then '???' else emblem.nome end,
    emblem.rarita, emblem.categoria,
    case when emblem.nascosto and unlock.profile_id is null then 'Continua a giocare per scoprirlo.' else emblem.descrizione end,
    case when emblem.nascosto and unlock.profile_id is null then null else emblem.asset_path end,
    emblem.nascosto, emblem.ordine, unlock.profile_id is not null, unlock.unlocked_at
  from public.user_emblems emblem
  left join public.user_emblem_unlocks unlock on unlock.emblem_id = emblem.id and unlock.profile_id = p_profile_id
  where emblem.attivo order by emblem.ordine;
$$;
revoke all on function public.public_profile_user_emblems(uuid) from public;
grant execute on function public.public_profile_user_emblems(uuid) to anon, authenticated, service_role;

select private.sync_user_emblems(null);

commit;
