-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 905: service-role-only home payload with one GLOBAL_LATEST rank base and publication identity.
-- This migration creates definitions only; it writes no generation, source, event, or pointer row.

begin;

do $preconditions$
declare
  v_home_signature text[];
  v_global_signature text[];
  v_home_definition_sha256 text;
begin
  if to_regclass('public.v_koaptix_home_public_service_payload') is null
     or to_regclass('public.v_koaptix_latest_global_rank_board_published') is null then
    raise exception '905 prerequisite view is missing';
  end if;

  select array_agg(c.column_name || ':' || c.udt_name order by c.column_name)
    into v_home_signature
  from information_schema.columns c
  where c.table_schema='public'
    and c.table_name='v_koaptix_home_public_service_payload';

  if v_home_signature is distinct from array[
    'base_date:date','index_card:jsonb','index_chart:jsonb','index_code:text',
    'index_name:text','snapshot_date:date','top50:jsonb','top50_count:int4',
    'total_ranked_complexes:int4','universe_code:text'
  ]::text[] then
    raise exception 'captured public-service home-view signature changed';
  end if;

  select upper(encode(sha256(convert_to(
           pg_get_viewdef('public.v_koaptix_home_public_service_payload'::regclass,true),
           'UTF8'
         )),'hex'))
    into v_home_definition_sha256;
  if v_home_definition_sha256 is distinct from
       '04DC1B5940C62E6620033C6E3732637253CDF3E15B86AAD521D471FB06D534C4' then
    raise exception 'captured public-service home-view definition changed';
  end if;

  select array_agg(c.column_name || ':' || c.udt_name order by c.column_name)
    into v_global_signature
  from information_schema.columns c
  where c.table_schema='public'
    and c.table_name='v_koaptix_latest_global_rank_board_published';

  if v_global_signature is distinct from array[
    'address_jibun:text','address_road:text','apt_name_ko:text','build_year:int4',
    'complex_id:int8','coverage_status:text','eligibility_status:text',
    'generation_id:uuid','household_count:int4','is_rank_eligible:bool',
    'is_top1000:bool','latitude:numeric','legal_dong_name:text','longitude:numeric',
    'market_cap_krw:int8','market_cap_share:numeric','market_cap_share_pct:numeric',
    'market_cap_trillion_krw:numeric','previous_rank_all:int4',
    'priced_cluster_count:int4','priced_household_count:int4',
    'priced_household_ratio:numeric','publication_event_id:uuid',
    'publication_version:int8','published_at:timestamptz','rank_all:int4',
    'rank_delta_1d:int4','rank_movement:text','recovery_52w:text',
    'sigungu_code:text','sigungu_name:text','snapshot_date:date','tier_code:text',
    'tier_label:text','tier_sort:int4','total_cluster_count:int4',
    'total_household_count:int4','universe_code:text'
  ]::text[] then
    raise exception 'typed GLOBAL_LATEST published-view signature changed';
  end if;

  if not exists (
    select 1
    from information_schema.views v
    where v.table_schema='public'
      and v.table_name='v_koaptix_latest_global_rank_board_published'
      and v.is_updatable='NO'
  ) then
    raise exception 'GLOBAL_LATEST published view must be non-updatable';
  end if;
end;
$preconditions$;

create view public.v_koaptix_home_public_service_payload_published
with (security_barrier=true) as
with rank_base as materialized (
  select *
  from public.v_koaptix_latest_global_rank_board_published
  where universe_code='KOREA_ALL'
), identity as (
  select generation_id,publication_version,publication_event_id,published_at,
         min(snapshot_date) as rank_snapshot_date
  from rank_base
  group by generation_id,publication_version,publication_event_id,published_at
  having count(*)>0 and count(distinct snapshot_date)=1
), rank_top50 as (
  select jsonb_agg(jsonb_build_object(
    'rank_all',r.rank_all,'tier_code',r.tier_code,'tier_label',r.tier_label,
    'complex_id',r.complex_id,'apt_name_ko',r.apt_name_ko,
    'sigungu_name',r.sigungu_name,'legal_dong_name',r.legal_dong_name,
    'address_road',r.address_road,'address_jibun',r.address_jibun,
    'build_year',r.build_year,'market_cap_krw',r.market_cap_krw,
    'market_cap_trillion_krw',r.market_cap_trillion_krw,
    'market_cap_share_pct',r.market_cap_share_pct,
    'previous_rank_all',r.previous_rank_all,'rank_delta_1d',r.rank_delta_1d,
    'rank_movement',r.rank_movement,
    'priced_household_ratio',r.priced_household_ratio,
    'coverage_status',r.coverage_status,'latitude',r.latitude,
    'longitude',r.longitude,'recovery_52w',r.recovery_52w
  ) order by r.rank_all,r.complex_id) as top50
  from rank_base r where r.rank_all<=50
), rank_meta as (
  select count(*)::bigint as total_ranked_complexes,
         count(*) filter (where rank_all<=50)::integer as top50_count
  from rank_base
)
select h.snapshot_date,h.index_code,h.universe_code,h.index_name,h.base_date,
       h.index_card,h.index_chart,t.top50,m.top50_count,m.total_ranked_complexes,
       i.rank_snapshot_date,i.generation_id as rank_generation_id,
       i.publication_version as rank_publication_version,
       i.publication_event_id as rank_publication_event_id,
       i.published_at as rank_published_at
from public.v_koaptix_home_public_service_payload h
cross join identity i cross join rank_top50 t cross join rank_meta m;
alter view public.v_koaptix_home_public_service_payload_published owner to postgres;
revoke all on table public.v_koaptix_home_public_service_payload_published
  from public,anon,authenticated,service_role;
grant select on table public.v_koaptix_home_public_service_payload_published
  to service_role;
commit;

-- The separately approved guarded cutover, only after global app deployment and
-- >=991 seconds passive drain, REVOKEs ALL on both identity-less home source views
-- from PUBLIC/anon/authenticated/service_role and isolates the independent-MAX v2
-- view the same way. It captures/restores exact ACL/grantable/grantor state.
