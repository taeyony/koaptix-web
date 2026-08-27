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

-- KOAPTIX_M902_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_BEGIN
do $koaptix_m902_owner_bootstrap_pre$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_EXECUTOR_IDENTITY';
  end if;
  with expected (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select role_name,'postgres'::text,'supabase_admin'::text,true,false,false
    from unnest(v_expected_roles) role_name
  ), actual (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select granted_role.rolname::text,member_role.rolname::text,
           grantor_role.rolname::text,am.admin_option,
           am.inherit_option,am.set_option
    from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
    where granted_role.rolname=any(v_expected_roles)
       or member_role.rolname=any(v_expected_roles)
  ), mismatch as (
    (select 'UNEXPECTED'::text as mismatch_kind,actual.* from actual
     except all select 'UNEXPECTED'::text,expected.* from expected)
    union all
    (select 'MISSING'::text as mismatch_kind,expected.* from expected
     except all select 'MISSING'::text,actual.* from actual)
  )
  select pg_catalog.jsonb_build_object(
           'kind',mismatch_kind,'granted_role',granted_role_name,
           'member_role',member_role_name,'grantor_role',grantor_role_name,
           'admin_option',admin_option,'inherit_option',inherit_option,
           'set_option',set_option)
    into v_mismatch
  from mismatch
  order by mismatch_kind,granted_role_name,member_role_name,grantor_role_name
  limit 1;
  if v_mismatch is not null then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_PRE_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_PRE_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if pg_catalog.pg_has_role('postgres',v_role,'SET')
       or not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or pg_catalog.has_schema_privilege(v_role,'public','CREATE')
       or exists (
         select 1 from pg_catalog.pg_auth_members am
         join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
         join pg_catalog.pg_roles member_role on member_role.oid=am.member
         where granted_role.rolname=v_role and member_role.rolname='postgres'
           and am.grantor=(select oid from pg_catalog.pg_roles where rolname='postgres')
       ) then
      raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_PRE_TARGET_STATE';
    end if;
  end loop;
end;
$koaptix_m902_owner_bootstrap_pre$;

grant koaptix_rank_publication_owner to postgres with admin false, inherit false, set true granted by postgres;

do $koaptix_m902_owner_bootstrap_membership$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
begin
  with expected (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select role_name,'postgres'::text,'supabase_admin'::text,true,false,false
    from unnest(v_expected_roles) role_name
    union all
    select role_name,'postgres'::text,'postgres'::text,false,false,true
    from unnest(v_target_roles) role_name
  ), actual (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select granted_role.rolname::text,member_role.rolname::text,
           grantor_role.rolname::text,am.admin_option,
           am.inherit_option,am.set_option
    from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
    where granted_role.rolname=any(v_expected_roles)
       or member_role.rolname=any(v_expected_roles)
  ), mismatch as (
    (select 'UNEXPECTED'::text as mismatch_kind,actual.* from actual
     except all select 'UNEXPECTED'::text,expected.* from expected)
    union all
    (select 'MISSING'::text as mismatch_kind,expected.* from expected
     except all select 'MISSING'::text,actual.* from actual)
  )
  select pg_catalog.jsonb_build_object(
           'kind',mismatch_kind,'granted_role',granted_role_name,
           'member_role',member_role_name,'grantor_role',grantor_role_name,
           'admin_option',admin_option,'inherit_option',inherit_option,
           'set_option',set_option)
    into v_mismatch
  from mismatch
  order by mismatch_kind,granted_role_name,member_role_name,grantor_role_name
  limit 1;
  if v_mismatch is not null then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_ACTIVE_MEMBERSHIP_GRAPH';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.pg_has_role('postgres',v_role,'SET') then
      raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_SET_OPTION';
    end if;
  end loop;
end;
$koaptix_m902_owner_bootstrap_membership$;

grant create on schema public to koaptix_rank_publication_owner;

