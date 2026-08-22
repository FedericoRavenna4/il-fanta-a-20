begin;

create table private.societa_idolo_leader_state(
  stagione_id bigint not null references public.stagioni(id) on delete cascade,
  societa_id bigint not null references public.societa(id) on delete cascade,
  supporter_count bigint not null check(supporter_count>=0),
  is_at_max boolean not null,
  reached_max_at timestamptz null,
  primary key(stagione_id,societa_id)
);
revoke all on table private.societa_idolo_leader_state from public,anon,authenticated;

-- One-time seed: preserve the previously approved historical tie-break. Only
-- supports belonging to active_supporter_counts() contribute to reached_max_at.
with active_season as (
  select id from public.stagioni where attiva=true order by id desc limit 1
), current_counts as (
  select counts.societa_id,counts.tifosi from public.active_supporter_counts() counts
), maximum as (
  select max(tifosi) tifosi from current_counts
), historical_reach as (
  select support.societa_id,max(support.selected_at) reached_at
  from public.profile_supports support
  join public.profiles profile on profile.id=support.profile_id and profile.societa_id is null
  join public.stagioni season on season.id=support.stagione_id and season.attiva=true
  where not exists(select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id=support.profile_id and blocked.stagione_id=support.stagione_id)
  group by support.societa_id
)
insert into private.societa_idolo_leader_state(stagione_id,societa_id,supporter_count,is_at_max,reached_max_at)
select season.id,counts.societa_id,counts.tifosi,counts.tifosi=maximum.tifosi,
  case when counts.tifosi=maximum.tifosi then historical.reached_at else null end
from active_season season cross join current_counts counts cross join maximum
left join historical_reach historical on historical.societa_id=counts.societa_id;

create or replace function private.sync_societa_idolo_holder()
returns void language plpgsql security definer set search_path='' as $$
declare
  v_season bigint;v_max bigint;v_current_team bigint;v_current_season bigint;v_current_value numeric;v_team bigint;v_has_state boolean;v_now timestamptz:=clock_timestamp();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('societa-support-emblems-idolo',0));
  select id into v_season from public.stagioni where attiva=true order by id desc limit 1;
  if v_season is null then return;end if;
  select exists(select 1 from private.societa_idolo_leader_state where stagione_id=v_season) into v_has_state;
  select max(tifosi) into v_max from public.active_supporter_counts();
  -- Persist when each society enters/re-enters the current maximum. Eligibility
  -- changes are therefore observed now, independently from old selected_at.
  with current_counts as (
    select counts.societa_id,counts.tifosi from public.active_supporter_counts() counts
  ), historical_reach as (
    select support.societa_id,max(support.selected_at) reached_at
    from public.profile_supports support
    join public.profiles profile on profile.id=support.profile_id and profile.societa_id is null
    where support.stagione_id=v_season
      and not exists(select 1 from public.profile_support_ineligibilities blocked where blocked.profile_id=support.profile_id and blocked.stagione_id=v_season)
    group by support.societa_id
  )
  insert into private.societa_idolo_leader_state as state(stagione_id,societa_id,supporter_count,is_at_max,reached_max_at)
  select v_season,current.societa_id,current.tifosi,current.tifosi=v_max,
    case when current.tifosi<>v_max then null
      when not v_has_state then historical.reached_at
      else v_now end
  from current_counts current
  left join historical_reach historical on historical.societa_id=current.societa_id
  on conflict(stagione_id,societa_id) do update set
    reached_max_at=case
      when excluded.is_at_max and (not state.is_at_max or state.supporter_count is distinct from excluded.supporter_count) then v_now
      else state.reached_max_at end,
    supporter_count=excluded.supporter_count,
    is_at_max=excluded.is_at_max;
  update private.societa_idolo_leader_state state set supporter_count=0,is_at_max=false
  where state.stagione_id=v_season and not exists(select 1 from public.active_supporter_counts() counts where counts.societa_id=state.societa_id);
  -- Preserve the previous no-leader behaviour: do not invent or close a holder.
  if coalesce(v_max,0)=0 then return;end if;
  select societa_id,stagione_id,record_value into v_current_team,v_current_season,v_current_value
  from public.societa_emblem_holder_history where emblem_key='idolo' and held_until is null;

  -- Approved tie rule: the incumbent stays only while it is still a co-leader.
  if v_current_team is not null and exists(select 1 from public.active_supporter_counts() where societa_id=v_current_team and tifosi=v_max) then
    if v_current_season is distinct from v_season then
      update public.societa_emblem_holder_history set held_until=v_now
      where emblem_key='idolo' and held_until is null;
      insert into public.societa_emblem_holder_history(emblem_key,societa_id,stagione_id,record_value)
      values('idolo',v_current_team,v_season,v_max);
      return;
    end if;
    update public.societa_emblem_holder_history set record_value=v_max
    where emblem_key='idolo' and held_until is null and record_value is distinct from v_max;
    return;
  end if;

  select counts.societa_id into v_team
  from public.active_supporter_counts() counts
  join private.societa_idolo_leader_state state on state.stagione_id=v_season and state.societa_id=counts.societa_id
  where counts.tifosi=v_max
  order by state.reached_max_at desc nulls last,counts.societa_id asc
  limit 1;
  if v_team is null then return;end if;
  if v_current_team=v_team then
    update public.societa_emblem_holder_history set record_value=v_max
    where emblem_key='idolo' and held_until is null and record_value is distinct from v_max;
    return;
  end if;
  update public.societa_emblem_holder_history set held_until=clock_timestamp()
  where emblem_key='idolo' and held_until is null;
  insert into public.societa_emblem_holder_history(emblem_key,societa_id,stagione_id,record_value)
  values('idolo',v_team,v_season,v_max);
end $$;

create or replace function private.trigger_sync_societa_idolo_holder()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.sync_societa_idolo_holder();return null;end $$;

drop trigger if exists idolo_after_profile_support_change on public.profile_supports;
create trigger idolo_after_profile_support_change after insert or update or delete on public.profile_supports
for each statement execute function private.trigger_sync_societa_idolo_holder();
drop trigger if exists idolo_after_support_eligibility_change on public.profile_support_ineligibilities;
create trigger idolo_after_support_eligibility_change after insert or update or delete on public.profile_support_ineligibilities
for each statement execute function private.trigger_sync_societa_idolo_holder();
drop trigger if exists idolo_after_profile_officialization on public.profiles;
create trigger idolo_after_profile_officialization after update of societa_id on public.profiles
for each statement execute function private.trigger_sync_societa_idolo_holder();
drop trigger if exists idolo_after_active_season_change on public.stagioni;
create trigger idolo_after_active_season_change after insert or delete or update of attiva on public.stagioni
for each statement execute function private.trigger_sync_societa_idolo_holder();

revoke all on function private.sync_societa_idolo_holder() from public,anon,authenticated;
revoke all on function private.trigger_sync_societa_idolo_holder() from public,anon,authenticated;
grant execute on function private.sync_societa_idolo_holder() to service_role;
grant execute on function private.trigger_sync_societa_idolo_holder() to service_role;

select private.sync_societa_idolo_holder();
commit;
