begin;

alter table public.societa_emblem_unlocks drop constraint societa_emblem_unlocks_emblem_key_check;
alter table public.societa_emblem_unlocks add constraint societa_emblem_unlocks_emblem_key_check check (emblem_key in (
  'primo_tifoso', 'la_curva_cresce', 'un_popolo', 'sold_out',
  'prima_inviolata', 'prima_goleada', 'primi_passi', 'primo_punto',
  'manita', 'schiacciasassi', 'bestia_nera', 'primo_scambio'
));

create table public.societa_emblem_notifications (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  societa_id bigint not null,
  emblem_key text not null,
  audience text not null check (audience in ('official', 'supporter')),
  created_at timestamptz not null default clock_timestamp(),
  seen_at timestamptz null,
  constraint societa_emblem_notifications_unlock_fkey foreign key (societa_id, emblem_key)
    references public.societa_emblem_unlocks(societa_id, emblem_key) on delete cascade,
  constraint societa_emblem_notifications_once unique (profile_id, societa_id, emblem_key)
);
create index societa_emblem_notifications_pending_idx on public.societa_emblem_notifications(profile_id, id) where seen_at is null;
alter table public.societa_emblem_notifications enable row level security;
revoke all on public.societa_emblem_notifications from public, anon, authenticated;
grant select, insert, update, delete on public.societa_emblem_notifications to service_role;

create function private.enqueue_societa_emblem_notifications(p_societa_id bigint, p_emblem_key text, p_stagione_id bigint, p_unlocked_at timestamptz)
returns void language sql security definer set search_path = '' as $$
  insert into public.societa_emblem_notifications (profile_id, societa_id, emblem_key, audience, created_at)
  select support.profile_id, p_societa_id, p_emblem_key, 'supporter', p_unlocked_at
  from public.profile_supports support
  where support.stagione_id = p_stagione_id and support.societa_id = p_societa_id
    and support.selected_at <= p_unlocked_at
    and not exists (select 1 from public.profile_support_ineligibilities ineligibility
      where ineligibility.profile_id = support.profile_id and ineligibility.stagione_id = support.stagione_id
        and ineligibility.officialized_at <= p_unlocked_at)
  on conflict (profile_id, societa_id, emblem_key) do nothing;

  insert into public.societa_emblem_notifications (profile_id, societa_id, emblem_key, audience, created_at)
  select profile.id, p_societa_id, p_emblem_key, 'official', p_unlocked_at
  from public.profiles profile where profile.societa_id = p_societa_id
  on conflict (profile_id, societa_id, emblem_key) do update set audience = 'official';
$$;
revoke all on function private.enqueue_societa_emblem_notifications(bigint, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function private.enqueue_societa_emblem_notifications(bigint, text, bigint, timestamptz) to service_role;

create function private.trigger_enqueue_societa_emblem_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_societa_emblem_notifications(new.societa_id, new.emblem_key, new.stagione_id, new.unlocked_at);
  return new;
end;
$$;
revoke all on function private.trigger_enqueue_societa_emblem_notifications() from public, anon, authenticated;
create trigger societa_emblem_unlock_notifications after insert on public.societa_emblem_unlocks
for each row execute function private.trigger_enqueue_societa_emblem_notifications();

create function public.my_pending_societa_emblem_notifications()
returns table (notification_id bigint, societa_id bigint, emblem_key text, audience text, unlocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select notification.id, notification.societa_id, notification.emblem_key, notification.audience, unlock.unlocked_at
  from public.societa_emblem_notifications notification
  join public.societa_emblem_unlocks unlock on unlock.societa_id = notification.societa_id and unlock.emblem_key = notification.emblem_key
  where notification.profile_id = (select auth.uid()) and notification.seen_at is null
  order by notification.id;
$$;
revoke all on function public.my_pending_societa_emblem_notifications() from public, anon, authenticated;
grant execute on function public.my_pending_societa_emblem_notifications() to authenticated, service_role;

create function public.mark_my_societa_emblem_notification_seen(p_notification_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.societa_emblem_notifications set seen_at = coalesce(seen_at, clock_timestamp())
  where id = p_notification_id and profile_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.mark_my_societa_emblem_notification_seen(bigint) from public, anon, authenticated;
grant execute on function public.mark_my_societa_emblem_notification_seen(bigint) to authenticated, service_role;

-- The notification system starts now: do not replay historical permanent
-- achievements. Primo Scambio is the sole exception because its two manual
-- unlocks were inserted immediately before this trigger existed.
select private.enqueue_societa_emblem_notifications(unlock.societa_id, unlock.emblem_key, unlock.stagione_id, unlock.unlocked_at)
from public.societa_emblem_unlocks unlock
where unlock.emblem_key = 'primo_scambio';

commit;
