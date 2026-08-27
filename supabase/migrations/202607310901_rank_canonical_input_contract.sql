-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 901: immutable canonical rank-input authority base only.
-- Membership-bound compute/seal/revoke/helper definitions remain ordered after 902/903 in migration 904.

begin;

-- Prerequisite roles are provisioned only under a separate role/grant approval:
-- Seven single-entrypoint NOLOGIN action roles are provisioned with the two
-- never-activated owner roles. Each future membership uses INHERIT FALSE.

create or replace function public.koaptix_text_array_is_distinct_nonblank(p_values text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select cardinality(p_values)>0
     and not exists (
       select 1 from unnest(p_values) v(value)
       where value is null or btrim(value)=''
     )
     and cardinality(p_values)=(select count(distinct value) from unnest(p_values) v(value));
$function$;

create table public.koaptix_rank_input_authority_manifest (
  snapshot_date date not null,
  run_id text not null unique check (btrim(run_id)<>''),
  scope_code text not null check (scope_code = 'KOREA_FULL'),
  authority_status text not null check (authority_status = 'SEALED'),
  market_cap_snapshot_date date not null,
  eligibility_snapshot_date date not null,
  canonical_query_version text not null,
  membership_contract_version text not null,
  market_cap_source_ids text[] not null,
  eligibility_source_ids text[] not null,
  membership_source_ids text[] not null,
  expected_market_cap_rows integer not null check (expected_market_cap_rows > 0),
  expected_eligibility_rows integer not null check (expected_eligibility_rows > 0),
  expected_join_rows integer not null check (expected_join_rows > 0),
  expected_qualified_rows integer not null check (expected_qualified_rows > 0),
  expected_jeonbuk_membership_rows integer not null
    check (expected_jeonbuk_membership_rows > 0),
  expected_sgg_52111_membership_rows integer not null
    check (expected_sgg_52111_membership_rows > 0),
  expected_sgg_52111_qualified_rows integer not null
    check (expected_sgg_52111_qualified_rows > 0),
  membership_duplicate_pairs integer not null check (membership_duplicate_pairs=0),
  membership_fail_closed_qualified_rows integer not null
    check (membership_fail_closed_qualified_rows=0),
  affected_universe_codes text[] not null,
  affected_universe_manifest jsonb not null
    check (jsonb_typeof(affected_universe_manifest)='array'),
  market_cap_calculation_versions text[] not null,
  eligibility_rule_versions text[] not null,
  manual_override_allowed boolean not null,
  blocking_review_rule_version text not null,
  blocking_review_rows integer not null check (blocking_review_rows = 0),
  blocking_review_sha256 text not null check (blocking_review_sha256 ~ '^[0-9A-F]{64}$'),
  market_cap_set_sha256 text not null check (market_cap_set_sha256 ~ '^[0-9A-F]{64}$'),
  eligibility_set_sha256 text not null check (eligibility_set_sha256 ~ '^[0-9A-F]{64}$'),
  source_set_sha256 text not null check (source_set_sha256 ~ '^[0-9A-F]{64}$'),
  selected_input_sha256 text not null check (selected_input_sha256 ~ '^[0-9A-F]{64}$'),
  membership_set_sha256 text not null check (membership_set_sha256 ~ '^[0-9A-F]{64}$'),
  affected_universe_set_sha256 text not null
    check (affected_universe_set_sha256 ~ '^[0-9A-F]{64}$'),
  authority_contract_version text not null,
  sealed_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(snapshot_date,authority_contract_version),
  check (public.koaptix_text_array_is_distinct_nonblank(market_cap_calculation_versions)),
  check (public.koaptix_text_array_is_distinct_nonblank(eligibility_rule_versions)),
  check (public.koaptix_text_array_is_distinct_nonblank(market_cap_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(eligibility_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(membership_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(affected_universe_codes)),
  check (market_cap_snapshot_date=snapshot_date),
  check (eligibility_snapshot_date=snapshot_date),
  check (snapshot_date>date '2026-05-31'),
  check (canonical_query_version='canonical-rank-input-v1'),
  check (membership_contract_version='membership-map-first-45-52-v1'),
  check (authority_contract_version='rank-input-v1'),
  check (market_cap_source_ids=array[
    'relation:public.apt_market_cap_snapshot',
    'set-sha256:'||market_cap_set_sha256
  ]::text[]),
  check (eligibility_source_ids=array[
    'relation:public.complex_eligibility_snapshot',
    'set-sha256:'||eligibility_set_sha256
  ]::text[]),
  check (membership_source_ids=array[
    'relation:public.v_koaptix_rank_membership_authority_u',
    'relation:public.v_koaptix_universe_membership_u',
    'set-sha256:'||membership_set_sha256
  ]::text[]),
  check (blocking_review_rule_version='NO_DIRECT_RANK_REVIEW_AUTHORITY_V1'),
  check (blocking_review_sha256='4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'),
  check (sealed_at=created_at),
  check (expected_market_cap_rows = expected_eligibility_rows),
  check (expected_market_cap_rows = expected_join_rows),
  check (expected_qualified_rows <= expected_join_rows),
  check (cardinality(affected_universe_codes)=jsonb_array_length(affected_universe_manifest))
);

revoke all on public.koaptix_rank_input_authority_manifest from public, anon, authenticated, service_role,
  koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
  koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
  koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
  koaptix_rank_publication_rollback;
grant select on public.koaptix_rank_input_authority_manifest
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;
revoke all on function public.koaptix_text_array_is_distinct_nonblank(text[])
  from public,anon,authenticated,service_role,
       koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_text_array_is_distinct_nonblank(text[])
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;

create or replace function public.koaptix_reject_rank_input_manifest_mutation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
begin
  raise exception 'sealed rank input manifest rows are immutable';
end;
$function$;

revoke all on function public.koaptix_reject_rank_input_manifest_mutation()
  from public,anon,authenticated,service_role;

create trigger trg_koaptix_rank_input_manifest_immutable
before update or delete on public.koaptix_rank_input_authority_manifest
for each row execute function public.koaptix_reject_rank_input_manifest_mutation();

create table public.koaptix_rank_input_manifest_revocation (
  manifest_run_id text primary key check (btrim(manifest_run_id)<>'')
    references public.koaptix_rank_input_authority_manifest(run_id),
  revocation_run_id text not null unique check (btrim(revocation_run_id)<>''),
  reason_code text not null check (btrim(reason_code)<>''),
  revoked_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (revoked_at=created_at)
);

revoke all on public.koaptix_rank_input_manifest_revocation from public,anon,authenticated,service_role,
  koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
  koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
  koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
  koaptix_rank_publication_rollback;
grant select on public.koaptix_rank_input_manifest_revocation
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;

create trigger trg_koaptix_rank_input_manifest_revocation_immutable
before update or delete on public.koaptix_rank_input_manifest_revocation
for each row execute function public.koaptix_reject_rank_input_manifest_mutation();

create view public.v_koaptix_canonical_rank_input_u as
select
  m.snapshot_date,
  m.complex_id,
  m.market_cap_krw,
  m.coverage_status,
  m.calculation_version as market_cap_calculation_version,
  e.eligibility_status,
  e.rule_version as eligibility_rule_version,
  e.manual_override
from public.apt_market_cap_snapshot m
join public.complex_eligibility_snapshot e
  on e.snapshot_date = m.snapshot_date
 and e.complex_id = m.complex_id
join public.apt_complex a
  on a.complex_id = m.complex_id
where m.market_cap_krw > 0
  and m.coverage_status = 'full'
  and e.is_rank_eligible is true
  and e.eligibility_status = 'eligible'
  and a.is_active is true
  and a.master_status = 'active'
  and a.merged_into_complex_id is null;

revoke all on public.v_koaptix_canonical_rank_input_u from public, anon, authenticated, service_role;
revoke all on public.v_koaptix_canonical_rank_input_u
  from koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant select on public.v_koaptix_canonical_rank_input_u to koaptix_rank_publication_owner;

-- KOAPTIX_M901_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_BEGIN
do $koaptix_m901_owner_bootstrap_pre$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_PRE_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_PRE_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_PRE_TARGET_STATE';
    end if;
  end loop;
end;
$koaptix_m901_owner_bootstrap_pre$;

grant koaptix_rank_authority_owner to postgres with admin false, inherit false, set true granted by postgres;
grant koaptix_rank_publication_owner to postgres with admin false, inherit false, set true granted by postgres;

do $koaptix_m901_owner_bootstrap_membership$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
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
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_ACTIVE_MEMBERSHIP_GRAPH';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.pg_has_role('postgres',v_role,'SET') then
      raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_SET_OPTION';
    end if;
  end loop;
end;
$koaptix_m901_owner_bootstrap_membership$;

grant create on schema public to koaptix_rank_authority_owner;
grant create on schema public to koaptix_rank_publication_owner;

do $koaptix_m901_owner_bootstrap_schema$
declare
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
  v_role text;
begin
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or not pg_catalog.has_schema_privilege(v_role,'public','CREATE') then
      raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M901_ACLEXPLODE_MULTIDIMENSIONAL_ACL_01';
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
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL_EXPANSION';
  end if;
end;
$koaptix_m901_owner_bootstrap_schema$;

alter function public.koaptix_text_array_is_distinct_nonblank(text[])
  owner to koaptix_rank_authority_owner;
alter function public.koaptix_reject_rank_input_manifest_mutation()
  owner to koaptix_rank_authority_owner;
alter table public.koaptix_rank_input_authority_manifest
  owner to koaptix_rank_authority_owner;
alter table public.koaptix_rank_input_manifest_revocation
  owner to koaptix_rank_authority_owner;
alter view public.v_koaptix_canonical_rank_input_u
  owner to koaptix_rank_publication_owner;
revoke create on schema public from koaptix_rank_authority_owner restrict;
revoke create on schema public from koaptix_rank_publication_owner restrict;
revoke koaptix_rank_authority_owner from postgres granted by postgres restrict;
revoke koaptix_rank_publication_owner from postgres granted by postgres restrict;

do $koaptix_m901_owner_bootstrap_post$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
  v_object record;
  v_actual_owner text;
  v_owner_count integer:=0;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_POST_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_POST_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_POST_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_POST_TARGET_STATE';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M901_ACLEXPLODE_MULTIDIMENSIONAL_ACL_02';
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
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_POST_SCHEMA_ACL_EXPANSION';
  end if;
  for v_object in select * from (values
      ('FUNCTION','public.koaptix_text_array_is_distinct_nonblank(text[])','koaptix_rank_authority_owner'),
      ('FUNCTION','public.koaptix_reject_rank_input_manifest_mutation()','koaptix_rank_authority_owner'),
      ('RELATION','public.koaptix_rank_input_authority_manifest','koaptix_rank_authority_owner'),
      ('RELATION','public.koaptix_rank_input_manifest_revocation','koaptix_rank_authority_owner'),
      ('RELATION','public.v_koaptix_canonical_rank_input_u','koaptix_rank_publication_owner')
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
      raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_OWNER_MANIFEST';
    end if;
    v_owner_count:=v_owner_count+1;
  end loop;
  if v_owner_count<>5 then
    raise exception using errcode='P0001',message='M901_OWNER_BOOTSTRAP_OWNER_COUNT';
  end if;
end;
$koaptix_m901_owner_bootstrap_post$;
-- KOAPTIX_M901_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_END

-- Membership-bound compute/seal/revoke/helper functions are intentionally deferred until 902 membership and 903 generation/pointer definitions exist.

commit;
