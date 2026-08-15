-- Diagnostica read-only da eseguire prima della migration Rose.
select
  pg_catalog.to_regclass('public.rose_giocatori') as rose_giocatori_table,
  pg_catalog.to_regprocedure('public.admin_publish_rose_snapshot(bigint, uuid, jsonb)') as publish_rpc;

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
  and namespace.nspname = 'public'
  and relation.relname = 'rose_giocatori'
  and trigger_record.tgname = 'rose_giocatori_set_updated_at';

select
  season.id as stagione_id,
  season.codice,
  season.attiva,
  count(player.id)::bigint as calciatori
from public.stagioni season
left join public.rose_giocatori player on player.stagione_id = season.id
group by season.id, season.codice, season.attiva
order by season.id desc;

select
  player.stagione_id,
  player.societa_id,
  count(*)::bigint as calciatori
from public.rose_giocatori player
group by player.stagione_id, player.societa_id
order by player.stagione_id desc, player.societa_id;
