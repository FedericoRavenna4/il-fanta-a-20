-- The calendar synchronizer is server-only and already authenticates the admin.
-- Do not grant this capability to anon or authenticated.

begin;

grant usage on schema public to service_role;
grant delete on table public.partite to service_role;

revoke delete on table public.partite from anon, authenticated;

commit;
