-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 902: map-first JEONBUK_ALL prefix 45+52 authority and compatibility-view replacements.
-- Apply only after exact current-definition and population guards pass.

begin;

create or replace view public.v_koaptix_rank_membership_authority_u as
with map_candidates as (
  select rm.complex_id,
         case
           when rm.sgg_cd ~ '^[0-9]{5}$'
             and rm.lawd_cd ~ '^[0-9]{5,10}$'
             and rm.sgg_cd=left(rm.lawd_cd,5) then rm.sgg_cd
           when rm.sgg_cd ~ '^[0-9]{5}$'
             and coalesce(btrim(rm.lawd_cd),'')='' then rm.sgg_cd
           when rm.lawd_cd ~ '^[0-9]{5,10}$'
             and coalesce(btrim(rm.sgg_cd),'')='' then left(rm.lawd_cd,5)
           else null
         end as map_sgg_cd,
         case
           when rm.sgg_cd ~ '^[0-9]{5}$'
             and rm.lawd_cd ~ '^[0-9]{5,10}$'
             and rm.sgg_cd<>left(rm.lawd_cd,5) then true
           when rm.sgg_cd ~ '^[0-9]{5}$'
             and coalesce(btrim(rm.lawd_cd),'')<>''
             and not (rm.lawd_cd ~ '^[0-9]{5,10}$') then true
           when rm.lawd_cd ~ '^[0-9]{5,10}$'
             and coalesce(btrim(rm.sgg_cd),'')<>''
             and not (rm.sgg_cd ~ '^[0-9]{5}$') then true
           when not (coalesce(rm.sgg_cd,'') ~ '^[0-9]{5}$')
             and not (coalesce(rm.lawd_cd,'') ~ '^[0-9]{5,10}$') then true
           else false
         end as invalid_or_conflicting_map_row
  from public.koaptix_complex_region_map rm
),
map_authority as (
  select complex_id,count(*) as map_row_count,
         count(*) filter (where invalid_or_conflicting_map_row) as invalid_or_conflict_count,
         count(distinct map_sgg_cd) filter (where map_sgg_cd is not null) as valid_code_count,
         case when count(*) filter (where invalid_or_conflicting_map_row)=0
                   and count(distinct map_sgg_cd) filter (where map_sgg_cd is not null)=1
              then min(map_sgg_cd) filter (where map_sgg_cd is not null) end as map_sgg_cd
  from map_candidates group by complex_id
),
apt_candidates as (
  select a.complex_id,rd.region_code as apt_sgg_cd
  from public.apt_complex a
  join public.region_dim rd on rd.region_id=a.region_id
  where a.is_active is true and a.master_status='active'
    and a.merged_into_complex_id is null and rd.is_active is true
    and rd.region_type='sigungu' and rd.region_code ~ '^[0-9]{5}$'
),
apt_authority as (
  select complex_id,count(distinct apt_sgg_cd) as valid_code_count,
         case when count(distinct apt_sgg_cd)=1 then min(apt_sgg_cd) end as apt_sgg_cd
  from apt_candidates group by complex_id
)
select a.complex_id,
       case
         when m.map_row_count is null and p.valid_code_count=1 then p.apt_sgg_cd
         when m.map_row_count is null then null
         when m.invalid_or_conflict_count>0 or m.valid_code_count<>1 then null
         else m.map_sgg_cd
       end as resolved_sgg_cd,
       case when m.map_row_count is not null then 'MAP' else 'APT_FALLBACK' end
         as resolution_source,
       case
         when m.map_row_count is null and p.valid_code_count=1 then 'RESOLVED'
         when m.map_row_count is null then 'FAIL_CLOSED_APT_AMBIGUOUS_OR_ABSENT'
         when m.invalid_or_conflict_count>0 or m.valid_code_count<>1
           then 'FAIL_CLOSED_MAP_INVALID_OR_AMBIGUOUS'
         else 'RESOLVED'
       end as resolution_status,
       coalesce(m.map_row_count,0)::bigint as map_row_count,
       coalesce(m.invalid_or_conflict_count,0)::bigint as invalid_or_conflict_count,
       coalesce(m.valid_code_count,0)::bigint as map_valid_code_count,
       coalesce(p.valid_code_count,0)::bigint as apt_valid_code_count
from public.apt_complex a
left join map_authority m on m.complex_id=a.complex_id
left join apt_authority p on p.complex_id=a.complex_id
where a.is_active is true and a.master_status='active'
  and a.merged_into_complex_id is null;

alter view public.v_koaptix_rank_membership_authority_u
  owner to koaptix_rank_publication_owner;
revoke all on public.v_koaptix_rank_membership_authority_u
  from public,anon,authenticated,service_role,
       koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant select on public.v_koaptix_rank_membership_authority_u
  to koaptix_rank_publication_owner;

