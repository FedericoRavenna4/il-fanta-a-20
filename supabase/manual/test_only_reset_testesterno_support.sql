-- TEST ONLY. Run manually in the Supabase SQL editor as the database owner.
-- Never expose this operation through an RPC or client action.
begin;

create temporary table reset_testesterno_support on commit drop as
select support.profile_id, support.stagione_id
from public.profile_supports support
join public.profiles profile on profile.id = support.profile_id
join public.stagioni season on season.id = support.stagione_id
where profile.username_normalizzato = public.normalize_account_username('testesterno')
  and season.attiva = true;

do $$
declare v_target_count integer;
begin
  select count(*) into v_target_count from reset_testesterno_support;
  if v_target_count > 1 then
    raise exception 'TEST RESET ABORTED: expected at most one active support, found %', v_target_count;
  elsif v_target_count = 0 then
    raise notice 'TEST RESET: no active support found for testesterno; no rows will be changed.';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.fantabet_support_match_events') is not null then
    execute 'delete from public.fantabet_support_match_events event
      using reset_testesterno_support target
      where event.profile_id = target.profile_id
        and event.stagione_id = target.stagione_id';
  end if;
end;
$$;

delete from public.fantabet_support_bonus_events event
using reset_testesterno_support target
where event.profile_id = target.profile_id
  and event.stagione_id = target.stagione_id;

delete from public.profile_support_ineligibilities ineligibility
using reset_testesterno_support target
where ineligibility.profile_id = target.profile_id
  and ineligibility.stagione_id = target.stagione_id;

-- Disable only the exact immutable trigger and only inside this transaction.
-- Any error rolls the transaction back, including this trigger state change.
alter table public.profile_supports disable trigger profile_supports_immutable;

delete from public.profile_supports support
using reset_testesterno_support target
where support.profile_id = target.profile_id
  and support.stagione_id = target.stagione_id;

alter table public.profile_supports enable trigger profile_supports_immutable;
commit;
