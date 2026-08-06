-- Privileges for the backend import pipeline only.
-- SUPABASE_SERVICE_ROLE_KEY and the service_role client must remain server-only.

begin;

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.importazioni
  to service_role;

grant select, insert, update
  on table public.partite
  to service_role;

grant select, insert, update
  on table public.riposi_competizione
  to service_role;

grant usage, select
  on sequence public.partite_id_seq
  to service_role;

grant usage, select
  on sequence public.riposi_competizione_id_seq
  to service_role;

commit;
