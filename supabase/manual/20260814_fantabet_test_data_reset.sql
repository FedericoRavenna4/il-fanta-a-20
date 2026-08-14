-- MANUAL ONE-TIME OPERATION. Review and run in the Supabase SQL Editor.
-- This is intentionally not a migration and does not touch emblems, profiles,
-- supports, societies, matches, competitions, Arcade, or import history.

-- Diagnostic snapshot: run and review before the transaction below.
select 'fantabet_rounds' as relation, count(*) as rows from public.fantabet_rounds
union all select 'fantabet_bets', count(*) from public.fantabet_bets
union all select 'fantabet_predictions', count(*) from public.fantabet_predictions
union all select 'fantabet_round_submissions', count(*) from public.fantabet_round_submissions
union all select 'fantabet_support_match_events (preserved)', count(*) from public.fantabet_support_match_events
union all select 'fantabet_support_bonus_events (preserved)', count(*) from public.fantabet_support_bonus_events
union all select 'fantabet_support_bonus_rules (preserved)', count(*) from public.fantabet_support_bonus_rules
union all select 'profile_supports (preserved)', count(*) from public.profile_supports
union all select 'user_emblem_unlocks (preserved)', count(*) from public.user_emblem_unlocks
order by relation;

select count(*) as partita_links_to_remove,
       count(distinct partita_id) as linked_matches,
       count(distinct round_id) as linked_rounds
from public.fantabet_bets;

select emblem.slug, emblem.nome, count(unlock.*) as unlocks_preserved
from public.user_emblem_unlocks unlock
join public.user_emblems emblem on emblem.id = unlock.emblem_id
where emblem.categoria = 'fantabet'
group by emblem.id, emblem.slug, emblem.nome
order by emblem.id;

begin;

-- Published bets are normally immutable. The trigger is disabled only inside
-- this reviewed one-time transaction and is restored before COMMIT.
alter table public.fantabet_bets disable trigger fantabet_bets_protect_published;

delete from public.fantabet_round_submissions;
delete from public.fantabet_predictions;
delete from public.fantabet_bets;
delete from public.fantabet_rounds;

alter table public.fantabet_bets enable trigger fantabet_bets_protect_published;

do $$
begin
  if exists (select 1 from public.fantabet_rounds)
    or exists (select 1 from public.fantabet_bets)
    or exists (select 1 from public.fantabet_predictions)
    or exists (select 1 from public.fantabet_round_submissions) then
    raise exception 'FANTABET_TEST_RESET_INCOMPLETO';
  end if;
end;
$$;

commit;

-- Post-check: all four values must be zero.
select 'fantabet_rounds' as relation, count(*) as rows from public.fantabet_rounds
union all select 'fantabet_bets', count(*) from public.fantabet_bets
union all select 'fantabet_predictions', count(*) from public.fantabet_predictions
union all select 'fantabet_round_submissions', count(*) from public.fantabet_round_submissions
order by relation;
