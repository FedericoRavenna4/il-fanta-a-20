-- SOLO TEST / DEV. READ-ONLY. Non resetta unlock e non modifica il database.
-- Impostare lo slug desiderato nella CTE params.
-- Il flag "popup già mostrato" è nel localStorage del browser, non in PostgreSQL.
with params as (
  select
    public.normalize_account_username('testesterno') as username_normalizzato,
    'prima-bet'::text as emblem_slug
), target as (
  select profile.id as profile_id, profile.username, profile.username_normalizzato
  from public.profiles profile
  join params on profile.username_normalizzato = params.username_normalizzato
), emblem as (
  select catalog.id as emblem_id, catalog.slug, catalog.nome
  from public.user_emblems catalog
  join params on catalog.slug = params.emblem_slug
)
select
  target.profile_id,
  target.username,
  emblem.emblem_id,
  emblem.slug,
  emblem.nome,
  unlock.unlocked_at,
  unlock.source_type,
  unlock.source_ref,
  'fanta20:emblem-notifications:v1:' || target.profile_id::text as local_storage_key
from target
cross join emblem
left join public.user_emblem_unlocks unlock
  on unlock.profile_id = target.profile_id
 and unlock.emblem_id = emblem.emblem_id;
