-- Read-only catalog privileges for the server-side import pipeline.
-- GRANT is idempotent: applying this migration again does not accumulate privileges.

begin;

grant usage on schema public to service_role;

grant select
  on table
    public.stagioni,
    public.competizioni,
    public.edizioni_competizioni,
    public.societa,
    public.societa_alias
  to service_role;

commit;