create or replace view public.v_koaptix_universe_membership_u as
with base as (
  select r.complex_id,r.lawd_cd,r.sgg_cd,r.sigungu_name,r.legal_dong_name
  from public.v_koaptix_complex_region_resolved_u r
),
jeonbuk_authority as (
  select complex_id,resolved_sgg_cd
  from public.v_koaptix_rank_membership_authority_u
  where resolution_status='RESOLVED'
),
membership as (
  select b.complex_id,'KOREA_ALL'::text as universe_code,
         '전국'::text as universe_name,'NATION'::text as universe_scope
  from base b
  union all
  select b.complex_id,
         case left(coalesce(b.lawd_cd,b.sgg_cd,''),2)
           when '11' then 'SEOUL_ALL' when '26' then 'BUSAN_ALL'
           when '41' then 'GYEONGGI_ALL' else null end,
         case left(coalesce(b.lawd_cd,b.sgg_cd,''),2)
           when '11' then '서울' when '26' then '부산'
           when '41' then '경기' else null end,
         'PROVINCE'::text
  from base b
  where left(coalesce(b.lawd_cd,b.sgg_cd,''),2) in ('11','26','41')
  union all
  select j.complex_id,'JEONBUK_ALL'::text,'전북'::text,'PROVINCE'::text
  from jeonbuk_authority j
  where left(j.resolved_sgg_cd,2) in ('45','52')
  union all
  select b.complex_id,
         'SGG_'||left(coalesce(b.sgg_cd,b.lawd_cd,''),5),
         coalesce(b.sigungu_name,left(coalesce(b.sgg_cd,b.lawd_cd,''),5)),
         'SGG'::text
  from base b
  where left(coalesce(b.sgg_cd,b.lawd_cd,''),5)<>''
)
select complex_id,universe_code,
       min(universe_name)::text as universe_name,
       min(universe_scope)::text as universe_scope
from membership
where universe_code is not null
group by complex_id,universe_code
having count(distinct coalesce(universe_name,''))=1
   and count(distinct coalesce(universe_scope,''))=1;

create or replace view public.v_koaptix_universe_membership as
with base as (
  select r.complex_id,nullif(r.lawd_cd,'') as lawd_cd,
         nullif(r.sgg_cd,'') as sgg_cd,nullif(r.sigungu_name,'') as sigungu_name,
         nullif(r.umd_nm,'') as umd_nm,
         left(nullif(r.lawd_cd,''),2) as sido_prefix,
         coalesce(nullif(r.sgg_cd,''),left(nullif(r.lawd_cd,''),5)) as normalized_sgg_cd
  from public.v_koaptix_complex_region_resolved r
),
metro as (
  select b.complex_id,
    case b.sido_prefix
      when '11' then 'SEOUL_ALL' when '26' then 'BUSAN_ALL'
      when '27' then 'DAEGU_ALL' when '28' then 'INCHEON_ALL'
      when '29' then 'GWANGJU_ALL' when '30' then 'DAEJEON_ALL'
      when '31' then 'ULSAN_ALL' when '36' then 'SEJONG_ALL'
      when '41' then 'GYEONGGI_ALL' when '42' then 'GANGWON_ALL'
      when '43' then 'CHUNGBUK_ALL' when '44' then 'CHUNGNAM_ALL'
      when '46' then 'JEONNAM_ALL' when '47' then 'GYEONGBUK_ALL'
      when '48' then 'GYEONGNAM_ALL' when '50' then 'JEJU_ALL'
      else null end as universe_code,
    case b.sido_prefix
      when '11' then '서울 전체' when '26' then '부산 전체'
      when '27' then '대구 전체' when '28' then '인천 전체'
      when '29' then '광주 전체' when '30' then '대전 전체'
      when '31' then '울산 전체' when '36' then '세종 전체'
      when '41' then '경기 전체' when '42' then '강원 전체'
      when '43' then '충북 전체' when '44' then '충남 전체'
      when '46' then '전남 전체' when '47' then '경북 전체'
      when '48' then '경남 전체' when '50' then '제주 전체'
      else null end as universe_name,
    1 as universe_level,b.lawd_cd,b.normalized_sgg_cd as sgg_cd,
    b.sigungu_name,b.umd_nm
  from base b
  where b.sido_prefix is not null
),
jeonbuk as (
  select b.complex_id,'JEONBUK_ALL'::text as universe_code,
         '전북 전체'::text as universe_name,1 as universe_level,
         b.lawd_cd,b.normalized_sgg_cd as sgg_cd,b.sigungu_name,b.umd_nm
  from base b
  join public.v_koaptix_universe_membership_u u
    on u.complex_id=b.complex_id and u.universe_code='JEONBUK_ALL'
),
sgg as (
  select b.complex_id,'SGG_'||b.normalized_sgg_cd as universe_code,
         coalesce(b.sigungu_name,'시군구 미상') as universe_name,
         2 as universe_level,b.lawd_cd,b.normalized_sgg_cd as sgg_cd,
         b.sigungu_name,b.umd_nm
  from base b where b.normalized_sgg_cd is not null
),
all_rows as (
  select b.complex_id,'KOREA_ALL'::text as universe_code,
         '대한민국 전체'::text as universe_name,0 as universe_level,
         b.lawd_cd,b.normalized_sgg_cd as sgg_cd,b.sigungu_name,b.umd_nm
  from base b
  union all select * from metro where universe_code is not null
  union all select * from jeonbuk
  union all select * from sgg
)
select complex_id,universe_code,
  min(universe_name)::text as universe_name,
  min(universe_level)::integer as universe_level,
  min(lawd_cd)::text as lawd_cd,
  min(sgg_cd)::text as sgg_cd,
  min(sigungu_name)::text as sigungu_name,
  min(umd_nm)::text as umd_nm
from all_rows
group by complex_id,universe_code
having count(distinct row(
  universe_name,universe_level,lawd_cd,sgg_cd,sigungu_name,umd_nm
))=1;

commit;