do $koaptix_m902_owner_bootstrap_schema$
declare
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
begin
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or not pg_catalog.has_schema_privilege(v_role,'public','CREATE') then
      raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M902_ACLEXPLODE_MULTIDIMENSIONAL_ACL_01';
  end if;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    cross join lateral pg_catalog.unnest(
      coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
    where n.nspname='public' and acl.privilege_type='CREATE'
      and coalesce(grantee.rolname,'PUBLIC')<>'pg_database_owner'
      and not coalesce(grantee.rolname,'PUBLIC')=any(v_target_roles)
  ) then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL_EXPANSION';
  end if;
end;
$koaptix_m902_owner_bootstrap_schema$;

alter view public.v_koaptix_rank_membership_authority_u
  owner to koaptix_rank_publication_owner;
revoke create on schema public from koaptix_rank_publication_owner restrict;
revoke koaptix_rank_publication_owner from postgres granted by postgres restrict;

do $koaptix_m902_owner_bootstrap_post$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
  v_object record;
  v_actual_owner text;
  v_owner_count integer:=0;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_POST_EXECUTOR_IDENTITY';
  end if;
  with expected (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select role_name,'postgres'::text,'supabase_admin'::text,true,false,false
    from unnest(v_expected_roles) role_name
  ), actual (
    granted_role_name,member_role_name,grantor_role_name,
    admin_option,inherit_option,set_option
  ) as (
    select granted_role.rolname::text,member_role.rolname::text,
           grantor_role.rolname::text,am.admin_option,
           am.inherit_option,am.set_option
    from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
    where granted_role.rolname=any(v_expected_roles)
       or member_role.rolname=any(v_expected_roles)
  ), mismatch as (
    (select 'UNEXPECTED'::text as mismatch_kind,actual.* from actual
     except all select 'UNEXPECTED'::text,expected.* from expected)
    union all
    (select 'MISSING'::text as mismatch_kind,expected.* from expected
     except all select 'MISSING'::text,actual.* from actual)
  )
  select pg_catalog.jsonb_build_object(
           'kind',mismatch_kind,'granted_role',granted_role_name,
           'member_role',member_role_name,'grantor_role',grantor_role_name,
           'admin_option',admin_option,'inherit_option',inherit_option,
           'set_option',set_option)
    into v_mismatch
  from mismatch
  order by mismatch_kind,granted_role_name,member_role_name,grantor_role_name
  limit 1;
  if v_mismatch is not null then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_POST_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_POST_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if pg_catalog.pg_has_role('postgres',v_role,'SET')
       or not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or pg_catalog.has_schema_privilege(v_role,'public','CREATE')
       or exists (
         select 1 from pg_catalog.pg_auth_members am
         join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
         join pg_catalog.pg_roles member_role on member_role.oid=am.member
         where granted_role.rolname=v_role and member_role.rolname='postgres'
           and am.grantor=(select oid from pg_catalog.pg_roles where rolname='postgres')
       ) then
      raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_POST_TARGET_STATE';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M902_ACLEXPLODE_MULTIDIMENSIONAL_ACL_02';
  end if;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    cross join lateral pg_catalog.unnest(
      coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
    where n.nspname='public' and acl.privilege_type='CREATE'
      and coalesce(grantee.rolname,'PUBLIC')<>'pg_database_owner'
  ) then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_POST_SCHEMA_ACL_EXPANSION';
  end if;
  for v_object in select * from (values
      ('RELATION','public.v_koaptix_rank_membership_authority_u','koaptix_rank_publication_owner')
    ) expected(kind,object_identity,expected_owner)
  loop
    v_actual_owner:=null;
    if v_object.kind='FUNCTION' then
      select pg_catalog.pg_get_userbyid(p.proowner) into v_actual_owner
      from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure(v_object.object_identity);
    else
      select pg_catalog.pg_get_userbyid(c.relowner) into v_actual_owner
      from pg_catalog.pg_class c where c.oid=pg_catalog.to_regclass(v_object.object_identity);
    end if;
    if v_actual_owner is distinct from v_object.expected_owner then
      raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_OWNER_MANIFEST';
    end if;
    v_owner_count:=v_owner_count+1;
  end loop;
  if v_owner_count<>1 then
    raise exception using errcode='P0001',message='M902_OWNER_BOOTSTRAP_OWNER_COUNT';
  end if;
end;
$koaptix_m902_owner_bootstrap_post$;
-- KOAPTIX_M902_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_END
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
