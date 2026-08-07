-- Account avatars: public reads, authenticated writes restricted to auth.uid()/avatar.ext.
-- Apply only after 202608070001_account_profiles.sql.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'account-avatars',
  'account-avatars',
  true,
  768000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy account_avatars_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'account-avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ ('^' || (select auth.uid()::text) || '/avatar[.](jpg|png|webp)$')
);

create policy account_avatars_select_own
on storage.objects for select
to authenticated
using (
  bucket_id = 'account-avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy account_avatars_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'account-avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'account-avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ ('^' || (select auth.uid()::text) || '/avatar[.](jpg|png|webp)$')
);

create policy account_avatars_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'account-avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create or replace function public.set_my_avatar_path(p_avatar_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_avatar_path !~ ('^' || account_id::text || '/avatar[.](jpg|png|webp)$') then
    raise exception 'AVATAR_PATH_NON_VALIDO' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'account-avatars'
      and object.name = p_avatar_path
      and object.owner_id = account_id::text
  ) then
    raise exception 'AVATAR_NON_TROVATO' using errcode = '22023';
  end if;

  update public.profiles
  set avatar_url = p_avatar_path
  where id = account_id;

  if not found then
    raise exception 'PROFILO_NON_TROVATO' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_my_avatar_path(text) from public, anon;
grant execute on function public.set_my_avatar_path(text) to authenticated;

commit;
