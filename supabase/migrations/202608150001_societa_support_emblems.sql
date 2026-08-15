begin;

-- Upgrade from the deployed Tifo/Idolo infrastructure. Tables, rows, primary
-- keys, foreign keys, indexes, RLS and holder history are intentionally kept.
alter table public.societa_emblem_unlocks
  drop constraint societa_emblem_unlocks_emblem_key_check;

alter table public.societa_emblem_unlocks
  add constraint societa_emblem_unlocks_emblem_key_check check (emblem_key in (
    'primo_tifoso', 'la_curva_cresce', 'un_popolo', 'sold_out',
    'prima_inviolata', 'prima_goleada', 'primi_passi', 'primo_punto',
    'manita', 'schiacciasassi', 'bestia_nera'
  ));

create or replace function private.sync_societa_support_emblems()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stagione_id bigint;
  v_max_tifosi bigint;
  v_leader_count integer;
  v_leader_id bigint;
  v_holder_id bigint;
  v_holder_tifosi bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('societa-support-emblems-idolo', 0));
  select id into v_stagione_id from public.stagioni where attiva = true;
  if v_stagione_id is null then return; end if;

  -- Competitive permanent achievements whose catalog condition is completely
  -- derivable from authoritative calculated matches. No standings, market or
  -- disciplinary assumptions are introduced here.
  with performances as (
    select game.id as partita_id, edition.stagione_id, game.edizione_competizione_id,
      game.giornata_lega, game.societa_casa_id as societa_id,
      game.societa_trasferta_id as opponent_id, game.gol_casa as goals_for,
      game.gol_trasferta as goals_against
    from public.partite game join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
    where game.stato = 'calcolata' and game.gol_casa is not null and game.gol_trasferta is not null
    union all
    select game.id, edition.stagione_id, game.edizione_competizione_id,
      game.giornata_lega, game.societa_trasferta_id, game.societa_casa_id,
      game.gol_trasferta, game.gol_casa
    from public.partite game join public.edizioni_competizioni edition on edition.id = game.edizione_competizione_id
    where game.stato = 'calcolata' and game.gol_casa is not null and game.gol_trasferta is not null
  ), achievements as (
    select societa_id, stagione_id, partita_id, 'primi_passi'::text as emblem_key from performances where goals_for > goals_against
    union all select societa_id, stagione_id, partita_id, 'primo_punto' from performances where goals_for = goals_against
    union all select societa_id, stagione_id, partita_id, 'prima_inviolata' from performances where goals_against = 0
    union all select societa_id, stagione_id, partita_id, 'prima_goleada' from performances where goals_for >= 4
    union all select societa_id, stagione_id, partita_id, 'manita' from performances where goals_for >= 5
    union all select societa_id, stagione_id, partita_id, 'schiacciasassi' from performances where goals_for - goals_against >= 4
    union all
    select performance.societa_id, min(performance.stagione_id), min(performance.partita_id), 'bestia_nera'
    from performances performance
    join public.edizioni_competizioni edition on edition.id = performance.edizione_competizione_id
    join public.competizioni competition on competition.id = edition.competizione_id and competition.tipo = 'campionato'
    where performance.goals_for > performance.goals_against
    group by performance.societa_id, performance.edizione_competizione_id, performance.opponent_id
    having count(*) >= 2
  )
  insert into public.societa_emblem_unlocks (societa_id, emblem_key, stagione_id)
  select achievement.societa_id, achievement.emblem_key, min(achievement.stagione_id)
  from achievements achievement group by achievement.societa_id, achievement.emblem_key
  on conflict (societa_id, emblem_key) do nothing;

  -- Historical eligibility mirrors active_supporter_counts(): a support can
  -- only be inserted while the profile is external, and officialization
  -- permanently records the affected season in profile_support_ineligibilities.
  -- The historical query must not use the profile's current societa_id because
  -- becoming external again cannot reactivate a support from an ineligible season.
  with ranked_supports as (
    select support.societa_id, support.stagione_id, support.selected_at,
      row_number() over (partition by support.societa_id, support.stagione_id order by support.selected_at, support.profile_id)::bigint as supporter_number
    from public.profile_supports support
    where not exists (
      select 1 from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id and ineligibility.stagione_id = support.stagione_id
    )
  ), thresholds(emblem_key, minimum) as (
    values ('primo_tifoso'::text, 1::bigint), ('la_curva_cresce', 10), ('un_popolo', 100), ('sold_out', 500)
  )
  insert into public.societa_emblem_unlocks (societa_id, emblem_key, unlocked_at, stagione_id)
  select support.societa_id, thresholds.emblem_key, support.selected_at, support.stagione_id
  from ranked_supports support join thresholds on thresholds.minimum = support.supporter_number
  on conflict (societa_id, emblem_key) do nothing;

  select max(tifosi) into v_max_tifosi from public.active_supporter_counts();
  if coalesce(v_max_tifosi, 0) = 0 then return; end if;
  select count(*), min(societa_id) into v_leader_count, v_leader_id
  from public.active_supporter_counts() where tifosi = v_max_tifosi;
  select history.societa_id into v_holder_id
  from public.societa_emblem_holder_history history
  where history.emblem_key = 'idolo' and history.held_until is null;

  if v_holder_id is not null then
    select coalesce(counts.tifosi, 0) into v_holder_tifosi
    from (select v_holder_id as societa_id) holder
    left join public.active_supporter_counts() counts using (societa_id);
    if v_holder_tifosi = v_max_tifosi then return; end if;
    if v_leader_count = 1 and v_max_tifosi > v_holder_tifosi then
      update public.societa_emblem_holder_history set held_until = clock_timestamp()
      where emblem_key = 'idolo' and held_until is null;
      insert into public.societa_emblem_holder_history (emblem_key, societa_id, stagione_id)
      values ('idolo', v_leader_id, v_stagione_id);
    end if;
  elsif v_leader_count = 1 then
    insert into public.societa_emblem_holder_history (emblem_key, societa_id, stagione_id)
    values ('idolo', v_leader_id, v_stagione_id);
  end if;
end;
$$;

revoke all on function private.sync_societa_support_emblems() from public, anon, authenticated;
grant execute on function private.sync_societa_support_emblems() to service_role;

create trigger societa_emblems_after_match_evaluation
after insert or update of stato, gol_casa, gol_trasferta on public.partite
for each statement execute function private.trigger_sync_societa_support_emblems();

-- Safe, idempotent backfill when this migration is eventually applied.
select private.sync_societa_support_emblems();

commit;
