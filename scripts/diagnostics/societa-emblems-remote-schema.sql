-- Diagnostica read-only dell'infrastruttura Emblemi Società.
-- Non crea, modifica o cancella oggetti e dati.

select
  pg_catalog.to_regclass('public.societa_emblem_unlocks') as unlocks_table,
  pg_catalog.to_regclass('public.societa_emblem_holder_history') as holder_history_table,
  pg_catalog.to_regprocedure('private.sync_societa_support_emblems()') as sync_function,
  pg_catalog.to_regprocedure('private.trigger_sync_societa_support_emblems()') as trigger_function,
  pg_catalog.to_regprocedure('public.public_societa_support_emblems(bigint)') as public_function;

select
  columns.table_schema,
  columns.table_name,
  columns.ordinal_position,
  columns.column_name,
  columns.data_type,
  columns.udt_schema,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default,
  columns.identity_generation
from information_schema.columns
where columns.table_schema = 'public'
  and columns.table_name in ('societa_emblem_unlocks', 'societa_emblem_holder_history')
order by columns.table_name, columns.ordinal_position;

select
  namespace.nspname as table_schema,
  relation.relname as table_name,
  constraint_record.conname as constraint_name,
  constraint_record.contype as constraint_type,
  pg_catalog.pg_get_constraintdef(constraint_record.oid, true) as definition
from pg_catalog.pg_constraint constraint_record
join pg_catalog.pg_class relation on relation.oid = constraint_record.conrelid
join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relname in ('societa_emblem_unlocks', 'societa_emblem_holder_history')
order by relation.relname, constraint_record.contype, constraint_record.conname;

select
  indexes.schemaname,
  indexes.tablename,
  indexes.indexname,
  indexes.indexdef
from pg_catalog.pg_indexes indexes
where indexes.schemaname = 'public'
  and indexes.tablename in ('societa_emblem_unlocks', 'societa_emblem_holder_history')
order by indexes.tablename, indexes.indexname;

select
  namespace.nspname as table_schema,
  relation.relname as table_name,
  trigger_record.tgname as trigger_name,
  trigger_record.tgenabled as enabled,
  pg_catalog.pg_get_triggerdef(trigger_record.oid, true) as definition
from pg_catalog.pg_trigger trigger_record
join pg_catalog.pg_class relation on relation.oid = trigger_record.tgrelid
join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
where not trigger_record.tgisinternal
  and (
    (namespace.nspname = 'public' and relation.relname in (
      'societa_emblem_unlocks', 'societa_emblem_holder_history',
      'profile_supports', 'profile_support_ineligibilities', 'profiles',
      'stagioni', 'partite'
    ))
    or trigger_record.tgfoid in (
      pg_catalog.to_regprocedure('private.trigger_sync_societa_support_emblems()')
    )
  )
order by relation.relname, trigger_record.tgname;

select
  namespace.nspname as function_schema,
  procedure.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(procedure.oid) as identity_arguments,
  procedure.prosecdef as security_definer,
  procedure.proconfig as configuration,
  pg_catalog.pg_get_functiondef(procedure.oid) as definition
from pg_catalog.pg_proc procedure
join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
where (namespace.nspname, procedure.proname) in (
  ('private', 'sync_societa_support_emblems'),
  ('private', 'trigger_sync_societa_support_emblems'),
  ('public', 'public_societa_support_emblems')
)
order by namespace.nspname, procedure.proname,
  pg_catalog.pg_get_function_identity_arguments(procedure.oid);

select
  privileges.grantee,
  privileges.table_schema,
  privileges.table_name,
  privileges.privilege_type,
  privileges.is_grantable
from information_schema.table_privileges privileges
where privileges.table_schema = 'public'
  and privileges.table_name in ('societa_emblem_unlocks', 'societa_emblem_holder_history')
order by privileges.table_name, privileges.grantee, privileges.privilege_type;

select
  privileges.grantee,
  privileges.routine_schema,
  privileges.routine_name,
  privileges.privilege_type,
  privileges.is_grantable
from information_schema.routine_privileges privileges
where (privileges.routine_schema, privileges.routine_name) in (
  ('private', 'sync_societa_support_emblems'),
  ('private', 'trigger_sync_societa_support_emblems'),
  ('public', 'public_societa_support_emblems')
)
order by privileges.routine_schema, privileges.routine_name, privileges.grantee;

select
  namespace.nspname as schema_name,
  pg_catalog.has_schema_privilege('anon', namespace.oid, 'USAGE') as anon_usage,
  pg_catalog.has_schema_privilege('authenticated', namespace.oid, 'USAGE') as authenticated_usage,
  pg_catalog.has_schema_privilege('service_role', namespace.oid, 'USAGE') as service_role_usage
from pg_catalog.pg_namespace namespace
where namespace.nspname in ('public', 'private')
order by namespace.nspname;
