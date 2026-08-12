-- RESET DISTRUTTIVO UNLOCK TESTESTERNO - SOLO TEST / DEV.
-- NON eseguire per resettare soltanto il popup: il popup usa localStorage.
-- Cancella UN SOLO unlock reale per la coppia username + slug configurata sotto.
begin;

create temporary table reset_testesterno_one_emblem on commit drop as
with params as (
  select
    public.normalize_account_username('testesterno') as username_normalizzato,
    'prima-bet'::text as emblem_slug
)
select profile.id as profile_id, emblem.id as emblem_id, profile.username, emblem.slug
from params
join public.profiles profile on profile.username_normalizzato = params.username_normalizzato
join public.user_emblems emblem on emblem.slug = params.emblem_slug;

do $$
declare v_target_count integer;
begin
  select count(*) into v_target_count from reset_testesterno_one_emblem;
  if v_target_count <> 1 then
    raise exception 'TEST RESET ABORTED: expected exactly one profile/emblem target, found %', v_target_count;
  end if;
end;
$$;

delete from public.user_emblem_unlocks unlock
using reset_testesterno_one_emblem target
where unlock.profile_id = target.profile_id
  and unlock.emblem_id = target.emblem_id;

commit;
