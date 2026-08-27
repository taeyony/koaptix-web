-- Immutable, typed two-surface latest-board generations and atomic publication.
-- Definition deployment only: this migration creates no generation, event, pointer,
-- official rank row, role membership, deployment, or cache mutation.
begin;

do $preconditions$
declare
  v_name text;
begin
  foreach v_name in array array[
    'koaptix_latest_board_generation',
    'koaptix_latest_board_generation_surface',
    'koaptix_latest_board_generation_universe',
    'koaptix_latest_board_generation_row',
    'koaptix_latest_board_generation_global_row',
    'koaptix_rank_publication_history_stage',
    'koaptix_rank_publication_snapshot_stage',
    'koaptix_latest_board_publication_event',
    'koaptix_latest_board_publication'
  ] loop
    if to_regclass('public.' || v_name) is not null then
      raise exception '903 refuses to adopt pre-existing relation public.%', v_name;
    end if;
  end loop;

  if to_regclass('public.koaptix_rank_input_authority_manifest') is null
     or to_regclass('public.koaptix_rank_input_manifest_revocation') is null
     or to_regprocedure('public.koaptix_text_array_is_distinct_nonblank(text[])') is null then
    raise exception '901 authority base must exist before 903';
  end if;

  foreach v_name in array array[
    'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    if not exists (select 1 from pg_catalog.pg_roles where rolname=v_name) then
      raise exception 'required recovery role is missing: %',v_name;
    end if;
  end loop;

  if exists (
    with protected_role(role_name) as (
      values
        ('koaptix_rank_authority_owner'),
        ('koaptix_rank_publication_owner'),
        ('koaptix_rank_authority_reader'),
        ('koaptix_rank_manifest_sealer'),
        ('koaptix_rank_manifest_revoker'),
        ('koaptix_rank_bootstrap_seeder'),
        ('koaptix_rank_generation_builder'),
        ('koaptix_rank_generation_publisher'),
        ('koaptix_rank_publication_rollback')
    ), expected (
      granted_role_name,member_role_name,grantor_role_name,
      admin_option,inherit_option,set_option
    ) as (
      select role_name,'postgres'::text,'supabase_admin'::text,
             true,false,false
      from protected_role
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
      where granted_role.rolname in (select role_name from protected_role)
         or member_role.rolname in (select role_name from protected_role)
    ), mismatch as (
      (select * from expected except all select * from actual)
      union all
      (select * from actual except all select * from expected)
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',
      message='903 definition deployment requires exact accepted post-M900 nine-edge recovery-role membership graph';
  end if;
end;
$preconditions$;

-- KOAPTIX_M903_STATEMENT3_AUTHORITY_BRIDGE_BEGIN
do $koaptix_m903_statement3_authority_pre$
declare
  v_mismatch boolean;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_PRE_EXECUTOR_IDENTITY';
  end if;
  if pg_catalog.to_regclass('pg_temp.koaptix_m903_statement3_acl_baseline') is not null then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_TEMP_BASELINE_EXISTS';
  end if;
  if exists (
    with protected_role(role_name) as (
      values
        ('koaptix_rank_authority_owner'),('koaptix_rank_publication_owner'),
        ('koaptix_rank_authority_reader'),('koaptix_rank_manifest_sealer'),
        ('koaptix_rank_manifest_revoker'),('koaptix_rank_bootstrap_seeder'),
        ('koaptix_rank_generation_builder'),('koaptix_rank_generation_publisher'),
        ('koaptix_rank_publication_rollback')
    ), expected (
      granted_role_name,member_role_name,grantor_role_name,
      admin_option,inherit_option,set_option
    ) as (
      select role_name,'postgres'::text,'supabase_admin'::text,true,false,false
      from protected_role
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
      where granted_role.rolname in (select role_name from protected_role)
         or member_role.rolname in (select role_name from protected_role)
    ), mismatch as (
      (select * from expected except all select * from actual)
      union all
      (select * from actual except all select * from expected)
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_PRE_MEMBERSHIP_GRAPH';
  end if;
  if pg_catalog.pg_has_role('postgres','koaptix_rank_authority_owner','SET')
     or exists (
       select 1 from pg_catalog.pg_auth_members am
       join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
       join pg_catalog.pg_roles member_role on member_role.oid=am.member
       join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
       where granted_role.rolname='koaptix_rank_authority_owner'
         and member_role.rolname='postgres' and grantor_role.rolname='postgres'
     ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_PRE_AUTHORITY_MEMBERSHIP';
  end if;
  if pg_catalog.has_column_privilege(
       'postgres','public.koaptix_rank_input_authority_manifest','run_id','REFERENCES'
     ) or pg_catalog.has_function_privilege(
       'postgres','public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_PRE_OBJECT_PRIVILEGE';
  end if;
  if (select pg_catalog.pg_get_userbyid(c.relowner)
      from pg_catalog.pg_class c
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass)
       is distinct from 'koaptix_rank_authority_owner'
     or (select pg_catalog.pg_get_userbyid(p.proowner)
         from pg_catalog.pg_proc p
         where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure)
       is distinct from 'koaptix_rank_authority_owner' then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_PRE_OWNER';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and coalesce(pg_catalog.array_ndims(
            coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_01';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid=a.attrelid
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and a.attname='run_id' and not a.attisdropped
      and coalesce(pg_catalog.array_ndims(coalesce(a.attacl,'{}'::aclitem[])),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_02';
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
      and coalesce(pg_catalog.array_ndims(
            coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_03';
  end if;

  create temporary table pg_temp.koaptix_m903_statement3_acl_baseline
  on commit drop as
  with normalized_acl (
    object_kind,object_identity,column_identity,grantor_role,grantee_role,
    privilege_type,is_grantable
  ) as (
    select 'TABLE'::text,'public.koaptix_rank_input_authority_manifest'::text,
           null::text,grantor.rolname::text,
           coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
           acl.is_grantable
    from pg_catalog.pg_class c
    cross join lateral pg_catalog.unnest(
      coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
    left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
    union all
    select 'COLUMN','public.koaptix_rank_input_authority_manifest','run_id',
           grantor.rolname::text,coalesce(grantee.rolname,'PUBLIC')::text,
           acl.privilege_type::text,acl.is_grantable
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid=a.attrelid
    cross join lateral pg_catalog.unnest(coalesce(a.attacl,'{}'::aclitem[]))
      with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
    left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and a.attname='run_id' and not a.attisdropped
    union all
    select 'FUNCTION','public.koaptix_text_array_is_distinct_nonblank(text[])',
           null::text,grantor.rolname::text,
           coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
           acl.is_grantable
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.unnest(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
    left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
    where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
  )
  select * from normalized_acl;
  select not exists (
    select 1 from pg_temp.koaptix_m903_statement3_acl_baseline
    where object_kind='TABLE'
  ) or not exists (
    select 1 from pg_temp.koaptix_m903_statement3_acl_baseline
    where object_kind='FUNCTION'
  ) into v_mismatch;
  if v_mismatch then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_BASELINE_CAPTURE';
  end if;
end;
$koaptix_m903_statement3_authority_pre$;

grant koaptix_rank_authority_owner to postgres
  with admin false, inherit false, set true granted by postgres;

do $koaptix_m903_statement3_authority_membership$
begin
  if not pg_catalog.pg_has_role('postgres','koaptix_rank_authority_owner','SET')
     or not exists (
       select 1 from pg_catalog.pg_auth_members am
       join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
       join pg_catalog.pg_roles member_role on member_role.oid=am.member
       join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
       where granted_role.rolname='koaptix_rank_authority_owner'
         and member_role.rolname='postgres' and grantor_role.rolname='postgres'
         and not am.admin_option and not am.inherit_option and am.set_option
     ) or (select count(*) from pg_catalog.pg_auth_members am
       join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
       join pg_catalog.pg_roles member_role on member_role.oid=am.member
       where granted_role.rolname in (
         'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
         'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
         'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
         'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
         'koaptix_rank_publication_rollback'
       ) and member_role.rolname='postgres')<>10 then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_ACTIVE_MEMBERSHIP';
  end if;
end;
$koaptix_m903_statement3_authority_membership$;

set local role koaptix_rank_authority_owner;

do $koaptix_m903_statement3_authority_role$
begin
  if current_user<>'koaptix_rank_authority_owner' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_AUTHORITY_ROLE';
  end if;
end;
$koaptix_m903_statement3_authority_role$;

grant references(run_id) on table public.koaptix_rank_input_authority_manifest
  to postgres granted by koaptix_rank_authority_owner;
grant execute on function public.koaptix_text_array_is_distinct_nonblank(text[])
  to postgres granted by koaptix_rank_authority_owner;

reset role;

do $koaptix_m903_statement3_authority_active$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or not pg_catalog.has_column_privilege(
       'postgres','public.koaptix_rank_input_authority_manifest','run_id','REFERENCES'
     ) or not pg_catalog.has_function_privilege(
       'postgres','public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
  ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_ACTIVE_OBJECT_PRIVILEGE';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and coalesce(pg_catalog.array_ndims(
            coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_04';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid=a.attrelid
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and a.attname='run_id' and not a.attisdropped
      and coalesce(pg_catalog.array_ndims(coalesce(a.attacl,'{}'::aclitem[])),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_05';
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
      and coalesce(pg_catalog.array_ndims(
            coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_06';
  end if;
  if exists (
    with current_acl (
      object_kind,object_identity,column_identity,grantor_role,grantee_role,
      privilege_type,is_grantable
    ) as (
      select 'TABLE'::text,'public.koaptix_rank_input_authority_manifest'::text,
             null::text,grantor.rolname::text,
             coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
             acl.is_grantable
      from pg_catalog.pg_class c
      cross join lateral pg_catalog.unnest(
        coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      union all
      select 'COLUMN','public.koaptix_rank_input_authority_manifest','run_id',
             grantor.rolname::text,coalesce(grantee.rolname,'PUBLIC')::text,
             acl.privilege_type::text,acl.is_grantable
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid=a.attrelid
      cross join lateral pg_catalog.unnest(coalesce(a.attacl,'{}'::aclitem[]))
        with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
        and a.attname='run_id' and not a.attisdropped
      union all
      select 'FUNCTION','public.koaptix_text_array_is_distinct_nonblank(text[])',
             null::text,grantor.rolname::text,
             coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
             acl.is_grantable
      from pg_catalog.pg_proc p
      cross join lateral pg_catalog.unnest(
        coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
    ), expected_added (
      object_kind,object_identity,column_identity,grantor_role,grantee_role,
      privilege_type,is_grantable
    ) as (
      values
        ('COLUMN'::text,'public.koaptix_rank_input_authority_manifest'::text,
         'run_id'::text,'koaptix_rank_authority_owner'::text,'postgres'::text,
         'REFERENCES'::text,false),
        ('FUNCTION'::text,'public.koaptix_text_array_is_distinct_nonblank(text[])'::text,
         null::text,'koaptix_rank_authority_owner'::text,'postgres'::text,
         'EXECUTE'::text,false)
    ), actual_added as (
      select * from current_acl
      except all
      select * from pg_temp.koaptix_m903_statement3_acl_baseline
    ), removed as (
      select * from pg_temp.koaptix_m903_statement3_acl_baseline
      except all
      select * from current_acl
    ), mismatch as (
      (select * from actual_added except all select * from expected_added)
      union all
      (select * from expected_added except all select * from actual_added)
      union all
      select * from removed
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_ACTIVE_ACL_DELTA';
  end if;
end;
$koaptix_m903_statement3_authority_active$;

create table public.koaptix_latest_board_generation (
  generation_id uuid primary key,
  run_id text not null unique check (btrim(run_id)<>''),
  plan_run_id text not null check (btrim(plan_run_id)<>''),
  source_authority_kind text not null check (
    source_authority_kind in ('BOOTSTRAP_COMPATIBILITY_BUNDLE','SEALED_RANK_INPUT_MANIFEST')
  ),
  source_authority_key text not null check (btrim(source_authority_key)<>''),
  input_manifest_run_id text null
    references public.koaptix_rank_input_authority_manifest(run_id),
  affected_rank_date date null,
  affected_universe_codes text[] not null,
  required_surface_codes text[] not null check (
    required_surface_codes=array['GLOBAL_LATEST','UNIVERSE_SERVICE']::text[]
  ),
  surface_count integer not null check (surface_count=2),
  total_component_row_count bigint not null check (total_component_row_count>0),
  combined_surface_manifest_sha256 text not null unique check (
    combined_surface_manifest_sha256 ~ '^[0-9A-F]{64}$'
  ),
  generated_at timestamptz not null,
  verified_at timestamptz not null check (verified_at>=generated_at),
  unique(source_authority_kind,source_authority_key),
  check (
    (source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE'
      and source_authority_key='BOOTSTRAP_COMPATIBILITY_BUNDLE_V1'
      and input_manifest_run_id is null
      and affected_rank_date is null
      and affected_universe_codes=array[]::text[])
    or
    (source_authority_kind='SEALED_RANK_INPUT_MANIFEST'
      and input_manifest_run_id is not null
      and affected_rank_date is not null
      and source_authority_key=input_manifest_run_id
      and public.koaptix_text_array_is_distinct_nonblank(affected_universe_codes))
  )
);

set local role koaptix_rank_authority_owner;

revoke references(run_id) on table public.koaptix_rank_input_authority_manifest
  from postgres granted by koaptix_rank_authority_owner restrict;
revoke execute on function public.koaptix_text_array_is_distinct_nonblank(text[])
  from postgres granted by koaptix_rank_authority_owner restrict;

reset role;

revoke koaptix_rank_authority_owner from postgres granted by postgres restrict;

do $koaptix_m903_statement3_authority_post$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or pg_catalog.pg_has_role('postgres','koaptix_rank_authority_owner','SET')
     or pg_catalog.has_column_privilege(
       'postgres','public.koaptix_rank_input_authority_manifest','run_id','REFERENCES'
     ) or pg_catalog.has_function_privilege(
       'postgres','public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_POST_AUTHORITY_STATE';
  end if;
  if exists (
    with protected_role(role_name) as (
      values
        ('koaptix_rank_authority_owner'),('koaptix_rank_publication_owner'),
        ('koaptix_rank_authority_reader'),('koaptix_rank_manifest_sealer'),
        ('koaptix_rank_manifest_revoker'),('koaptix_rank_bootstrap_seeder'),
        ('koaptix_rank_generation_builder'),('koaptix_rank_generation_publisher'),
        ('koaptix_rank_publication_rollback')
    ), expected (
      granted_role_name,member_role_name,grantor_role_name,
      admin_option,inherit_option,set_option
    ) as (
      select role_name,'postgres'::text,'supabase_admin'::text,true,false,false
      from protected_role
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
      where granted_role.rolname in (select role_name from protected_role)
         or member_role.rolname in (select role_name from protected_role)
    ), mismatch as (
      (select * from expected except all select * from actual)
      union all
      (select * from actual except all select * from expected)
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_POST_MEMBERSHIP_GRAPH';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and coalesce(pg_catalog.array_ndims(
            coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_07';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid=a.attrelid
    where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      and a.attname='run_id' and not a.attisdropped
      and coalesce(pg_catalog.array_ndims(coalesce(a.attacl,'{}'::aclitem[])),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_08';
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
      and coalesce(pg_catalog.array_ndims(
            coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_09';
  end if;
  if exists (
    with current_acl (
      object_kind,object_identity,column_identity,grantor_role,grantee_role,
      privilege_type,is_grantable
    ) as (
      select 'TABLE'::text,'public.koaptix_rank_input_authority_manifest'::text,
             null::text,grantor.rolname::text,
             coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
             acl.is_grantable
      from pg_catalog.pg_class c
      cross join lateral pg_catalog.unnest(
        coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
      union all
      select 'COLUMN','public.koaptix_rank_input_authority_manifest','run_id',
             grantor.rolname::text,coalesce(grantee.rolname,'PUBLIC')::text,
             acl.privilege_type::text,acl.is_grantable
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid=a.attrelid
      cross join lateral pg_catalog.unnest(coalesce(a.attacl,'{}'::aclitem[]))
        with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass
        and a.attname='run_id' and not a.attisdropped
      union all
      select 'FUNCTION','public.koaptix_text_array_is_distinct_nonblank(text[])',
             null::text,grantor.rolname::text,
             coalesce(grantee.rolname,'PUBLIC')::text,acl.privilege_type::text,
             acl.is_grantable
      from pg_catalog.pg_proc p
      cross join lateral pg_catalog.unnest(
        coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
      left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
      where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
    ), mismatch as (
      (select * from current_acl
       except all select * from pg_temp.koaptix_m903_statement3_acl_baseline)
      union all
      (select * from pg_temp.koaptix_m903_statement3_acl_baseline
       except all select * from current_acl)
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_POST_ACL_RESTORATION';
  end if;
  if (select pg_catalog.pg_get_userbyid(c.relowner)
      from pg_catalog.pg_class c
      where c.oid='public.koaptix_rank_input_authority_manifest'::regclass)
       is distinct from 'koaptix_rank_authority_owner'
     or (select pg_catalog.pg_get_userbyid(p.proowner)
         from pg_catalog.pg_proc p
         where p.oid='public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure)
       is distinct from 'koaptix_rank_authority_owner'
     or (select pg_catalog.pg_get_userbyid(c.relowner)
         from pg_catalog.pg_class c
         where c.oid='public.koaptix_latest_board_generation'::regclass)
       is distinct from 'postgres' then
    raise exception using errcode='P0001',message='M903_STATEMENT3_BRIDGE_POST_OWNER';
  end if;
end;
$koaptix_m903_statement3_authority_post$;

drop table pg_temp.koaptix_m903_statement3_acl_baseline;
-- KOAPTIX_M903_STATEMENT3_AUTHORITY_BRIDGE_END

create table public.koaptix_latest_board_generation_surface (
  generation_id uuid not null,
  surface_code text not null check (surface_code in ('GLOBAL_LATEST','UNIVERSE_SERVICE')),
  snapshot_date date null,
  previous_snapshot_date date null,
  date_vector_sha256 text null check (
    date_vector_sha256 is null or date_vector_sha256 ~ '^[0-9A-F]{64}$'
  ),
  universe_count integer not null check (universe_count>0),
  row_count bigint not null check (row_count>0),
  full_row_digest_sha256 text not null check (full_row_digest_sha256 ~ '^[0-9A-F]{64}$'),
  component_manifest_sha256 text not null check (component_manifest_sha256 ~ '^[0-9A-F]{64}$'),
  primary key(generation_id,surface_code),
  unique(generation_id,surface_code,snapshot_date),
  constraint koaptix_generation_surface_parent_fk
    foreign key(generation_id)
    references public.koaptix_latest_board_generation(generation_id)
    deferrable initially deferred,
  check (
    (surface_code='GLOBAL_LATEST' and snapshot_date is not null
      and date_vector_sha256 is null and universe_count=1
      and (previous_snapshot_date is null or previous_snapshot_date<snapshot_date))
    or
    (surface_code='UNIVERSE_SERVICE' and snapshot_date is null
      and previous_snapshot_date is null and date_vector_sha256 is not null)
  )
);

create table public.koaptix_latest_board_generation_universe (
  generation_id uuid not null,
  surface_code text not null default 'UNIVERSE_SERVICE' check (surface_code='UNIVERSE_SERVICE'),
  universe_code text not null check (btrim(universe_code)<>''),
  snapshot_date date not null,
  previous_snapshot_date date null,
  expected_row_count bigint not null check (expected_row_count>0),
  row_digest_sha256 text not null check (row_digest_sha256 ~ '^[0-9A-F]{64}$'),
  primary key(generation_id,surface_code,universe_code),
  unique(generation_id,surface_code,universe_code,snapshot_date),
  constraint koaptix_generation_universe_surface_fk
    foreign key(generation_id,surface_code)
    references public.koaptix_latest_board_generation_surface(generation_id,surface_code)
    deferrable initially deferred,
  check (previous_snapshot_date is null or previous_snapshot_date<snapshot_date)
);

create table public.koaptix_latest_board_generation_row (
  generation_id uuid not null,
  surface_code text not null default 'UNIVERSE_SERVICE' check (surface_code='UNIVERSE_SERVICE'),
  snapshot_date date not null,
  universe_code text not null,
  universe_name text null,
  universe_scope text null,
  complex_id bigint not null,
  apt_name_ko text null,
  sigungu_name text null,
  legal_dong_name text null,
  build_year integer null,
  household_count integer null,
  total_household_count integer null,
  recovery_52w text null,
  rank_all integer not null check (rank_all>0),
  previous_rank_all integer null check (previous_rank_all is null or previous_rank_all>0),
  rank_delta_w integer null,
  rank_movement text not null check (rank_movement in ('NEW','UP','DOWN','SAME')),
  market_cap_krw bigint null,
  market_cap_trillion_krw numeric null,
  market_cap_share numeric null,
  market_cap_share_pct numeric null,
  tier_code text not null check (tier_code in ('S','A','B','C','D','E')),
  tier_label text null,
  tier_sort integer not null check (tier_sort between 1 and 6),
  is_top1000 boolean not null,
  source_previous_snapshot_date date null,
  generated_at timestamptz not null,
  refresh_run_id text not null check (btrim(refresh_run_id)<>''),
  primary key(generation_id,surface_code,universe_code,complex_id),
  unique(generation_id,surface_code,universe_code,rank_all),
  constraint koaptix_generation_service_row_universe_fk
    foreign key(generation_id,surface_code,universe_code,snapshot_date)
    references public.koaptix_latest_board_generation_universe
      (generation_id,surface_code,universe_code,snapshot_date)
    deferrable initially deferred
);

create table public.koaptix_latest_board_generation_global_row (
  generation_id uuid not null,
  surface_code text not null default 'GLOBAL_LATEST' check (surface_code='GLOBAL_LATEST'),
  snapshot_date date not null,
  universe_code text not null check (universe_code='KOREA_ALL'),
  complex_id bigint not null,
  apt_name_ko text null,
  address_road text null,
  address_jibun text null,
  legal_dong_name text null,
  build_year integer null,
  sigungu_code text null,
  sigungu_name text null,
  rank_all integer not null check (rank_all>0),
  tier_code text null,
  tier_label text null,
  tier_sort integer null,
  market_cap_krw bigint not null,
  market_cap_trillion_krw numeric null,
  market_cap_share numeric null,
  market_cap_share_pct numeric null,
  previous_rank_all integer null,
  rank_delta_1d integer null,
  rank_movement text null,
  is_top1000 boolean null,
  total_household_count integer null,
  household_count integer null,
  priced_household_count integer null,
  priced_household_ratio numeric null,
  total_cluster_count integer null,
  priced_cluster_count integer null,
  coverage_status text null,
  is_rank_eligible boolean null,
  eligibility_status text null,
  latitude numeric null,
  longitude numeric null,
  recovery_52w text null,
  primary key(generation_id,surface_code,complex_id),
  unique(generation_id,surface_code,rank_all),
  constraint koaptix_generation_global_row_surface_fk
    foreign key(generation_id,surface_code,snapshot_date)
    references public.koaptix_latest_board_generation_surface
      (generation_id,surface_code,snapshot_date)
    deferrable initially deferred
);

create table public.koaptix_rank_publication_history_stage (
  generation_id uuid not null,
  snapshot_date date not null,
  complex_id bigint not null,
  market_cap_krw bigint not null,
  rank_all integer not null check (rank_all>0),
  total_market_cap bigint not null,
  primary key(generation_id,snapshot_date,complex_id),
  unique(generation_id,snapshot_date,rank_all),
  constraint koaptix_history_stage_generation_fk
    foreign key(generation_id)
    references public.koaptix_latest_board_generation(generation_id)
    deferrable initially deferred
);

create table public.koaptix_rank_publication_snapshot_stage (
  generation_id uuid not null,
  snapshot_date date not null,
  universe_code text not null,
  complex_id bigint not null,
  rank_all integer not null check (rank_all>0),
  market_cap_krw bigint not null,
  market_cap_share numeric(12,8) null,
  previous_rank_all integer null,
  rank_delta_1d integer null,
  is_top1000 boolean not null,
  rank_method text not null check (btrim(rank_method)<>''),
  calculation_version text not null check (btrim(calculation_version)<>''),
  created_at timestamptz not null,
  primary key(generation_id,snapshot_date,universe_code,complex_id),
  unique(generation_id,snapshot_date,universe_code,rank_all),
  constraint koaptix_snapshot_stage_generation_fk
    foreign key(generation_id)
    references public.koaptix_latest_board_generation(generation_id)
    deferrable initially deferred
);

create table public.koaptix_latest_board_publication_event (
  publication_version bigint primary key check (publication_version>0),
  event_id uuid not null unique,
  event_type text not null check (event_type in ('PUBLISH','ROLLBACK')),
  from_generation_id uuid null references public.koaptix_latest_board_generation(generation_id),
  to_generation_id uuid not null references public.koaptix_latest_board_generation(generation_id),
  plan_run_id text not null check (btrim(plan_run_id)<>''),
  execution_run_id text not null unique check (btrim(execution_run_id)<>''),
  expected_previous_version bigint not null check (expected_previous_version>=0),
  recorded_at timestamptz not null,
  unique(event_id,publication_version,to_generation_id,recorded_at),
  check (publication_version=expected_previous_version+1),
  check (from_generation_id is distinct from to_generation_id),
  check (event_type<>'ROLLBACK' or from_generation_id is not null)
);

create table public.koaptix_latest_board_publication (
  singleton_id boolean primary key default true check (singleton_id),
  active_event_id uuid not null,
  active_generation_id uuid not null references public.koaptix_latest_board_generation(generation_id),
  previous_generation_id uuid null references public.koaptix_latest_board_generation(generation_id),
  publication_version bigint not null unique check (publication_version>0),
  published_at timestamptz not null,
  constraint koaptix_publication_event_tuple_fk
    foreign key(active_event_id,publication_version,active_generation_id,published_at)
    references public.koaptix_latest_board_publication_event
      (event_id,publication_version,to_generation_id,recorded_at),
  check (previous_generation_id is null or previous_generation_id<>active_generation_id)
);

create index koaptix_generation_service_rank_idx
  on public.koaptix_latest_board_generation_row
  (generation_id,surface_code,universe_code,rank_all,complex_id);
create index koaptix_generation_service_date_idx
  on public.koaptix_latest_board_generation_row
  (generation_id,surface_code,snapshot_date,universe_code);
create index koaptix_generation_global_rank_idx
  on public.koaptix_latest_board_generation_global_row
  (generation_id,surface_code,rank_all,complex_id);

-- KOAPTIX_M903_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_BEGIN
do $koaptix_m903_owner_bootstrap_pre$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_PRE_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_PRE_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_PRE_TARGET_STATE';
    end if;
  end loop;
end;
$koaptix_m903_owner_bootstrap_pre$;

grant koaptix_rank_publication_owner to postgres with admin false, inherit false, set true granted by postgres;

do $koaptix_m903_owner_bootstrap_membership$
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_ACTIVE_MEMBERSHIP_GRAPH';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.pg_has_role('postgres',v_role,'SET') then
      raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_SET_OPTION';
    end if;
  end loop;
end;
$koaptix_m903_owner_bootstrap_membership$;

grant create on schema public to koaptix_rank_publication_owner;

do $koaptix_m903_owner_bootstrap_schema$
declare
  v_target_roles constant text[]:=array['koaptix_rank_publication_owner'];
  v_role text;
begin
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or not pg_catalog.has_schema_privilege(v_role,'public','CREATE') then
      raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_10';
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL_EXPANSION';
  end if;
end;
$koaptix_m903_owner_bootstrap_schema$;

alter table public.koaptix_latest_board_generation owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_generation_surface owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_generation_universe owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_generation_row owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_generation_global_row owner to koaptix_rank_publication_owner;
alter table public.koaptix_rank_publication_history_stage owner to koaptix_rank_publication_owner;
alter table public.koaptix_rank_publication_snapshot_stage owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_publication_event owner to koaptix_rank_publication_owner;
alter table public.koaptix_latest_board_publication owner to koaptix_rank_publication_owner;

set local role koaptix_rank_publication_owner;

alter table public.koaptix_latest_board_generation force row level security;
alter table public.koaptix_latest_board_generation_surface force row level security;
alter table public.koaptix_latest_board_generation_universe force row level security;
alter table public.koaptix_latest_board_generation_row force row level security;
alter table public.koaptix_latest_board_generation_global_row force row level security;
alter table public.koaptix_rank_publication_history_stage force row level security;
alter table public.koaptix_rank_publication_snapshot_stage force row level security;
alter table public.koaptix_latest_board_publication_event force row level security;
alter table public.koaptix_latest_board_publication force row level security;

do $rls$
declare
  v_table text;
  v_policy text;
begin
  for v_table,v_policy in
    select * from (values
      ('koaptix_latest_board_generation','koaptix_rank_pub_owner_all_gen'),
      ('koaptix_latest_board_generation_surface','koaptix_rank_pub_owner_all_surface'),
      ('koaptix_latest_board_generation_universe','koaptix_rank_pub_owner_all_universe'),
      ('koaptix_latest_board_generation_row','koaptix_rank_pub_owner_all_service_row'),
      ('koaptix_latest_board_generation_global_row','koaptix_rank_pub_owner_all_global_row'),
      ('koaptix_rank_publication_history_stage','koaptix_rank_pub_owner_all_history_stage'),
      ('koaptix_rank_publication_snapshot_stage','koaptix_rank_pub_owner_all_snapshot_stage'),
      ('koaptix_latest_board_publication_event','koaptix_rank_pub_owner_all_event'),
      ('koaptix_latest_board_publication','koaptix_rank_pub_owner_all_pointer')
    ) v(table_name,policy_name)
  loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format(
      'create policy %I on public.%I for all to koaptix_rank_publication_owner using (true) with check (true)',
      v_policy,v_table
    );
  end loop;
end;
$rls$;

create policy koaptix_rank_authority_owner_select_generation
  on public.koaptix_latest_board_generation
  for select to koaptix_rank_authority_owner using (true);
create policy koaptix_rank_authority_owner_select_publication
  on public.koaptix_latest_board_publication
  for select to koaptix_rank_authority_owner using (true);
create policy koaptix_rank_authority_owner_update_publication
  on public.koaptix_latest_board_publication
  for update to koaptix_rank_authority_owner using (true) with check (true);

grant select on public.koaptix_latest_board_generation to koaptix_rank_authority_owner;
grant select,update on public.koaptix_latest_board_publication to koaptix_rank_authority_owner;

reset role;

create or replace function public.koaptix_jsonb_has_exact_keys(p_object jsonb,p_keys text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select jsonb_typeof(p_object)='object'
     and coalesce((select array_agg(k order by k) from jsonb_object_keys(p_object) k),array[]::text[])
         = (select array_agg(k order by k) from unnest(p_keys) k);
$function$;

create or replace function public.koaptix_compact_jsonb_array(p_array jsonb)
returns text
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select '[' || coalesce(string_agg(value::text,',' order by ordinal), '') || ']'
  from jsonb_array_elements(p_array) with ordinality e(value,ordinal);
$function$;

create or replace function public.koaptix_service_rows_digest(
  p_generation_id uuid,
  p_universe_code text default null
)
returns text
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  with canonical as (
    select public.koaptix_compact_jsonb_array(jsonb_build_array(
      r.snapshot_date::text,r.universe_code,r.universe_name,r.universe_scope,
      r.complex_id,r.apt_name_ko,r.sigungu_name,r.legal_dong_name,r.build_year,
      r.household_count,r.total_household_count,r.recovery_52w,r.rank_all,
      r.previous_rank_all,r.rank_delta_w,r.rank_movement,r.market_cap_krw,
      r.market_cap_trillion_krw::text,r.market_cap_share::text,
      r.market_cap_share_pct::text,r.tier_code,r.tier_label,r.tier_sort,r.is_top1000
    )) as row_json,
    r.snapshot_date,r.universe_code,r.rank_all,r.complex_id
    from public.koaptix_latest_board_generation_row r
    where r.generation_id=p_generation_id
      and (p_universe_code is null or r.universe_code=p_universe_code)
  )
  select upper(encode(sha256(convert_to(
    public.koaptix_compact_jsonb_array(jsonb_build_array(
      'snapshot_date','universe_code','universe_name','universe_scope','complex_id',
      'apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count',
      'total_household_count','recovery_52w','rank_all','previous_rank_all','rank_delta_w',
      'rank_movement','market_cap_krw','market_cap_trillion_krw','market_cap_share',
      'market_cap_share_pct','tier_code','tier_label','tier_sort','is_top1000'
    )) || E'\n' ||
    coalesce(string_agg(row_json || E'\n','' order by snapshot_date,universe_code,rank_all,complex_id),'')
  ,'UTF8')),'hex'))
  from canonical;
$function$;

create or replace function public.koaptix_global_rows_digest(p_generation_id uuid)
returns text
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  with canonical as (
    select public.koaptix_compact_jsonb_array(jsonb_build_array(
      r.snapshot_date::text,r.universe_code,r.complex_id,r.apt_name_ko,r.address_road,
      r.address_jibun,r.legal_dong_name,r.build_year,r.sigungu_code,r.sigungu_name,
      r.rank_all,r.tier_code,r.tier_label,r.tier_sort,r.market_cap_krw,
      r.market_cap_trillion_krw::text,r.market_cap_share::text,
      r.market_cap_share_pct::text,r.previous_rank_all,r.rank_delta_1d,r.rank_movement,
      r.is_top1000,r.total_household_count,r.household_count,r.priced_household_count,
      r.priced_household_ratio::text,r.total_cluster_count,r.priced_cluster_count,
      r.coverage_status,r.is_rank_eligible,r.eligibility_status,r.latitude::text,
      r.longitude::text,r.recovery_52w
    )) as row_json,
    r.snapshot_date,r.universe_code,r.rank_all,r.complex_id
    from public.koaptix_latest_board_generation_global_row r
    where r.generation_id=p_generation_id
  )
  select upper(encode(sha256(convert_to(
    public.koaptix_compact_jsonb_array(jsonb_build_array(
      'snapshot_date','universe_code','complex_id','apt_name_ko','address_road',
      'address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name',
      'rank_all','tier_code','tier_label','tier_sort','market_cap_krw',
      'market_cap_trillion_krw','market_cap_share','market_cap_share_pct',
      'previous_rank_all','rank_delta_1d','rank_movement','is_top1000',
      'total_household_count','household_count','priced_household_count',
      'priced_household_ratio','total_cluster_count','priced_cluster_count',
      'coverage_status','is_rank_eligible','eligibility_status','latitude','longitude',
      'recovery_52w'
    )) || E'\n' ||
    coalesce(string_agg(row_json || E'\n','' order by snapshot_date,universe_code,rank_all,complex_id),'')
  ,'UTF8')),'hex'))
  from canonical;
$function$;

create or replace function public.koaptix_service_date_vector_digest(p_generation_id uuid)
returns text
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  with vector_rows as (
    select u.universe_code,u.snapshot_date,u.previous_snapshot_date,u.expected_row_count,
           min(r.rank_all)::integer as min_rank,max(r.rank_all)::integer as max_rank
    from public.koaptix_latest_board_generation_universe u
    join public.koaptix_latest_board_generation_row r
      on r.generation_id=u.generation_id and r.surface_code=u.surface_code
     and r.universe_code=u.universe_code and r.snapshot_date=u.snapshot_date
    where u.generation_id=p_generation_id
    group by u.universe_code,u.snapshot_date,u.previous_snapshot_date,u.expected_row_count
  ), canonical as (
    select '{"max_rank":'||to_jsonb(max_rank)::text||
           ',"min_rank":'||to_jsonb(min_rank)::text||
           ',"previous_date":'||coalesce(to_jsonb(previous_snapshot_date::text)::text,'null')||
           ',"row_count":'||to_jsonb(expected_row_count)::text||
           ',"snapshot_date":'||to_jsonb(snapshot_date::text)::text||
           ',"universe_code":'||to_jsonb(universe_code)::text||'}' as item,
           universe_code
    from vector_rows
  )
  select upper(encode(sha256(convert_to(
    '['||coalesce(string_agg(item,',' order by universe_code),'')||']','UTF8'
  )),'hex'))
  from canonical;
$function$;

create or replace function public.koaptix_reject_latest_board_immutable_mutation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
begin
  raise exception 'latest-board generation, stage, and event rows are immutable';
end;
$function$;

set local role koaptix_rank_publication_owner;

create trigger trg_koaptix_latest_board_generation_immutable
before update or delete on public.koaptix_latest_board_generation
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_latest_board_generation_surface_immutable
before update or delete on public.koaptix_latest_board_generation_surface
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_latest_board_generation_universe_immutable
before update or delete on public.koaptix_latest_board_generation_universe
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_latest_board_generation_row_immutable
before update or delete on public.koaptix_latest_board_generation_row
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_latest_board_generation_global_row_immutable
before update or delete on public.koaptix_latest_board_generation_global_row
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_rank_publication_history_stage_immutable
before update or delete on public.koaptix_rank_publication_history_stage
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_rank_publication_snapshot_stage_immutable
before update or delete on public.koaptix_rank_publication_snapshot_stage
for each row execute function public.koaptix_reject_latest_board_immutable_mutation();
create trigger trg_koaptix_latest_board_publication_event_immutable
  before update or delete on public.koaptix_latest_board_publication_event
  for each row execute function public.koaptix_reject_latest_board_immutable_mutation();

reset role;

create or replace function public.koaptix_compact_jsonb_object(p_object jsonb)
returns text
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select '{' || coalesce(
    string_agg(to_jsonb(key)::text || ':' || value::text,',' order by key),''
  ) || '}'
  from jsonb_each(p_object);
$function$;

create or replace function public.koaptix_jsonb_array_has_exact_object_keys(
  p_array jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select jsonb_typeof(p_array)='array'
     and not exists (
       select 1
       from jsonb_array_elements(p_array) item(value)
       where jsonb_typeof(value)<>'object'
          or not public.koaptix_jsonb_has_exact_keys(value,p_keys)
     );
$function$;

create or replace function public.koaptix_generation_surface_components_json(
  p_generation_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'surface_code',s.surface_code,
    'snapshot_date',s.snapshot_date,
    'previous_snapshot_date',s.previous_snapshot_date,
    'date_vector_sha256',s.date_vector_sha256,
    'universe_count',s.universe_count,
    'row_count',s.row_count,
    'full_row_digest_sha256',s.full_row_digest_sha256,
    'component_manifest_sha256',s.component_manifest_sha256
  ) order by s.surface_code),'[]'::jsonb)
  from public.koaptix_latest_board_generation_surface s
  where s.generation_id=p_generation_id;
$function$;

create or replace function public.koaptix_surface_component_manifest_digest(
  p_generation_id uuid,
  p_surface_code text
)
returns text
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  select upper(encode(sha256(convert_to(
    public.koaptix_compact_jsonb_object(jsonb_build_object(
      'date_vector_sha256',s.date_vector_sha256,
      'full_row_digest_sha256',s.full_row_digest_sha256,
      'row_count',s.row_count,
      'snapshot_date',s.snapshot_date,
      'surface_code',s.surface_code,
      'universe_count',s.universe_count
    )),'UTF8'
  )),'hex'))
  from public.koaptix_latest_board_generation_surface s
  where s.generation_id=p_generation_id and s.surface_code=p_surface_code;
$function$;

create or replace function public.koaptix_combined_surface_manifest_digest(
  p_generation_id uuid
)
returns text
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
  with canonical as (
    select s.surface_code,
           public.koaptix_compact_jsonb_object(jsonb_build_object(
             'date_vector_sha256',s.date_vector_sha256,
             'full_row_digest_sha256',s.full_row_digest_sha256,
             'row_count',s.row_count,
             'snapshot_date',s.snapshot_date,
             'surface_code',s.surface_code,
             'universe_count',s.universe_count
           )) as item
    from public.koaptix_latest_board_generation_surface s
    where s.generation_id=p_generation_id
  )
  select upper(encode(sha256(convert_to(
    '['||coalesce(string_agg(item,',' order by surface_code),'')||']','UTF8'
  )),'hex'))
  from canonical;
$function$;

create or replace function public.koaptix_verify_latest_board_generation(
  p_generation_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_generation public.koaptix_latest_board_generation%rowtype;
  v_global public.koaptix_latest_board_generation_surface%rowtype;
  v_service public.koaptix_latest_board_generation_surface%rowtype;
  v_universe record;
  v_surface_count bigint;
  v_row_count bigint;
  v_min_rank integer;
  v_max_rank integer;
  v_digest text;
  v_combined text;
  v_target_codes text[];
  v_korea_previous date;
begin
  select * into strict v_generation
  from public.koaptix_latest_board_generation
  where generation_id=p_generation_id;

  select count(*),array_agg(surface_code order by surface_code)
    into v_surface_count,v_target_codes
  from public.koaptix_latest_board_generation_surface
  where generation_id=p_generation_id;
  if v_surface_count<>2
     or v_target_codes<>array['GLOBAL_LATEST','UNIVERSE_SERVICE']::text[]
     or v_generation.required_surface_codes<>
        array['GLOBAL_LATEST','UNIVERSE_SERVICE']::text[]
     or v_generation.surface_count<>2 then
    raise exception 'generation % does not contain exactly the two required surfaces',p_generation_id;
  end if;

  select * into strict v_global
  from public.koaptix_latest_board_generation_surface
  where generation_id=p_generation_id and surface_code='GLOBAL_LATEST';
  select * into strict v_service
  from public.koaptix_latest_board_generation_surface
  where generation_id=p_generation_id and surface_code='UNIVERSE_SERVICE';

  select count(*),min(rank_all),max(rank_all)
    into v_row_count,v_min_rank,v_max_rank
  from public.koaptix_latest_board_generation_global_row
  where generation_id=p_generation_id and surface_code='GLOBAL_LATEST';
  v_digest:=public.koaptix_global_rows_digest(p_generation_id);
  if v_row_count<>v_global.row_count
     or v_min_rank<>1 or v_max_rank<>v_row_count
     or v_digest is distinct from v_global.full_row_digest_sha256
     or exists (
       select 1 from public.koaptix_latest_board_generation_global_row r
       where r.generation_id=p_generation_id
         and (r.snapshot_date is distinct from v_global.snapshot_date
              or r.universe_code<>'KOREA_ALL')
     ) then
    raise exception 'GLOBAL_LATEST count, rank, date, or digest mismatch for generation %',p_generation_id;
  end if;

  select count(*) into v_row_count
  from public.koaptix_latest_board_generation_universe
  where generation_id=p_generation_id and surface_code='UNIVERSE_SERVICE';
  if v_row_count<>v_service.universe_count then
    raise exception 'UNIVERSE_SERVICE universe count mismatch for generation %',p_generation_id;
  end if;

  select count(*) into v_row_count
  from public.koaptix_latest_board_generation_row
  where generation_id=p_generation_id and surface_code='UNIVERSE_SERVICE';
  v_digest:=public.koaptix_service_rows_digest(p_generation_id,null);
  if v_row_count<>v_service.row_count
     or v_digest is distinct from v_service.full_row_digest_sha256 then
    raise exception 'UNIVERSE_SERVICE row count or full digest mismatch for generation %',p_generation_id;
  end if;

  for v_universe in
    select *
    from public.koaptix_latest_board_generation_universe
    where generation_id=p_generation_id and surface_code='UNIVERSE_SERVICE'
    order by universe_code
  loop
    select count(*),min(rank_all),max(rank_all)
      into v_row_count,v_min_rank,v_max_rank
    from public.koaptix_latest_board_generation_row r
    where r.generation_id=p_generation_id
      and r.surface_code='UNIVERSE_SERVICE'
      and r.universe_code=v_universe.universe_code;
    v_digest:=public.koaptix_service_rows_digest(
      p_generation_id,v_universe.universe_code
    );
    if v_row_count<>v_universe.expected_row_count
       or v_min_rank<>1 or v_max_rank<>v_row_count
       or v_digest is distinct from v_universe.row_digest_sha256
       or exists (
         select 1
         from public.koaptix_latest_board_generation_row r
         where r.generation_id=p_generation_id
           and r.surface_code='UNIVERSE_SERVICE'
           and r.universe_code=v_universe.universe_code
           and (r.snapshot_date is distinct from v_universe.snapshot_date
                or r.source_previous_snapshot_date is distinct from
                   v_universe.previous_snapshot_date)
       ) then
      raise exception 'UNIVERSE_SERVICE universe % verification failed for generation %',
        v_universe.universe_code,p_generation_id;
    end if;
  end loop;

  if exists (
    select 1
    from public.koaptix_latest_board_generation_row r
    where r.generation_id=p_generation_id
      and (r.generated_at is distinct from v_generation.generated_at
           or r.refresh_run_id is distinct from v_generation.run_id)
  ) then
    raise exception 'service row generation provenance mismatch for generation %',p_generation_id;
  end if;

  v_digest:=public.koaptix_service_date_vector_digest(p_generation_id);
  if v_digest is distinct from v_service.date_vector_sha256 then
    raise exception 'UNIVERSE_SERVICE date vector mismatch for generation %',p_generation_id;
  end if;
  if public.koaptix_surface_component_manifest_digest(
       p_generation_id,'GLOBAL_LATEST'
     ) is distinct from v_global.component_manifest_sha256
     or public.koaptix_surface_component_manifest_digest(
       p_generation_id,'UNIVERSE_SERVICE'
     ) is distinct from v_service.component_manifest_sha256 then
    raise exception 'surface component manifest mismatch for generation %',p_generation_id;
  end if;
  v_combined:=public.koaptix_combined_surface_manifest_digest(p_generation_id);
  if v_combined is distinct from v_generation.combined_surface_manifest_sha256
     or v_generation.total_component_row_count<>
        v_global.row_count+v_service.row_count then
    raise exception 'combined manifest or aggregate row count mismatch for generation %',p_generation_id;
  end if;

  if v_generation.source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE' then
    if v_generation.source_authority_key<>'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1'
       or v_generation.input_manifest_run_id is not null
       or v_generation.affected_rank_date is not null
       or v_generation.affected_universe_codes<>array[]::text[]
       or v_global.snapshot_date<>date '2026-07-31'
       or v_global.previous_snapshot_date is distinct from date '2026-07-30'
       or v_global.universe_count<>1 or v_global.row_count<>13497
       or v_global.full_row_digest_sha256<>
          'C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908'
       or v_global.component_manifest_sha256<>
          'DED5CE75CCD8B4A36F064AD59D3BF43F7DD1D8CEADD33AD43E9150ED7826DB6C'
       or v_service.universe_count<>225 or v_service.row_count<>40484
       or v_service.date_vector_sha256<>
          '6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7'
       or v_service.full_row_digest_sha256<>
          'FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008'
       or v_service.component_manifest_sha256<>
          'A1CCACBCE1AF6EE106840E482A97A303813F096EA616F7D3837D865CFA8707E2'
       or v_generation.total_component_row_count<>53981
       or v_generation.combined_surface_manifest_sha256<>
          'F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63'
       or (select count(*) from public.koaptix_latest_board_generation_universe u
           where u.generation_id=p_generation_id
             and u.snapshot_date=date '2026-04-13')<>1
       or (select count(*) from public.koaptix_latest_board_generation_universe u
           where u.generation_id=p_generation_id
             and u.snapshot_date=date '2026-04-30')<>1
       or (select count(*) from public.koaptix_latest_board_generation_universe u
           where u.generation_id=p_generation_id
             and u.snapshot_date=date '2026-07-03')<>223
       or exists (
         select 1 from public.koaptix_latest_board_generation_universe u
         where u.generation_id=p_generation_id
           and u.snapshot_date not in (
             date '2026-04-13',date '2026-04-30',date '2026-07-03'
           )
       )
       or exists (select 1 from public.koaptix_rank_publication_history_stage h
                  where h.generation_id=p_generation_id)
       or exists (select 1 from public.koaptix_rank_publication_snapshot_stage s
                  where s.generation_id=p_generation_id) then
      raise exception 'bootstrap compatibility bundle identity mismatch for generation %',p_generation_id;
    end if;
  else
    if v_generation.affected_rank_date is null
       or not public.koaptix_text_array_is_distinct_nonblank(
         v_generation.affected_universe_codes
       )
       or v_generation.affected_universe_codes<>
          (select array_agg(code order by code)
           from unnest(v_generation.affected_universe_codes) u(code))
       or v_global.snapshot_date is distinct from v_generation.affected_rank_date
       or not ('KOREA_ALL'=any(v_generation.affected_universe_codes)) then
      raise exception 'sealed generation affected-date metadata is invalid for generation %',p_generation_id;
    end if;

    select array_agg(universe_code order by universe_code)
      into v_target_codes
    from public.koaptix_latest_board_generation_universe
    where generation_id=p_generation_id
      and snapshot_date=v_generation.affected_rank_date;
    if v_target_codes is distinct from v_generation.affected_universe_codes then
      raise exception 'affected universe target-date set mismatch for generation %',p_generation_id;
    end if;

    if exists (
      select g.snapshot_date,g.universe_code,g.complex_id,g.rank_all,g.market_cap_krw,
             g.market_cap_share::numeric,g.market_cap_share_pct::numeric,
             g.tier_code,g.tier_label,g.tier_sort,g.is_top1000
      from public.koaptix_latest_board_generation_global_row g
      where g.generation_id=p_generation_id
      except
      select r.snapshot_date,r.universe_code,r.complex_id,r.rank_all,r.market_cap_krw,
             r.market_cap_share::numeric,r.market_cap_share_pct::numeric,
             r.tier_code,r.tier_label,r.tier_sort,r.is_top1000
      from public.koaptix_latest_board_generation_row r
      where r.generation_id=p_generation_id and r.universe_code='KOREA_ALL'
    ) or exists (
      select r.snapshot_date,r.universe_code,r.complex_id,r.rank_all,r.market_cap_krw,
             r.market_cap_share::numeric,r.market_cap_share_pct::numeric,
             r.tier_code,r.tier_label,r.tier_sort,r.is_top1000
      from public.koaptix_latest_board_generation_row r
      where r.generation_id=p_generation_id and r.universe_code='KOREA_ALL'
      except
      select g.snapshot_date,g.universe_code,g.complex_id,g.rank_all,g.market_cap_krw,
             g.market_cap_share::numeric,g.market_cap_share_pct::numeric,
             g.tier_code,g.tier_label,g.tier_sort,g.is_top1000
      from public.koaptix_latest_board_generation_global_row g
      where g.generation_id=p_generation_id
    ) then
      raise exception 'future KOREA_ALL cross-surface current-field mismatch for generation %',p_generation_id;
    end if;

    select previous_snapshot_date into v_korea_previous
    from public.koaptix_latest_board_generation_universe
    where generation_id=p_generation_id and universe_code='KOREA_ALL';
    if v_korea_previous is not distinct from v_global.previous_snapshot_date
       and (
         exists (
           select g.complex_id,g.previous_rank_all,g.rank_delta_1d,g.rank_movement
           from public.koaptix_latest_board_generation_global_row g
           where g.generation_id=p_generation_id
           except
           select r.complex_id,r.previous_rank_all,r.rank_delta_w,r.rank_movement
           from public.koaptix_latest_board_generation_row r
           where r.generation_id=p_generation_id and r.universe_code='KOREA_ALL'
         ) or exists (
           select r.complex_id,r.previous_rank_all,r.rank_delta_w,r.rank_movement
           from public.koaptix_latest_board_generation_row r
           where r.generation_id=p_generation_id and r.universe_code='KOREA_ALL'
           except
           select g.complex_id,g.previous_rank_all,g.rank_delta_1d,g.rank_movement
           from public.koaptix_latest_board_generation_global_row g
           where g.generation_id=p_generation_id
         )
       ) then
      raise exception 'equal-predecessor KOREA_ALL movement mismatch for generation %',p_generation_id;
    end if;

    if exists (
      select h.snapshot_date,h.complex_id,h.market_cap_krw,h.rank_all
      from public.koaptix_rank_publication_history_stage h
      where h.generation_id=p_generation_id
      except
      select g.snapshot_date,g.complex_id,g.market_cap_krw,g.rank_all
      from public.koaptix_latest_board_generation_global_row g
      where g.generation_id=p_generation_id
    ) or exists (
      select g.snapshot_date,g.complex_id,g.market_cap_krw,g.rank_all
      from public.koaptix_latest_board_generation_global_row g
      where g.generation_id=p_generation_id
      except
      select h.snapshot_date,h.complex_id,h.market_cap_krw,h.rank_all
      from public.koaptix_rank_publication_history_stage h
      where h.generation_id=p_generation_id
    ) or exists (
      select 1 from public.koaptix_rank_publication_history_stage h
      where h.generation_id=p_generation_id and h.total_market_cap<=0
    ) then
      raise exception 'history stage differs from GLOBAL_LATEST for generation %',p_generation_id;
    end if;

    if exists (
      select s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
             s.market_cap_share::numeric,s.previous_rank_all,s.rank_delta_1d,s.is_top1000
      from public.koaptix_rank_publication_snapshot_stage s
      where s.generation_id=p_generation_id
      except
      select r.snapshot_date,r.universe_code,r.complex_id,r.rank_all,r.market_cap_krw,
             r.market_cap_share::numeric,r.previous_rank_all,r.rank_delta_w,r.is_top1000
      from public.koaptix_latest_board_generation_row r
      where r.generation_id=p_generation_id
        and r.universe_code=any(v_generation.affected_universe_codes)
    ) or exists (
      select r.snapshot_date,r.universe_code,r.complex_id,r.rank_all,r.market_cap_krw,
             r.market_cap_share::numeric,r.previous_rank_all,r.rank_delta_w,r.is_top1000
      from public.koaptix_latest_board_generation_row r
      where r.generation_id=p_generation_id
        and r.universe_code=any(v_generation.affected_universe_codes)
      except
      select s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
             s.market_cap_share::numeric,s.previous_rank_all,s.rank_delta_1d,s.is_top1000
      from public.koaptix_rank_publication_snapshot_stage s
      where s.generation_id=p_generation_id
    ) then
      raise exception 'snapshot stage differs from affected service rows for generation %',p_generation_id;
    end if;
  end if;

  return jsonb_build_object(
    'generation_id',p_generation_id,
    'surface_count',2,
    'total_component_row_count',v_generation.total_component_row_count,
    'combined_surface_manifest_sha256',v_combined,
    'surface_components',public.koaptix_generation_surface_components_json(p_generation_id),
    'verified',true
  );
end;
$function$;

create or replace function public.koaptix_assert_rank_input_authority(
  p_manifest_run_id text,
  p_target_rank_date date,
  p_packet jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_manifest public.koaptix_rank_input_authority_manifest%rowtype;
  v_actual jsonb;
  v_affected text[];
begin
  if to_regprocedure('public.koaptix_compute_rank_input_authority(date)') is null then
    raise exception 'canonical rank authority binding migration 904 is required';
  end if;
  select * into strict v_manifest
  from public.koaptix_rank_input_authority_manifest m
  where m.run_id=p_manifest_run_id
    and m.snapshot_date=p_target_rank_date
    and m.scope_code='KOREA_FULL'
    and m.authority_status='SEALED'
    and m.authority_contract_version='rank-input-v1'
    and m.canonical_query_version='canonical-rank-input-v1'
    and m.membership_contract_version='membership-map-first-45-52-v1'
    and m.blocking_review_rule_version='NO_DIRECT_RANK_REVIEW_AUTHORITY_V1'
    and m.blocking_review_rows=0
    and m.blocking_review_sha256=
      '4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'
    and m.sealed_at=m.created_at
    and m.sealed_at<=transaction_timestamp()
    and not exists (
      select 1 from public.koaptix_rank_input_manifest_revocation r
      where r.manifest_run_id=m.run_id
    );

  v_actual:=public.koaptix_compute_rank_input_authority(p_target_rank_date);
  if v_actual->>'snapshot_date' is distinct from p_target_rank_date::text
     or (v_actual->>'market_cap_rows')::integer is distinct from v_manifest.expected_market_cap_rows
     or (v_actual->>'eligibility_rows')::integer is distinct from v_manifest.expected_eligibility_rows
     or (v_actual->>'join_rows')::integer is distinct from v_manifest.expected_join_rows
     or (v_actual->>'qualified_rows')::integer is distinct from v_manifest.expected_qualified_rows
     or (v_actual->>'market_cap_only_rows')::integer is distinct from 0
     or (v_actual->>'eligibility_only_rows')::integer is distinct from 0
     or (v_actual->>'invalid_source_contract_rows')::integer is distinct from 0
     or v_actual->>'manual_override_rows' is null
     or ((v_actual->>'manual_override_rows')::integer is distinct from 0
         and not v_manifest.manual_override_allowed)
     or to_jsonb(v_manifest.market_cap_calculation_versions) is distinct from
        v_actual->'market_cap_calculation_versions'
     or to_jsonb(v_manifest.eligibility_rule_versions) is distinct from
        v_actual->'eligibility_rule_versions'
     or to_jsonb(v_manifest.market_cap_source_ids) is distinct from
        v_actual->'market_cap_source_ids'
     or to_jsonb(v_manifest.eligibility_source_ids) is distinct from
        v_actual->'eligibility_source_ids'
     or to_jsonb(v_manifest.membership_source_ids) is distinct from
        v_actual->'membership_source_ids'
     or v_manifest.expected_jeonbuk_membership_rows is distinct from
        (v_actual->>'jeonbuk_membership_rows')::integer
     or v_manifest.expected_sgg_52111_membership_rows is distinct from
        (v_actual->>'sgg_52111_membership_rows')::integer
     or v_manifest.expected_sgg_52111_qualified_rows is distinct from
        (v_actual->>'sgg_52111_qualified_rows')::integer
     or (v_actual->>'membership_duplicate_pairs')::integer is distinct from 0
     or (v_actual->>'membership_fail_closed_qualified_rows')::integer is distinct from 0
     or to_jsonb(v_manifest.affected_universe_codes) is distinct from
        v_actual->'affected_universe_codes'
     or v_manifest.affected_universe_manifest is distinct from
        v_actual->'affected_universe_manifest'
     or v_manifest.market_cap_set_sha256 is distinct from
        v_actual->>'market_cap_set_sha256'
     or v_manifest.eligibility_set_sha256 is distinct from
        v_actual->>'eligibility_set_sha256'
     or v_manifest.source_set_sha256 is distinct from v_actual->>'source_set_sha256'
     or v_manifest.selected_input_sha256 is distinct from
        v_actual->>'selected_input_sha256'
     or v_manifest.membership_set_sha256 is distinct from
        v_actual->>'membership_set_sha256'
     or v_manifest.affected_universe_set_sha256 is distinct from
        v_actual->>'affected_universe_set_sha256'
     or v_actual->>'blocking_review_rule_version' is distinct from
        'NO_DIRECT_RANK_REVIEW_AUTHORITY_V1'
     or (v_actual->>'blocking_review_rows')::integer is distinct from 0
     or v_actual->>'blocking_review_sha256' is distinct from
        '4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945' then
    raise exception 'sealed rank input authority mismatch for manifest %',p_manifest_run_id;
  end if;

  if p_packet is not null then
    if jsonb_typeof(p_packet->'affected_universe_codes')<>'array' then
      raise exception 'affected_universe_codes must be an array';
    end if;
    v_affected:=array(
      select jsonb_array_elements_text(p_packet->'affected_universe_codes')
    );
    if v_affected is distinct from v_manifest.affected_universe_codes
       or p_packet->>'market_cap_set_sha256' is distinct from v_manifest.market_cap_set_sha256
       or p_packet->>'eligibility_set_sha256' is distinct from v_manifest.eligibility_set_sha256
       or p_packet->>'source_set_sha256' is distinct from v_manifest.source_set_sha256
       or p_packet->>'selected_input_sha256' is distinct from v_manifest.selected_input_sha256
       or p_packet->>'membership_set_sha256' is distinct from v_manifest.membership_set_sha256
       or p_packet->>'affected_universe_set_sha256' is distinct from
          v_manifest.affected_universe_set_sha256 then
      raise exception 'action packet differs from sealed rank input authority %',p_manifest_run_id;
    end if;
  end if;
  return v_actual;
end;
$function$;

create or replace function public.koaptix_assert_generation_authority(
  p_generation_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_generation public.koaptix_latest_board_generation%rowtype;
begin
  select * into strict v_generation
  from public.koaptix_latest_board_generation
  where generation_id=p_generation_id;
  if v_generation.source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE' then
    if v_generation.source_authority_key<>'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1'
       or v_generation.input_manifest_run_id is not null then
      raise exception 'bootstrap generation authority is invalid';
    end if;
  elsif v_generation.source_authority_kind='SEALED_RANK_INPUT_MANIFEST' then
    if v_generation.input_manifest_run_id is distinct from v_generation.source_authority_key
       or v_generation.affected_rank_date is null then
      raise exception 'sealed generation authority metadata is invalid';
    end if;
    perform public.koaptix_assert_rank_input_authority(
      v_generation.input_manifest_run_id,v_generation.affected_rank_date,null
    );
  else
    raise exception 'unknown generation authority kind %',v_generation.source_authority_kind;
  end if;
end;
$function$;

create or replace function public.koaptix_insert_latest_board_generation_packet(
  p_packet jsonb,
  p_source_authority_kind text,
  p_source_authority_key text,
  p_input_manifest_run_id text,
  p_affected_rank_date date,
  p_affected_universe_codes text[],
  p_include_stages boolean
)
returns uuid
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_generation_id uuid:=(p_packet->>'generation_id')::uuid;
  v_required_surfaces text[];
  v_total bigint;
begin
  if not public.koaptix_jsonb_array_has_exact_object_keys(
    p_packet->'surface_components',array[
      'surface_code','snapshot_date','previous_snapshot_date','date_vector_sha256',
      'universe_count','row_count','full_row_digest_sha256','component_manifest_sha256'
    ]::text[]
  ) or not public.koaptix_jsonb_array_has_exact_object_keys(
    p_packet->'service_universes',array[
      'universe_code','snapshot_date','previous_snapshot_date',
      'expected_row_count','row_digest_sha256'
    ]::text[]
  ) or not public.koaptix_jsonb_array_has_exact_object_keys(
    p_packet->'service_rows',array[
      'snapshot_date','universe_code','universe_name','universe_scope','complex_id',
      'apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count',
      'total_household_count','recovery_52w','rank_all','previous_rank_all','rank_delta_w',
      'rank_movement','market_cap_krw','market_cap_trillion_krw','market_cap_share',
      'market_cap_share_pct','tier_code','tier_label','tier_sort','is_top1000',
      'source_previous_snapshot_date','generated_at','refresh_run_id'
    ]::text[]
  ) or not public.koaptix_jsonb_array_has_exact_object_keys(
    p_packet->'global_rows',array[
      'snapshot_date','universe_code','complex_id','apt_name_ko','address_road',
      'address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name',
      'rank_all','tier_code','tier_label','tier_sort','market_cap_krw',
      'market_cap_trillion_krw','market_cap_share','market_cap_share_pct',
      'previous_rank_all','rank_delta_1d','rank_movement','is_top1000',
      'total_household_count','household_count','priced_household_count',
      'priced_household_ratio','total_cluster_count','priced_cluster_count',
      'coverage_status','is_rank_eligible','eligibility_status','latitude','longitude',
      'recovery_52w'
    ]::text[]
  ) then
    raise exception 'generation packet nested row keys are not exact';
  end if;
  if jsonb_array_length(p_packet->'surface_components')<>2
     or jsonb_array_length(p_packet->'service_universes')=0
     or jsonb_array_length(p_packet->'service_rows')=0
     or jsonb_array_length(p_packet->'global_rows')=0 then
    raise exception 'generation packet component arrays are incomplete';
  end if;
  if p_include_stages then
    if not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'history_stage_rows',array[
        'snapshot_date','complex_id','market_cap_krw','rank_all','total_market_cap'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'snapshot_stage_rows',array[
        'snapshot_date','universe_code','complex_id','rank_all','market_cap_krw',
        'market_cap_share','previous_rank_all','rank_delta_1d','is_top1000',
        'rank_method','calculation_version','created_at'
      ]::text[]
    ) or jsonb_array_length(p_packet->'history_stage_rows')=0
      or jsonb_array_length(p_packet->'snapshot_stage_rows')=0 then
      raise exception 'future generation stage arrays are incomplete or not exact';
    end if;
  end if;

  v_required_surfaces:=array(
    select jsonb_array_elements_text(p_packet->'required_surface_codes')
  );
  if v_required_surfaces<>array['GLOBAL_LATEST','UNIVERSE_SERVICE']::text[] then
    raise exception 'required_surface_codes are not exact';
  end if;

  insert into public.koaptix_latest_board_generation_surface(
    generation_id,surface_code,snapshot_date,previous_snapshot_date,date_vector_sha256,
    universe_count,row_count,full_row_digest_sha256,component_manifest_sha256
  )
  select v_generation_id,x.*
  from jsonb_to_recordset(p_packet->'surface_components') as x(
    surface_code text,snapshot_date date,previous_snapshot_date date,
    date_vector_sha256 text,universe_count integer,row_count bigint,
    full_row_digest_sha256 text,component_manifest_sha256 text
  );

  insert into public.koaptix_latest_board_generation_universe(
    generation_id,surface_code,universe_code,snapshot_date,previous_snapshot_date,
    expected_row_count,row_digest_sha256
  )
  select v_generation_id,'UNIVERSE_SERVICE',x.*
  from jsonb_to_recordset(p_packet->'service_universes') as x(
    universe_code text,snapshot_date date,previous_snapshot_date date,
    expected_row_count bigint,row_digest_sha256 text
  );

  insert into public.koaptix_latest_board_generation_row(
    generation_id,surface_code,snapshot_date,universe_code,universe_name,universe_scope,
    complex_id,apt_name_ko,sigungu_name,legal_dong_name,build_year,household_count,
    total_household_count,recovery_52w,rank_all,previous_rank_all,rank_delta_w,
    rank_movement,market_cap_krw,market_cap_trillion_krw,market_cap_share,
    market_cap_share_pct,tier_code,tier_label,tier_sort,is_top1000,
    source_previous_snapshot_date,generated_at,refresh_run_id
  )
  select v_generation_id,'UNIVERSE_SERVICE',x.*
  from jsonb_to_recordset(p_packet->'service_rows') as x(
    snapshot_date date,universe_code text,universe_name text,universe_scope text,
    complex_id bigint,apt_name_ko text,sigungu_name text,legal_dong_name text,
    build_year integer,household_count integer,total_household_count integer,
    recovery_52w text,rank_all integer,previous_rank_all integer,rank_delta_w integer,
    rank_movement text,market_cap_krw bigint,market_cap_trillion_krw numeric,
    market_cap_share numeric,market_cap_share_pct numeric,tier_code text,
    tier_label text,tier_sort integer,is_top1000 boolean,
    source_previous_snapshot_date date,generated_at timestamptz,refresh_run_id text
  );

  insert into public.koaptix_latest_board_generation_global_row(
    generation_id,surface_code,snapshot_date,universe_code,complex_id,apt_name_ko,
    address_road,address_jibun,legal_dong_name,build_year,sigungu_code,sigungu_name,
    rank_all,tier_code,tier_label,tier_sort,market_cap_krw,market_cap_trillion_krw,
    market_cap_share,market_cap_share_pct,previous_rank_all,rank_delta_1d,rank_movement,
    is_top1000,total_household_count,household_count,priced_household_count,
    priced_household_ratio,total_cluster_count,priced_cluster_count,coverage_status,
    is_rank_eligible,eligibility_status,latitude,longitude,recovery_52w
  )
  select v_generation_id,'GLOBAL_LATEST',x.*
  from jsonb_to_recordset(p_packet->'global_rows') as x(
    snapshot_date date,universe_code text,complex_id bigint,apt_name_ko text,
    address_road text,address_jibun text,legal_dong_name text,build_year integer,
    sigungu_code text,sigungu_name text,rank_all integer,tier_code text,tier_label text,
    tier_sort integer,market_cap_krw bigint,market_cap_trillion_krw numeric,
    market_cap_share numeric,market_cap_share_pct numeric,previous_rank_all integer,
    rank_delta_1d integer,rank_movement text,is_top1000 boolean,
    total_household_count integer,household_count integer,priced_household_count integer,
    priced_household_ratio numeric,total_cluster_count integer,priced_cluster_count integer,
    coverage_status text,is_rank_eligible boolean,eligibility_status text,
    latitude numeric,longitude numeric,recovery_52w text
  );

  if p_include_stages then
    insert into public.koaptix_rank_publication_history_stage(
      generation_id,snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap
    )
    select v_generation_id,x.*
    from jsonb_to_recordset(p_packet->'history_stage_rows') as x(
      snapshot_date date,complex_id bigint,market_cap_krw bigint,
      rank_all integer,total_market_cap bigint
    );
    insert into public.koaptix_rank_publication_snapshot_stage(
      generation_id,snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
      market_cap_share,previous_rank_all,rank_delta_1d,is_top1000,
      rank_method,calculation_version,created_at
    )
    select v_generation_id,x.*
    from jsonb_to_recordset(p_packet->'snapshot_stage_rows') as x(
      snapshot_date date,universe_code text,complex_id bigint,rank_all integer,
      market_cap_krw bigint,market_cap_share numeric,previous_rank_all integer,
      rank_delta_1d integer,is_top1000 boolean,rank_method text,
      calculation_version text,created_at timestamptz
    );
  end if;

  select sum(row_count) into v_total
  from public.koaptix_latest_board_generation_surface
  where generation_id=v_generation_id;
  insert into public.koaptix_latest_board_generation(
    generation_id,run_id,plan_run_id,source_authority_kind,source_authority_key,
    input_manifest_run_id,affected_rank_date,affected_universe_codes,
    required_surface_codes,surface_count,total_component_row_count,
    combined_surface_manifest_sha256,generated_at,verified_at
  ) values (
    v_generation_id,p_packet->>'execution_run_id',p_packet->>'plan_run_id',
    p_source_authority_kind,p_source_authority_key,p_input_manifest_run_id,
    p_affected_rank_date,p_affected_universe_codes,v_required_surfaces,2,v_total,
    p_packet->>'combined_surface_manifest_sha256',
    (p_packet->>'generated_at')::timestamptz,(p_packet->>'verified_at')::timestamptz
  );
  perform public.koaptix_verify_latest_board_generation(v_generation_id);
  return v_generation_id;
end;
$function$;

create or replace function public.koaptix_require_publication_event_pointer_commit()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
begin
  if not exists (
    select 1
    from public.koaptix_latest_board_publication p
    where p.singleton_id=true
      and p.active_event_id=new.event_id
      and p.publication_version=new.publication_version
      and p.active_generation_id=new.to_generation_id
      and p.published_at=new.recorded_at
  ) then
    raise exception 'publication event % is not the committed singleton pointer event',new.event_id;
  end if;
  return null;
end;
$function$;

set local role koaptix_rank_publication_owner;

create constraint trigger trg_koaptix_publication_event_requires_pointer_commit
  after insert on public.koaptix_latest_board_publication_event
  deferrable initially deferred
  for each row execute function public.koaptix_require_publication_event_pointer_commit();

reset role;

create or replace function public.koaptix_guard_latest_board_publication_pointer()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_event public.koaptix_latest_board_publication_event%rowtype;
  v_generation public.koaptix_latest_board_generation%rowtype;
begin
  if tg_op='DELETE' then
    raise exception 'latest-board publication pointer cannot be deleted';
  end if;
  if current_setting('transaction_isolation')<>'serializable' then
    raise exception 'latest-board pointer changes require a SERIALIZABLE transaction';
  end if;
  if new.singleton_id is distinct from true then
    raise exception 'latest-board singleton identity is invalid';
  end if;

  select * into strict v_event
  from public.koaptix_latest_board_publication_event e
  where e.event_id=new.active_event_id
    and e.publication_version=new.publication_version
    and e.to_generation_id=new.active_generation_id
    and e.recorded_at=new.published_at;
  select * into strict v_generation
  from public.koaptix_latest_board_generation g
  where g.generation_id=new.active_generation_id;

  if v_event.plan_run_id is distinct from v_generation.plan_run_id then
    raise exception 'publication event plan does not match generation plan';
  end if;

  if tg_op='INSERT' then
    if new.publication_version<>1
       or v_event.expected_previous_version<>0
       or v_event.event_type<>'PUBLISH'
       or v_event.from_generation_id is not null
       or new.previous_generation_id is not null
       or v_generation.source_authority_kind<>'BOOTSTRAP_COMPATIBILITY_BUNDLE'
       or v_generation.source_authority_key<>'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1'
       or exists (
         select 1 from public.koaptix_latest_board_publication_event e
         where e.event_id<>v_event.event_id
       ) then
      raise exception 'initial publication pointer requires the exact bootstrap PUBLISH event';
    end if;
  elsif tg_op='UPDATE' then
    if new.singleton_id is distinct from old.singleton_id
       or new.publication_version<>old.publication_version+1
       or new.published_at<old.published_at
       or v_event.expected_previous_version<>old.publication_version
       or v_event.from_generation_id is distinct from old.active_generation_id
       or v_event.to_generation_id is distinct from new.active_generation_id
       or new.previous_generation_id is distinct from old.active_generation_id
       or new.active_generation_id is not distinct from old.active_generation_id then
      raise exception 'publication pointer compare-and-swap tuple is invalid';
    end if;

    if v_event.event_type='PUBLISH' then
      if v_generation.source_authority_kind<>'SEALED_RANK_INPUT_MANIFEST'
         or new.active_generation_id is not distinct from old.previous_generation_id
         or exists (
           select 1
           from public.koaptix_latest_board_publication_event prior
           where prior.to_generation_id=new.active_generation_id
             and prior.event_id<>new.active_event_id
         ) then
        raise exception 'PUBLISH target is not a new verified inactive sealed generation';
      end if;
    elsif v_event.event_type='ROLLBACK' then
      if old.previous_generation_id is null
         or new.active_generation_id is distinct from old.previous_generation_id
         or new.previous_generation_id is distinct from old.active_generation_id then
        raise exception 'ROLLBACK does not exactly reverse active and previous generations';
      end if;
    else
      raise exception 'unsupported latest-board publication event type %',v_event.event_type;
    end if;
  else
    raise exception 'unsupported latest-board pointer trigger operation %',tg_op;
  end if;

  perform public.koaptix_verify_latest_board_generation(new.active_generation_id);
  perform public.koaptix_assert_generation_authority(new.active_generation_id);
  return new;
end;
$function$;

set local role koaptix_rank_publication_owner;

create trigger trg_koaptix_latest_board_publication_guard
  before insert or update or delete on public.koaptix_latest_board_publication
  for each row execute function public.koaptix_guard_latest_board_publication_pointer();

reset role;

create or replace function public.koaptix_assert_latest_board_action_packet_header(
  p_packet jsonb,
  p_required_keys text[],
  p_action text,
  p_authorization_proof text
)
returns void
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
begin
  if p_packet is null
     or jsonb_typeof(p_packet) is distinct from 'object'
     or public.koaptix_jsonb_has_exact_keys(p_packet,p_required_keys)
        is distinct from true
     or jsonb_typeof(p_packet->'schema_version')<>'string'
     or jsonb_typeof(p_packet->'action')<>'string'
     or jsonb_typeof(p_packet->'plan_run_id')<>'string'
     or jsonb_typeof(p_packet->'execution_run_id')<>'string'
     or jsonb_typeof(p_packet->'authorization_proof_exact')<>'string'
     or jsonb_typeof(p_packet->'automatic_retry')<>'boolean'
     or p_packet->>'schema_version'<>'koaptix-latest-board-packet-v1'
     or p_packet->>'action'<>p_action
     or p_packet->>'authorization_proof_exact'<>p_authorization_proof
     or btrim(p_packet->>'plan_run_id')=''
     or btrim(p_packet->>'execution_run_id')=''
     or p_packet->'automatic_retry'<>'false'::jsonb then
    raise exception '% action packet header or exact key set is invalid',p_action;
  end if;
  if current_setting('transaction_isolation')<>'serializable' then
    raise exception '% requires a SERIALIZABLE transaction',p_action;
  end if;
end;
$function$;

create or replace function public.koaptix_seed_latest_board_compatibility_generation(
  p_packet jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[]:=array[
    'schema_version','action','plan_run_id','execution_run_id',
    'authorization_proof_exact','automatic_retry','generation_id','generated_at',
    'verified_at','expected_active_generation_id','expected_publication_version',
    'required_surface_codes','surface_components','service_universes','service_rows',
    'global_rows','combined_surface_manifest_sha256','event_id','recorded_at'
  ];
  v_generation_id uuid;
  v_event_id uuid;
  v_generated_at timestamptz;
  v_verified_at timestamptz;
  v_recorded_at timestamptz;
begin
  perform public.koaptix_assert_latest_board_action_packet_header(
    p_packet,v_required_keys,'SEED_COMPATIBILITY',
    'SEPARATE_INITIAL_READ_MODEL_SEED_EXECUTION_APPROVAL'
  );
  if jsonb_typeof(p_packet->'generation_id')<>'string'
     or jsonb_typeof(p_packet->'event_id')<>'string'
     or jsonb_typeof(p_packet->'generated_at')<>'string'
     or jsonb_typeof(p_packet->'verified_at')<>'string'
     or jsonb_typeof(p_packet->'recorded_at')<>'string'
     or jsonb_typeof(p_packet->'expected_active_generation_id')<>'null'
     or jsonb_typeof(p_packet->'expected_publication_version')<>'number'
     or p_packet->>'expected_publication_version'<>'0'
     or jsonb_typeof(p_packet->'required_surface_codes')<>'array'
     or jsonb_typeof(p_packet->'surface_components')<>'array'
     or jsonb_typeof(p_packet->'service_universes')<>'array'
     or jsonb_typeof(p_packet->'service_rows')<>'array'
     or jsonb_typeof(p_packet->'global_rows')<>'array'
     or jsonb_typeof(p_packet->'combined_surface_manifest_sha256')<>'string'
     or p_packet->>'combined_surface_manifest_sha256' !~ '^[0-9A-F]{64}$' then
    raise exception 'SEED_COMPATIBILITY packet JSON types are invalid';
  end if;
  v_generation_id:=(p_packet->>'generation_id')::uuid;
  v_event_id:=(p_packet->>'event_id')::uuid;
  if v_generation_id::text<>p_packet->>'generation_id'
     or v_event_id::text<>p_packet->>'event_id' then
    raise exception 'SEED_COMPATIBILITY UUID text is not canonical lowercase';
  end if;
  v_generated_at:=(p_packet->>'generated_at')::timestamptz;
  v_verified_at:=(p_packet->>'verified_at')::timestamptz;
  v_recorded_at:=(p_packet->>'recorded_at')::timestamptz;
  if v_verified_at<v_generated_at
     or v_recorded_at<v_verified_at
     or v_recorded_at>transaction_timestamp() then
    raise exception 'SEED_COMPATIBILITY timestamps are not ordered or are in the future';
  end if;
  if exists (select 1 from public.koaptix_latest_board_publication)
     or exists (select 1 from public.koaptix_latest_board_publication_event)
     or to_regclass('public.v_koaptix_latest_universe_rank_board_u') is null
     or to_regclass('public.v_koaptix_latest_rank_board') is null then
    raise exception 'SEED_COMPATIBILITY requires an empty pointer/event log and both legacy source views';
  end if;

  perform public.koaptix_insert_latest_board_generation_packet(
    p_packet,'BOOTSTRAP_COMPATIBILITY_BUNDLE','BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
    null,null,array[]::text[],false
  );

  if exists (
    select r.snapshot_date,r.universe_code,r.universe_name,r.universe_scope,
           r.complex_id,r.apt_name_ko,r.sigungu_name,r.legal_dong_name,r.build_year,
           r.household_count,r.total_household_count,r.recovery_52w,r.rank_all,
           r.previous_rank_all,r.rank_delta_w,r.rank_movement,r.market_cap_krw,
           r.market_cap_trillion_krw,r.market_cap_share,r.market_cap_share_pct,
           r.tier_code,r.tier_label,r.tier_sort,r.is_top1000
    from public.koaptix_latest_board_generation_row r
    where r.generation_id=v_generation_id
    except
    select v.snapshot_date,v.universe_code,v.universe_name,v.universe_scope,
           v.complex_id,v.apt_name_ko,v.sigungu_name,v.legal_dong_name,v.build_year,
           v.household_count,v.total_household_count,v.recovery_52w,v.rank_all,
           v.previous_rank_all,v.rank_delta_w,v.rank_movement,v.market_cap_krw,
           v.market_cap_trillion_krw,v.market_cap_share,v.market_cap_share_pct,
           v.tier_code,v.tier_label,v.tier_sort,v.is_top1000
    from public.v_koaptix_latest_universe_rank_board_u v
  ) or exists (
    select v.snapshot_date,v.universe_code,v.universe_name,v.universe_scope,
           v.complex_id,v.apt_name_ko,v.sigungu_name,v.legal_dong_name,v.build_year,
           v.household_count,v.total_household_count,v.recovery_52w,v.rank_all,
           v.previous_rank_all,v.rank_delta_w,v.rank_movement,v.market_cap_krw,
           v.market_cap_trillion_krw,v.market_cap_share,v.market_cap_share_pct,
           v.tier_code,v.tier_label,v.tier_sort,v.is_top1000
    from public.v_koaptix_latest_universe_rank_board_u v
    except
    select r.snapshot_date,r.universe_code,r.universe_name,r.universe_scope,
           r.complex_id,r.apt_name_ko,r.sigungu_name,r.legal_dong_name,r.build_year,
           r.household_count,r.total_household_count,r.recovery_52w,r.rank_all,
           r.previous_rank_all,r.rank_delta_w,r.rank_movement,r.market_cap_krw,
           r.market_cap_trillion_krw,r.market_cap_share,r.market_cap_share_pct,
           r.tier_code,r.tier_label,r.tier_sort,r.is_top1000
    from public.koaptix_latest_board_generation_row r
    where r.generation_id=v_generation_id
  ) or (select count(*) from public.v_koaptix_latest_universe_rank_board_u)<>40484 then
    raise exception 'SEED_COMPATIBILITY service rows differ from the exact legacy source';
  end if;

  if exists (
    select r.snapshot_date,r.universe_code,r.complex_id,r.apt_name_ko,r.address_road,
           r.address_jibun,r.legal_dong_name,r.build_year,r.sigungu_code,r.sigungu_name,
           r.rank_all,r.tier_code,r.tier_label,r.tier_sort,r.market_cap_krw,
           r.market_cap_trillion_krw,r.market_cap_share,r.market_cap_share_pct,
           r.previous_rank_all,r.rank_delta_1d,r.rank_movement,r.is_top1000,
           r.total_household_count,r.household_count,r.priced_household_count,
           r.priced_household_ratio,r.total_cluster_count,r.priced_cluster_count,
           r.coverage_status,r.is_rank_eligible,r.eligibility_status,r.latitude,
           r.longitude,r.recovery_52w
    from public.koaptix_latest_board_generation_global_row r
    where r.generation_id=v_generation_id
    except
    select v.snapshot_date,v.universe_code,v.complex_id,v.apt_name_ko,v.address_road,
           v.address_jibun,v.legal_dong_name,v.build_year,v.sigungu_code,v.sigungu_name,
           v.rank_all,v.tier_code,v.tier_label,v.tier_sort,v.market_cap_krw,
           v.market_cap_trillion_krw,v.market_cap_share,v.market_cap_share_pct,
           v.previous_rank_all,v.rank_delta_1d,v.rank_movement,v.is_top1000,
           v.total_household_count,v.household_count,v.priced_household_count,
           v.priced_household_ratio,v.total_cluster_count,v.priced_cluster_count,
           v.coverage_status,v.is_rank_eligible,v.eligibility_status,v.latitude,
           v.longitude,v.recovery_52w
    from public.v_koaptix_latest_rank_board v
  ) or exists (
    select v.snapshot_date,v.universe_code,v.complex_id,v.apt_name_ko,v.address_road,
           v.address_jibun,v.legal_dong_name,v.build_year,v.sigungu_code,v.sigungu_name,
           v.rank_all,v.tier_code,v.tier_label,v.tier_sort,v.market_cap_krw,
           v.market_cap_trillion_krw,v.market_cap_share,v.market_cap_share_pct,
           v.previous_rank_all,v.rank_delta_1d,v.rank_movement,v.is_top1000,
           v.total_household_count,v.household_count,v.priced_household_count,
           v.priced_household_ratio,v.total_cluster_count,v.priced_cluster_count,
           v.coverage_status,v.is_rank_eligible,v.eligibility_status,v.latitude,
           v.longitude,v.recovery_52w
    from public.v_koaptix_latest_rank_board v
    except
    select r.snapshot_date,r.universe_code,r.complex_id,r.apt_name_ko,r.address_road,
           r.address_jibun,r.legal_dong_name,r.build_year,r.sigungu_code,r.sigungu_name,
           r.rank_all,r.tier_code,r.tier_label,r.tier_sort,r.market_cap_krw,
           r.market_cap_trillion_krw,r.market_cap_share,r.market_cap_share_pct,
           r.previous_rank_all,r.rank_delta_1d,r.rank_movement,r.is_top1000,
           r.total_household_count,r.household_count,r.priced_household_count,
           r.priced_household_ratio,r.total_cluster_count,r.priced_cluster_count,
           r.coverage_status,r.is_rank_eligible,r.eligibility_status,r.latitude,
           r.longitude,r.recovery_52w
    from public.koaptix_latest_board_generation_global_row r
    where r.generation_id=v_generation_id
  ) or (select count(*) from public.v_koaptix_latest_rank_board)<>13497 then
    raise exception 'SEED_COMPATIBILITY global rows differ from the exact legacy source';
  end if;

  insert into public.koaptix_latest_board_publication_event(
    publication_version,event_id,event_type,from_generation_id,to_generation_id,
    plan_run_id,execution_run_id,expected_previous_version,recorded_at
  ) values (
    1,v_event_id,'PUBLISH',null,v_generation_id,p_packet->>'plan_run_id',
    p_packet->>'execution_run_id',0,v_recorded_at
  );
  insert into public.koaptix_latest_board_publication(
    singleton_id,active_event_id,active_generation_id,previous_generation_id,
    publication_version,published_at
  ) values (true,v_event_id,v_generation_id,null,1,v_recorded_at);
  set constraints all immediate;

  return jsonb_build_object(
    'action','SEED_COMPATIBILITY','outcome','PUBLISHED',
    'generation_id',v_generation_id,'event_id',v_event_id,
    'publication_version',1,'active_generation_id',v_generation_id,
    'previous_generation_id',null,'published_at',v_recorded_at,
    'surface_count',2,'total_component_rows',53981,
    'combined_surface_manifest_sha256',
      'F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63',
    'official_history_rows_written',0,'official_snapshot_rows_written',0,
    'automatic_retry_count',0
  );
end;
$function$;

create or replace function public.koaptix_build_rank_publication_generation(
  p_packet jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[]:=array[
    'schema_version','action','plan_run_id','execution_run_id',
    'authorization_proof_exact','automatic_retry','generation_id','generated_at',
    'verified_at','target_rank_date','input_manifest_run_id',
    'expected_active_generation_id','expected_publication_version',
    'affected_universe_codes','market_cap_set_sha256','eligibility_set_sha256',
    'source_set_sha256','selected_input_sha256','membership_set_sha256',
    'affected_universe_set_sha256','required_surface_codes','surface_components',
    'service_universes','service_rows','global_rows',
    'combined_surface_manifest_sha256','history_stage_rows','snapshot_stage_rows'
  ];
  v_generation_id uuid;
  v_expected_active uuid;
  v_target_date date;
  v_expected_version bigint;
  v_affected text[];
  v_pointer public.koaptix_latest_board_publication%rowtype;
  v_existing_generation public.koaptix_latest_board_generation%rowtype;
  v_collision_generation_ids uuid[];
  v_verification jsonb;
begin
  perform public.koaptix_assert_latest_board_action_packet_header(
    p_packet,v_required_keys,'BUILD_GENERATION',
    'SEPARATE_EXACT_FUTURE_DATE_INACTIVE_GENERATION_EXECUTION_APPROVAL'
  );
  if jsonb_typeof(p_packet->'generation_id')<>'string'
     or jsonb_typeof(p_packet->'expected_active_generation_id')<>'string'
     or jsonb_typeof(p_packet->'target_rank_date')<>'string'
     or jsonb_typeof(p_packet->'input_manifest_run_id')<>'string'
     or jsonb_typeof(p_packet->'expected_publication_version')<>'number'
     or p_packet->>'expected_publication_version' !~ '^[1-9][0-9]*$'
     or jsonb_typeof(p_packet->'affected_universe_codes')<>'array'
     or jsonb_typeof(p_packet->'required_surface_codes')<>'array'
     or jsonb_typeof(p_packet->'surface_components')<>'array'
     or jsonb_typeof(p_packet->'service_universes')<>'array'
     or jsonb_typeof(p_packet->'service_rows')<>'array'
     or jsonb_typeof(p_packet->'global_rows')<>'array'
     or jsonb_typeof(p_packet->'history_stage_rows')<>'array'
     or jsonb_typeof(p_packet->'snapshot_stage_rows')<>'array'
     or jsonb_typeof(p_packet->'generated_at')<>'string'
     or jsonb_typeof(p_packet->'verified_at')<>'string'
     or exists (
       select 1 from unnest(array[
         'market_cap_set_sha256','eligibility_set_sha256','source_set_sha256',
         'selected_input_sha256','membership_set_sha256',
         'affected_universe_set_sha256','combined_surface_manifest_sha256'
       ]) k(key_name)
       where jsonb_typeof(p_packet->key_name)<>'string'
          or p_packet->>key_name !~ '^[0-9A-F]{64}$'
     ) then
    raise exception 'BUILD_GENERATION packet JSON types are invalid';
  end if;
  v_generation_id:=(p_packet->>'generation_id')::uuid;
  v_expected_active:=(p_packet->>'expected_active_generation_id')::uuid;
  v_target_date:=(p_packet->>'target_rank_date')::date;
  v_expected_version:=(p_packet->>'expected_publication_version')::bigint;
  v_affected:=array(
    select jsonb_array_elements_text(p_packet->'affected_universe_codes')
  );
  if v_generation_id::text<>p_packet->>'generation_id'
     or v_expected_active::text<>p_packet->>'expected_active_generation_id'
     or v_target_date::text<>p_packet->>'target_rank_date'
     or btrim(p_packet->>'input_manifest_run_id')=''
     or not public.koaptix_text_array_is_distinct_nonblank(v_affected)
     or v_affected is distinct from
        (select array_agg(code order by code) from unnest(v_affected) u(code))
     or (p_packet->>'verified_at')::timestamptz<
        (p_packet->>'generated_at')::timestamptz
     or (p_packet->>'verified_at')::timestamptz>transaction_timestamp() then
    raise exception 'BUILD_GENERATION identifiers, affected set, or timestamps are invalid';
  end if;
  if v_target_date<=date '2026-05-31'
     or v_target_date>(transaction_timestamp() at time zone 'Asia/Seoul')::date then
    raise exception 'BUILD_GENERATION target date is outside the approved date window';
  end if;

  select * into strict v_pointer
  from public.koaptix_latest_board_publication
  where singleton_id=true
  for update nowait;
  if v_pointer.active_generation_id is distinct from v_expected_active
     or v_pointer.publication_version is distinct from v_expected_version then
    raise exception 'BUILD_GENERATION pointer compare-and-swap precondition failed';
  end if;
  if v_target_date<=coalesce(
       (select max(snapshot_date) from public.complex_rank_history),date '2026-05-31'
     )
     or exists (
       select 1 from public.complex_rank_history h where h.snapshot_date=v_target_date
     )
     or exists (
       select 1 from public.koaptix_rank_snapshot s
       where s.snapshot_date=v_target_date and s.universe_code=any(v_affected)
     ) then
    raise exception 'BUILD_GENERATION target date collides with official rank data';
  end if;

  perform public.koaptix_assert_rank_input_authority(
    p_packet->>'input_manifest_run_id',v_target_date,p_packet
  );

  -- Exact immutable VERIFIED_INACTIVE idempotent zero-write reuse. Every unique
  -- generation identity must either be wholly absent or resolve to one same row.
  select array_agg(g.generation_id order by g.generation_id)
    into v_collision_generation_ids
  from public.koaptix_latest_board_generation g
  where g.generation_id=v_generation_id
     or g.run_id=p_packet->>'execution_run_id'
     or (
       g.source_authority_kind='SEALED_RANK_INPUT_MANIFEST'
       and g.source_authority_key=p_packet->>'input_manifest_run_id'
     )
     or g.combined_surface_manifest_sha256=
          p_packet->>'combined_surface_manifest_sha256';

  if coalesce(cardinality(v_collision_generation_ids),0)>0 then
    if cardinality(v_collision_generation_ids)<>1 then
      raise exception 'BUILD_GENERATION idempotent reuse identity collision';
    end if;

    select * into strict v_existing_generation
    from public.koaptix_latest_board_generation g
    where g.generation_id=v_collision_generation_ids[1];

    if not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'surface_components',array[
        'surface_code','snapshot_date','previous_snapshot_date','date_vector_sha256',
        'universe_count','row_count','full_row_digest_sha256','component_manifest_sha256'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'service_universes',array[
        'universe_code','snapshot_date','previous_snapshot_date',
        'expected_row_count','row_digest_sha256'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'service_rows',array[
        'snapshot_date','universe_code','universe_name','universe_scope','complex_id',
        'apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count',
        'total_household_count','recovery_52w','rank_all','previous_rank_all','rank_delta_w',
        'rank_movement','market_cap_krw','market_cap_trillion_krw','market_cap_share',
        'market_cap_share_pct','tier_code','tier_label','tier_sort','is_top1000',
        'source_previous_snapshot_date','generated_at','refresh_run_id'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'global_rows',array[
        'snapshot_date','universe_code','complex_id','apt_name_ko','address_road',
        'address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name',
        'rank_all','tier_code','tier_label','tier_sort','market_cap_krw',
        'market_cap_trillion_krw','market_cap_share','market_cap_share_pct',
        'previous_rank_all','rank_delta_1d','rank_movement','is_top1000',
        'total_household_count','household_count','priced_household_count',
        'priced_household_ratio','total_cluster_count','priced_cluster_count',
        'coverage_status','is_rank_eligible','eligibility_status','latitude','longitude',
        'recovery_52w'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'history_stage_rows',array[
        'snapshot_date','complex_id','market_cap_krw','rank_all','total_market_cap'
      ]::text[]
    ) or not public.koaptix_jsonb_array_has_exact_object_keys(
      p_packet->'snapshot_stage_rows',array[
        'snapshot_date','universe_code','complex_id','rank_all','market_cap_krw',
        'market_cap_share','previous_rank_all','rank_delta_1d','is_top1000',
        'rank_method','calculation_version','created_at'
      ]::text[]
    ) then
      raise exception 'BUILD_GENERATION idempotent reuse nested row keys are not exact';
    end if;

    if v_existing_generation.generation_id is distinct from v_generation_id
       or v_existing_generation.run_id is distinct from p_packet->>'execution_run_id'
       or v_existing_generation.plan_run_id is distinct from p_packet->>'plan_run_id'
       or v_existing_generation.source_authority_kind
            is distinct from 'SEALED_RANK_INPUT_MANIFEST'
       or v_existing_generation.source_authority_key
            is distinct from p_packet->>'input_manifest_run_id'
       or v_existing_generation.input_manifest_run_id
            is distinct from p_packet->>'input_manifest_run_id'
       or v_existing_generation.affected_rank_date is distinct from v_target_date
       or v_existing_generation.affected_universe_codes is distinct from v_affected
       or v_existing_generation.required_surface_codes is distinct from
          array(
            select jsonb_array_elements_text(p_packet->'required_surface_codes')
          )
       or v_existing_generation.surface_count<>2
       or v_existing_generation.total_component_row_count is distinct from (
          select sum((component->>'row_count')::bigint)
          from jsonb_array_elements(p_packet->'surface_components') component
       )
       or v_existing_generation.combined_surface_manifest_sha256
            is distinct from p_packet->>'combined_surface_manifest_sha256'
       or v_existing_generation.generated_at
            is distinct from (p_packet->>'generated_at')::timestamptz
       or v_existing_generation.verified_at
            is distinct from (p_packet->>'verified_at')::timestamptz then
      raise exception 'BUILD_GENERATION idempotent reuse parent collision';
    end if;

    if jsonb_array_length(p_packet->'surface_components')<>
         (select count(*) from public.koaptix_latest_board_generation_surface s
          where s.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_surface,
              p_packet->'surface_components'
            ) x
            except
            select to_jsonb(s)-'generation_id'
            from public.koaptix_latest_board_generation_surface s
            where s.generation_id=v_generation_id)
           union all
           (select to_jsonb(s)-'generation_id'
            from public.koaptix_latest_board_generation_surface s
            where s.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_surface,
              p_packet->'surface_components'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse surface collision';
    end if;

    if jsonb_array_length(p_packet->'service_universes')<>
         (select count(*) from public.koaptix_latest_board_generation_universe u
          where u.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id'-'surface_code' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_universe,
              p_packet->'service_universes'
            ) x
            except
            select to_jsonb(u)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_universe u
            where u.generation_id=v_generation_id)
           union all
           (select to_jsonb(u)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_universe u
            where u.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'-'surface_code'
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_universe,
              p_packet->'service_universes'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse universe collision';
    end if;

    if jsonb_array_length(p_packet->'service_rows')<>
         (select count(*) from public.koaptix_latest_board_generation_row r
          where r.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id'-'surface_code' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_row,
              p_packet->'service_rows'
            ) x
            except
            select to_jsonb(r)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_row r
            where r.generation_id=v_generation_id)
           union all
           (select to_jsonb(r)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_row r
            where r.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'-'surface_code'
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_row,
              p_packet->'service_rows'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse service-row collision';
    end if;

    if jsonb_array_length(p_packet->'global_rows')<>
         (select count(*) from public.koaptix_latest_board_generation_global_row r
          where r.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id'-'surface_code' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_global_row,
              p_packet->'global_rows'
            ) x
            except
            select to_jsonb(r)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_global_row r
            where r.generation_id=v_generation_id)
           union all
           (select to_jsonb(r)-'generation_id'-'surface_code'
            from public.koaptix_latest_board_generation_global_row r
            where r.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'-'surface_code'
            from jsonb_populate_recordset(
              null::public.koaptix_latest_board_generation_global_row,
              p_packet->'global_rows'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse global-row collision';
    end if;

    if jsonb_array_length(p_packet->'history_stage_rows')<>
         (select count(*) from public.koaptix_rank_publication_history_stage h
          where h.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_rank_publication_history_stage,
              p_packet->'history_stage_rows'
            ) x
            except
            select to_jsonb(h)-'generation_id'
            from public.koaptix_rank_publication_history_stage h
            where h.generation_id=v_generation_id)
           union all
           (select to_jsonb(h)-'generation_id'
            from public.koaptix_rank_publication_history_stage h
            where h.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'
            from jsonb_populate_recordset(
              null::public.koaptix_rank_publication_history_stage,
              p_packet->'history_stage_rows'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse history-stage collision';
    end if;

    if jsonb_array_length(p_packet->'snapshot_stage_rows')<>
         (select count(*) from public.koaptix_rank_publication_snapshot_stage s
          where s.generation_id=v_generation_id)
       or exists (
         select 1 from (
           (select to_jsonb(x)-'generation_id' as row_value
            from jsonb_populate_recordset(
              null::public.koaptix_rank_publication_snapshot_stage,
              p_packet->'snapshot_stage_rows'
            ) x
            except
            select to_jsonb(s)-'generation_id'
            from public.koaptix_rank_publication_snapshot_stage s
            where s.generation_id=v_generation_id)
           union all
           (select to_jsonb(s)-'generation_id'
            from public.koaptix_rank_publication_snapshot_stage s
            where s.generation_id=v_generation_id
            except
            select to_jsonb(x)-'generation_id'
            from jsonb_populate_recordset(
              null::public.koaptix_rank_publication_snapshot_stage,
              p_packet->'snapshot_stage_rows'
            ) x)
         ) mismatch
       ) then
      raise exception 'BUILD_GENERATION idempotent reuse snapshot-stage collision';
    end if;
  else
    perform public.koaptix_insert_latest_board_generation_packet(
      p_packet,'SEALED_RANK_INPUT_MANIFEST',p_packet->>'input_manifest_run_id',
      p_packet->>'input_manifest_run_id',v_target_date,v_affected,true
    );
  end if;
  perform public.koaptix_assert_rank_input_authority(
    p_packet->>'input_manifest_run_id',v_target_date,p_packet
  );
  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  set constraints all immediate;

  return jsonb_build_object(
    'action','BUILD_GENERATION','outcome','VERIFIED_INACTIVE',
    'generation_id',v_generation_id,
    'expected_active_generation_id',v_expected_active,
    'expected_publication_version',v_expected_version,
    'history_stage_rows',(select count(*) from public.koaptix_rank_publication_history_stage
                          where generation_id=v_generation_id),
    'snapshot_stage_rows',(select count(*) from public.koaptix_rank_publication_snapshot_stage
                           where generation_id=v_generation_id),
    'verification',v_verification,'official_history_rows_written',0,
    'official_snapshot_rows_written',0,'publication_events_written',0,
    'pointer_rows_changed',0,'automatic_retry_count',0
  );
end;
$function$;

create or replace function public.koaptix_publish_latest_board_generation(
  p_packet jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[]:=array[
    'schema_version','action','plan_run_id','execution_run_id',
    'authorization_proof_exact','automatic_retry','generation_id','target_rank_date',
    'input_manifest_run_id','expected_active_generation_id',
    'expected_publication_version','affected_universe_codes',
    'market_cap_set_sha256','eligibility_set_sha256','source_set_sha256',
    'selected_input_sha256','membership_set_sha256','affected_universe_set_sha256',
    'event_id','recorded_at'
  ];
  v_generation_id uuid;
  v_event_id uuid;
  v_expected_active uuid;
  v_target_date date;
  v_recorded_at timestamptz;
  v_expected_version bigint;
  v_affected text[];
  v_pointer public.koaptix_latest_board_publication%rowtype;
  v_generation public.koaptix_latest_board_generation%rowtype;
  v_history_count bigint;
  v_snapshot_count bigint;
  v_changed bigint;
begin
  perform public.koaptix_assert_latest_board_action_packet_header(
    p_packet,v_required_keys,'PUBLISH_GENERATION',
    'SEPARATE_EXACT_GENERATION_ATOMIC_PUBLICATION_APPROVAL'
  );
  if jsonb_typeof(p_packet->'generation_id')<>'string'
     or jsonb_typeof(p_packet->'event_id')<>'string'
     or jsonb_typeof(p_packet->'expected_active_generation_id')<>'string'
     or jsonb_typeof(p_packet->'target_rank_date')<>'string'
     or jsonb_typeof(p_packet->'input_manifest_run_id')<>'string'
     or jsonb_typeof(p_packet->'recorded_at')<>'string'
     or jsonb_typeof(p_packet->'expected_publication_version')<>'number'
     or p_packet->>'expected_publication_version' !~ '^[1-9][0-9]*$'
     or jsonb_typeof(p_packet->'affected_universe_codes')<>'array'
     or exists (
       select 1 from unnest(array[
         'market_cap_set_sha256','eligibility_set_sha256','source_set_sha256',
         'selected_input_sha256','membership_set_sha256','affected_universe_set_sha256'
       ]) k(key_name)
       where jsonb_typeof(p_packet->key_name)<>'string'
          or p_packet->>key_name !~ '^[0-9A-F]{64}$'
     ) then
    raise exception 'PUBLISH_GENERATION packet JSON types are invalid';
  end if;
  v_generation_id:=(p_packet->>'generation_id')::uuid;
  v_event_id:=(p_packet->>'event_id')::uuid;
  v_expected_active:=(p_packet->>'expected_active_generation_id')::uuid;
  v_target_date:=(p_packet->>'target_rank_date')::date;
  v_recorded_at:=(p_packet->>'recorded_at')::timestamptz;
  v_expected_version:=(p_packet->>'expected_publication_version')::bigint;
  v_affected:=array(
    select jsonb_array_elements_text(p_packet->'affected_universe_codes')
  );
  if v_generation_id::text<>p_packet->>'generation_id'
     or v_event_id::text<>p_packet->>'event_id'
     or v_expected_active::text<>p_packet->>'expected_active_generation_id'
     or v_target_date::text<>p_packet->>'target_rank_date'
     or btrim(p_packet->>'input_manifest_run_id')=''
     or not public.koaptix_text_array_is_distinct_nonblank(v_affected)
     or v_affected is distinct from
        (select array_agg(code order by code) from unnest(v_affected) u(code))
     or v_recorded_at>transaction_timestamp() then
    raise exception 'PUBLISH_GENERATION identifiers, affected set, or timestamp are invalid';
  end if;

  select * into strict v_pointer
  from public.koaptix_latest_board_publication
  where singleton_id=true
  for update nowait;
  if v_pointer.active_generation_id is distinct from v_expected_active
     or v_pointer.publication_version is distinct from v_expected_version then
    raise exception 'PUBLISH_GENERATION pointer compare-and-swap precondition failed';
  end if;

  select * into strict v_generation
  from public.koaptix_latest_board_generation
  where generation_id=v_generation_id;
  if v_generation.plan_run_id is distinct from p_packet->>'plan_run_id'
     or v_generation.source_authority_kind<>'SEALED_RANK_INPUT_MANIFEST'
     or v_generation.input_manifest_run_id is distinct from
        p_packet->>'input_manifest_run_id'
     or v_generation.affected_rank_date is distinct from v_target_date
     or v_generation.affected_universe_codes is distinct from v_affected
     or v_recorded_at<v_generation.verified_at then
    raise exception 'PUBLISH_GENERATION packet does not identify the immutable generation';
  end if;
  perform public.koaptix_assert_rank_input_authority(
    p_packet->>'input_manifest_run_id',v_target_date,p_packet
  );
  perform public.koaptix_verify_latest_board_generation(v_generation_id);

  select count(*) into v_history_count
  from public.koaptix_rank_publication_history_stage
  where generation_id=v_generation_id;
  select count(*) into v_snapshot_count
  from public.koaptix_rank_publication_snapshot_stage
  where generation_id=v_generation_id;
  if v_history_count=0 or v_snapshot_count=0
     or exists (
       select 1 from public.complex_rank_history h where h.snapshot_date=v_target_date
     )
     or exists (
       select 1 from public.koaptix_rank_snapshot s
       where s.snapshot_date=v_target_date and s.universe_code=any(v_affected)
     ) then
    raise exception 'PUBLISH_GENERATION official collision or empty candidate stage';
  end if;

  insert into public.complex_rank_history(
    snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap
  )
  select snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap
  from public.koaptix_rank_publication_history_stage
  where generation_id=v_generation_id
  order by rank_all;
  get diagnostics v_changed=row_count;
  if v_changed<>v_history_count then
    raise exception 'PUBLISH_GENERATION history insert count mismatch';
  end if;

  insert into public.koaptix_rank_snapshot(
    snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
    market_cap_share,previous_rank_all,rank_delta_1d,is_top1000,
    rank_method,calculation_version,created_at
  )
  select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
         market_cap_share,previous_rank_all,rank_delta_1d,is_top1000,
         rank_method,calculation_version,created_at
  from public.koaptix_rank_publication_snapshot_stage
  where generation_id=v_generation_id
  order by universe_code,rank_all;
  get diagnostics v_changed=row_count;
  if v_changed<>v_snapshot_count then
    raise exception 'PUBLISH_GENERATION snapshot insert count mismatch';
  end if;

  if exists (
    select h.snapshot_date,h.complex_id,h.market_cap_krw,h.rank_all,h.total_market_cap
    from public.complex_rank_history h
    where h.snapshot_date=v_target_date
    except
    select s.snapshot_date,s.complex_id,s.market_cap_krw,s.rank_all,s.total_market_cap
    from public.koaptix_rank_publication_history_stage s
    where s.generation_id=v_generation_id
  ) or exists (
    select s.snapshot_date,s.complex_id,s.market_cap_krw,s.rank_all,s.total_market_cap
    from public.koaptix_rank_publication_history_stage s
    where s.generation_id=v_generation_id
    except
    select h.snapshot_date,h.complex_id,h.market_cap_krw,h.rank_all,h.total_market_cap
    from public.complex_rank_history h
    where h.snapshot_date=v_target_date
  ) or exists (
    select s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
           s.market_cap_share::numeric,s.previous_rank_all,s.rank_delta_1d,s.is_top1000,
           s.rank_method,s.calculation_version,s.created_at
    from public.koaptix_rank_snapshot s
    where s.snapshot_date=v_target_date and s.universe_code=any(v_affected)
    except
    select c.snapshot_date,c.universe_code,c.complex_id,c.rank_all,c.market_cap_krw,
           c.market_cap_share::numeric,c.previous_rank_all,c.rank_delta_1d,c.is_top1000,
           c.rank_method,c.calculation_version,c.created_at
    from public.koaptix_rank_publication_snapshot_stage c
    where c.generation_id=v_generation_id
  ) or exists (
    select c.snapshot_date,c.universe_code,c.complex_id,c.rank_all,c.market_cap_krw,
           c.market_cap_share::numeric,c.previous_rank_all,c.rank_delta_1d,c.is_top1000,
           c.rank_method,c.calculation_version,c.created_at
    from public.koaptix_rank_publication_snapshot_stage c
    where c.generation_id=v_generation_id
    except
    select s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
           s.market_cap_share::numeric,s.previous_rank_all,s.rank_delta_1d,s.is_top1000,
           s.rank_method,s.calculation_version,s.created_at
    from public.koaptix_rank_snapshot s
    where s.snapshot_date=v_target_date and s.universe_code=any(v_affected)
  ) then
    raise exception 'PUBLISH_GENERATION official rows differ from immutable candidate stage';
  end if;

  insert into public.koaptix_latest_board_publication_event(
    publication_version,event_id,event_type,from_generation_id,to_generation_id,
    plan_run_id,execution_run_id,expected_previous_version,recorded_at
  ) values (
    v_expected_version+1,v_event_id,'PUBLISH',v_expected_active,v_generation_id,
    p_packet->>'plan_run_id',p_packet->>'execution_run_id',v_expected_version,
    v_recorded_at
  );
  update public.koaptix_latest_board_publication
  set active_event_id=v_event_id,
      active_generation_id=v_generation_id,
      previous_generation_id=v_expected_active,
      publication_version=v_expected_version+1,
      published_at=v_recorded_at
  where singleton_id=true
    and active_generation_id=v_expected_active
    and publication_version=v_expected_version;
  get diagnostics v_changed=row_count;
  if v_changed<>1 then
    raise exception 'PUBLISH_GENERATION pointer compare-and-swap changed % rows',v_changed;
  end if;
  set constraints all immediate;

  return jsonb_build_object(
    'action','PUBLISH_GENERATION','outcome','PUBLISHED',
    'generation_id',v_generation_id,'event_id',v_event_id,
    'publication_version',v_expected_version+1,
    'active_generation_id',v_generation_id,
    'previous_generation_id',v_expected_active,'published_at',v_recorded_at,
    'official_history_rows_written',v_history_count,
    'official_snapshot_rows_written',v_snapshot_count,
    'pointer_rows_changed',1,'automatic_retry_count',0
  );
end;
$function$;

create or replace function public.koaptix_rollback_latest_board_publication(
  p_packet jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[]:=array[
    'schema_version','action','plan_run_id','execution_run_id',
    'authorization_proof_exact','automatic_retry','failed_generation_id',
    'target_generation_id','expected_active_generation_id',
    'expected_previous_generation_id','expected_failed_event_id',
    'original_publication_execution_run_id',
    'expected_publication_version','event_id','recorded_at',
    'target_authority_kind','target_authority_key',
    'target_combined_surface_manifest_sha256','target_surface_components'
  ];
  v_failed_generation_id uuid;
  v_target_generation_id uuid;
  v_expected_active uuid;
  v_expected_previous uuid;
  v_expected_failed_event uuid;
  v_event_id uuid;
  v_expected_version bigint;
  v_recorded_at timestamptz;
  v_pointer public.koaptix_latest_board_publication%rowtype;
  v_failed_event public.koaptix_latest_board_publication_event%rowtype;
  v_target public.koaptix_latest_board_generation%rowtype;
  v_changed bigint;
begin
  perform public.koaptix_assert_latest_board_action_packet_header(
    p_packet,v_required_keys,'ROLLBACK_PUBLICATION',
    'SEPARATE_EXACT_PUBLICATION_ROLLBACK_APPROVAL'
  );
  if exists (
       select 1 from unnest(array[
         'failed_generation_id','target_generation_id','expected_active_generation_id',
         'expected_previous_generation_id','expected_failed_event_id','event_id',
         'recorded_at','original_publication_execution_run_id',
         'target_authority_kind','target_authority_key',
         'target_combined_surface_manifest_sha256'
       ]) k(key_name)
       where jsonb_typeof(p_packet->key_name)<>'string'
     )
     or jsonb_typeof(p_packet->'expected_publication_version')<>'number'
     or p_packet->>'expected_publication_version' !~ '^[1-9][0-9]*$'
     or jsonb_typeof(p_packet->'target_surface_components')<>'array'
     or p_packet->>'target_combined_surface_manifest_sha256' !~ '^[0-9A-F]{64}$'
     or not public.koaptix_jsonb_array_has_exact_object_keys(
       p_packet->'target_surface_components',array[
         'surface_code','snapshot_date','previous_snapshot_date','date_vector_sha256',
         'universe_count','row_count','full_row_digest_sha256',
         'component_manifest_sha256'
       ]::text[]
     )
     or jsonb_array_length(p_packet->'target_surface_components')<>2 then
    raise exception 'ROLLBACK_PUBLICATION packet JSON types or component keys are invalid';
  end if;
  v_failed_generation_id:=(p_packet->>'failed_generation_id')::uuid;
  v_target_generation_id:=(p_packet->>'target_generation_id')::uuid;
  v_expected_active:=(p_packet->>'expected_active_generation_id')::uuid;
  v_expected_previous:=(p_packet->>'expected_previous_generation_id')::uuid;
  v_expected_failed_event:=(p_packet->>'expected_failed_event_id')::uuid;
  v_event_id:=(p_packet->>'event_id')::uuid;
  v_expected_version:=(p_packet->>'expected_publication_version')::bigint;
  v_recorded_at:=(p_packet->>'recorded_at')::timestamptz;
  if v_failed_generation_id::text<>p_packet->>'failed_generation_id'
     or v_target_generation_id::text<>p_packet->>'target_generation_id'
     or v_expected_active::text<>p_packet->>'expected_active_generation_id'
     or v_expected_previous::text<>p_packet->>'expected_previous_generation_id'
     or v_expected_failed_event::text<>p_packet->>'expected_failed_event_id'
     or v_event_id::text<>p_packet->>'event_id'
     or v_event_id=v_expected_failed_event
     or v_failed_generation_id is distinct from v_expected_active
     or v_target_generation_id is distinct from v_expected_previous
     or v_failed_generation_id=v_target_generation_id
     or btrim(p_packet->>'original_publication_execution_run_id')=''
     or p_packet->>'execution_run_id'=
        p_packet->>'original_publication_execution_run_id'
     or btrim(p_packet->>'target_authority_key')=''
     or p_packet->>'target_authority_kind' not in (
       'BOOTSTRAP_COMPATIBILITY_BUNDLE','SEALED_RANK_INPUT_MANIFEST'
     )
     or v_recorded_at>transaction_timestamp() then
    raise exception 'ROLLBACK_PUBLICATION identifiers, authority, or timestamp are invalid';
  end if;

  select * into strict v_pointer
  from public.koaptix_latest_board_publication
  where singleton_id=true
  for update nowait;
  if v_pointer.active_generation_id is distinct from v_expected_active
     or v_pointer.previous_generation_id is distinct from v_expected_previous
     or v_pointer.active_event_id is distinct from v_expected_failed_event
     or v_pointer.publication_version is distinct from v_expected_version
     or v_recorded_at<v_pointer.published_at then
    raise exception 'ROLLBACK_PUBLICATION pointer precondition failed';
  end if;

  select * into strict v_failed_event
  from public.koaptix_latest_board_publication_event
  where event_id=v_expected_failed_event
  for share;
  if v_failed_event.event_type<>'PUBLISH'
     or v_failed_event.publication_version is distinct from v_expected_version
     or v_failed_event.from_generation_id is distinct from v_target_generation_id
     or v_failed_event.to_generation_id is distinct from v_failed_generation_id
     or v_failed_event.plan_run_id is distinct from p_packet->>'plan_run_id'
     or v_failed_event.execution_run_id is distinct from
        p_packet->>'original_publication_execution_run_id'
     or v_failed_event.expected_previous_version is distinct from
        v_expected_version-1
     or v_failed_event.recorded_at is distinct from v_pointer.published_at then
    raise exception 'ROLLBACK_PUBLICATION named original PUBLISH event mismatch';
  end if;

  select * into strict v_target
  from public.koaptix_latest_board_generation
  where generation_id=v_target_generation_id;
  if v_target.plan_run_id is distinct from p_packet->>'plan_run_id'
     or v_target.source_authority_kind is distinct from p_packet->>'target_authority_kind'
     or v_target.source_authority_key is distinct from p_packet->>'target_authority_key'
     or v_target.combined_surface_manifest_sha256 is distinct from
        p_packet->>'target_combined_surface_manifest_sha256'
     or public.koaptix_generation_surface_components_json(v_target_generation_id)
        is distinct from p_packet->'target_surface_components' then
    raise exception 'ROLLBACK_PUBLICATION target generation serialization mismatch';
  end if;
  perform public.koaptix_verify_latest_board_generation(v_target_generation_id);
  perform public.koaptix_assert_generation_authority(v_target_generation_id);

  insert into public.koaptix_latest_board_publication_event(
    publication_version,event_id,event_type,from_generation_id,to_generation_id,
    plan_run_id,execution_run_id,expected_previous_version,recorded_at
  ) values (
    v_expected_version+1,v_event_id,'ROLLBACK',v_failed_generation_id,
    v_target_generation_id,p_packet->>'plan_run_id',p_packet->>'execution_run_id',
    v_expected_version,v_recorded_at
  );
  update public.koaptix_latest_board_publication
  set active_event_id=v_event_id,
      active_generation_id=v_target_generation_id,
      previous_generation_id=v_failed_generation_id,
      publication_version=v_expected_version+1,
      published_at=v_recorded_at
  where singleton_id=true
    and active_event_id=v_expected_failed_event
    and active_generation_id=v_failed_generation_id
    and previous_generation_id=v_target_generation_id
    and publication_version=v_expected_version;
  get diagnostics v_changed=row_count;
  if v_changed<>1 then
    raise exception 'ROLLBACK_PUBLICATION pointer compare-and-swap changed % rows',v_changed;
  end if;
  set constraints all immediate;

  return jsonb_build_object(
    'action','ROLLBACK_PUBLICATION','outcome','ROLLED_BACK',
    'event_id',v_event_id,'publication_version',v_expected_version+1,
    'active_generation_id',v_target_generation_id,
    'previous_generation_id',v_failed_generation_id,'published_at',v_recorded_at,
    'original_publication_event_id',v_expected_failed_event,
    'original_publication_execution_run_id',v_failed_event.execution_run_id,
    'rollback_execution_run_id',p_packet->>'execution_run_id',
    'target_authority_kind',v_target.source_authority_kind,
    'target_authority_key',v_target.source_authority_key,
    'official_history_rows_retained',true,'official_snapshot_rows_retained',true,
    'pointer_rows_changed',1,'automatic_retry_count',0
  );
end;
$function$;

set local role koaptix_rank_publication_owner;

create view public.v_koaptix_latest_board_read_model_published
with (security_barrier=true)
as
select
  p.active_generation_id as generation_id,
  p.publication_version,
  e.event_id as publication_event_id,
  p.published_at,
  r.surface_code,
  r.snapshot_date,
  r.universe_code,
  r.universe_name,
  r.universe_scope,
  r.complex_id,
  r.apt_name_ko,
  r.sigungu_name,
  r.legal_dong_name,
  r.build_year,
  r.household_count,
  r.total_household_count,
  r.recovery_52w,
  r.rank_all,
  r.previous_rank_all,
  r.rank_delta_w,
  r.rank_movement,
  r.market_cap_krw,
  r.market_cap_trillion_krw,
  r.market_cap_share,
  r.market_cap_share_pct,
  r.tier_code,
  r.tier_label,
  r.tier_sort,
  r.is_top1000
from public.koaptix_latest_board_publication p
join public.koaptix_latest_board_publication_event e
  on e.event_id=p.active_event_id
 and e.publication_version=p.publication_version
 and e.to_generation_id=p.active_generation_id
 and e.recorded_at=p.published_at
join public.koaptix_latest_board_generation_row r
  on r.generation_id=p.active_generation_id
 and r.surface_code='UNIVERSE_SERVICE'
where p.singleton_id=true;

create view public.v_koaptix_latest_global_rank_board_published
with (security_barrier=true)
as
select
  p.active_generation_id as generation_id,
  p.publication_version,
  e.event_id as publication_event_id,
  p.published_at,
  r.snapshot_date,
  r.universe_code,
  r.complex_id,
  r.apt_name_ko,
  r.address_road,
  r.address_jibun,
  r.legal_dong_name,
  r.build_year,
  r.sigungu_code,
  r.sigungu_name,
  r.rank_all,
  r.tier_code,
  r.tier_label,
  r.tier_sort,
  r.market_cap_krw,
  r.market_cap_trillion_krw,
  r.market_cap_share,
  r.market_cap_share_pct,
  r.previous_rank_all,
  r.rank_delta_1d,
  r.rank_movement,
  r.is_top1000,
  r.total_household_count,
  r.household_count,
  r.priced_household_count,
  r.priced_household_ratio,
  r.total_cluster_count,
  r.priced_cluster_count,
  r.coverage_status,
  r.is_rank_eligible,
  r.eligibility_status,
  r.latitude,
  r.longitude,
  r.recovery_52w
from public.koaptix_latest_board_publication p
join public.koaptix_latest_board_publication_event e
  on e.event_id=p.active_event_id
 and e.publication_version=p.publication_version
 and e.to_generation_id=p.active_generation_id
 and e.recorded_at=p.published_at
join public.koaptix_latest_board_generation_global_row r
  on r.generation_id=p.active_generation_id
 and r.surface_code='GLOBAL_LATEST'
where p.singleton_id=true;

create view public.v_koaptix_latest_board_publication_currentness
with (security_barrier=true)
as
with identity as (
  select p.active_generation_id as generation_id,p.publication_version,
         e.event_id as publication_event_id,p.published_at,
         e.plan_run_id,e.execution_run_id
  from public.koaptix_latest_board_publication p
  join public.koaptix_latest_board_publication_event e
    on e.event_id=p.active_event_id
   and e.publication_version=p.publication_version
   and e.to_generation_id=p.active_generation_id
   and e.recorded_at=p.published_at
  where p.singleton_id=true
)
select i.generation_id,i.publication_version,i.publication_event_id,i.published_at,
       s.surface_code,'KOREA_ALL'::text as universe_code,
       s.snapshot_date,s.previous_snapshot_date as source_previous_snapshot_date,
       s.row_count,i.plan_run_id,i.execution_run_id,
       g.source_authority_kind,g.source_authority_key,
       s.date_vector_sha256 as source_date_vector_sha256,
       s.full_row_digest_sha256,s.component_manifest_sha256,
       g.combined_surface_manifest_sha256
from identity i
join public.koaptix_latest_board_generation g on g.generation_id=i.generation_id
join public.koaptix_latest_board_generation_surface s
  on s.generation_id=i.generation_id and s.surface_code='GLOBAL_LATEST'
union all
select i.generation_id,i.publication_version,i.publication_event_id,i.published_at,
       s.surface_code,u.universe_code,u.snapshot_date,u.previous_snapshot_date,
       u.expected_row_count,i.plan_run_id,i.execution_run_id,
       g.source_authority_kind,g.source_authority_key,
       s.date_vector_sha256,u.row_digest_sha256,s.component_manifest_sha256,
       g.combined_surface_manifest_sha256
from identity i
join public.koaptix_latest_board_generation g on g.generation_id=i.generation_id
join public.koaptix_latest_board_generation_surface s
  on s.generation_id=i.generation_id and s.surface_code='UNIVERSE_SERVICE'
join public.koaptix_latest_board_generation_universe u
  on u.generation_id=s.generation_id and u.surface_code=s.surface_code;

create view public.v_koaptix_latest_board_publication_summary
with (security_barrier=true)
as
select
  p.active_generation_id as generation_id,
  p.previous_generation_id,
  p.publication_version,
  e.event_id as publication_event_id,
  e.event_type,
  p.published_at,
  e.plan_run_id,
  e.execution_run_id,
  g.source_authority_kind,
  g.source_authority_key,
  g.input_manifest_run_id,
  g.affected_rank_date,
  g.affected_universe_codes,
  g.required_surface_codes,
  g.surface_count,
  g.total_component_row_count,
  g.combined_surface_manifest_sha256,
  gs.snapshot_date as global_snapshot_date,
  gs.previous_snapshot_date as global_previous_snapshot_date,
  gs.universe_count as global_universe_count,
  gs.row_count as global_row_count,
  gs.full_row_digest_sha256 as global_full_row_digest_sha256,
  gs.component_manifest_sha256 as global_component_manifest_sha256,
  ss.date_vector_sha256 as service_source_date_vector_sha256,
  ss.universe_count as service_universe_count,
  ss.row_count as service_row_count,
  ss.full_row_digest_sha256 as service_full_row_digest_sha256,
  ss.component_manifest_sha256 as service_component_manifest_sha256
from public.koaptix_latest_board_publication p
join public.koaptix_latest_board_publication_event e
  on e.event_id=p.active_event_id
 and e.publication_version=p.publication_version
 and e.to_generation_id=p.active_generation_id
 and e.recorded_at=p.published_at
join public.koaptix_latest_board_generation g
  on g.generation_id=p.active_generation_id
join public.koaptix_latest_board_generation_surface gs
  on gs.generation_id=g.generation_id and gs.surface_code='GLOBAL_LATEST'
join public.koaptix_latest_board_generation_surface ss
  on ss.generation_id=g.generation_id and ss.surface_code='UNIVERSE_SERVICE'
where p.singleton_id=true;

alter view public.v_koaptix_latest_board_read_model_published
  owner to koaptix_rank_publication_owner;
alter view public.v_koaptix_latest_global_rank_board_published
  owner to koaptix_rank_publication_owner;
alter view public.v_koaptix_latest_board_publication_currentness
  owner to koaptix_rank_publication_owner;
alter view public.v_koaptix_latest_board_publication_summary
  owner to koaptix_rank_publication_owner;

revoke all on public.v_koaptix_latest_board_read_model_published from public;
revoke all on public.v_koaptix_latest_global_rank_board_published from public;
revoke all on public.v_koaptix_latest_board_publication_currentness from public;
revoke all on public.v_koaptix_latest_board_publication_summary from public;
grant select on public.v_koaptix_latest_board_read_model_published
  to anon,authenticated,service_role;
grant select on public.v_koaptix_latest_global_rank_board_published
  to anon,authenticated,service_role;
grant select on public.v_koaptix_latest_board_publication_currentness
  to anon,authenticated,service_role;
grant select on public.v_koaptix_latest_board_publication_summary
  to anon,authenticated,service_role;

reset role;

do $function_owner_pass$
declare
  v_signature text;
  v_owner text;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_FUNCTION_OWNER_PASS_EXECUTOR';
  end if;
  foreach v_signature in array array[
    'public.koaptix_jsonb_has_exact_keys(jsonb,text[])',
    'public.koaptix_compact_jsonb_array(jsonb)',
    'public.koaptix_service_rows_digest(uuid,text)',
    'public.koaptix_global_rows_digest(uuid)',
    'public.koaptix_service_date_vector_digest(uuid)',
    'public.koaptix_reject_latest_board_immutable_mutation()',
    'public.koaptix_compact_jsonb_object(jsonb)',
    'public.koaptix_jsonb_array_has_exact_object_keys(jsonb,text[])',
    'public.koaptix_generation_surface_components_json(uuid)',
    'public.koaptix_surface_component_manifest_digest(uuid,text)',
    'public.koaptix_combined_surface_manifest_digest(uuid)',
    'public.koaptix_verify_latest_board_generation(uuid)',
    'public.koaptix_assert_rank_input_authority(text,date,jsonb)',
    'public.koaptix_assert_generation_authority(uuid)',
    'public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)',
    'public.koaptix_require_publication_event_pointer_commit()',
    'public.koaptix_guard_latest_board_publication_pointer()',
    'public.koaptix_assert_latest_board_action_packet_header(jsonb,text[],text,text)',
    'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
    'public.koaptix_build_rank_publication_generation(jsonb)',
    'public.koaptix_publish_latest_board_generation(jsonb)',
    'public.koaptix_rollback_latest_board_publication(jsonb)'
  ] loop
    if to_regprocedure(v_signature) is null then
      raise exception '903 function signature is missing: %',v_signature;
    end if;
    select pg_catalog.pg_get_userbyid(p.proowner) into v_owner
    from pg_catalog.pg_proc p where p.oid=to_regprocedure(v_signature);
    if v_owner is distinct from 'postgres' then
      raise exception using errcode='P0001',message='M903_FUNCTION_OWNER_PASS_PRE_OWNER';
    end if;
    execute format('alter function %s owner to koaptix_rank_publication_owner',v_signature);
  end loop;
end;
$function_owner_pass$;

set local role koaptix_rank_publication_owner;

do $function_acl_pass$
declare
  v_signature text;
  v_owner text;
begin
  if current_user<>'koaptix_rank_publication_owner' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_FUNCTION_ACL_PASS_EXECUTOR';
  end if;
  foreach v_signature in array array[
    'public.koaptix_jsonb_has_exact_keys(jsonb,text[])',
    'public.koaptix_compact_jsonb_array(jsonb)',
    'public.koaptix_service_rows_digest(uuid,text)',
    'public.koaptix_global_rows_digest(uuid)',
    'public.koaptix_service_date_vector_digest(uuid)',
    'public.koaptix_reject_latest_board_immutable_mutation()',
    'public.koaptix_compact_jsonb_object(jsonb)',
    'public.koaptix_jsonb_array_has_exact_object_keys(jsonb,text[])',
    'public.koaptix_generation_surface_components_json(uuid)',
    'public.koaptix_surface_component_manifest_digest(uuid,text)',
    'public.koaptix_combined_surface_manifest_digest(uuid)',
    'public.koaptix_verify_latest_board_generation(uuid)',
    'public.koaptix_assert_rank_input_authority(text,date,jsonb)',
    'public.koaptix_assert_generation_authority(uuid)',
    'public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)',
    'public.koaptix_require_publication_event_pointer_commit()',
    'public.koaptix_guard_latest_board_publication_pointer()',
    'public.koaptix_assert_latest_board_action_packet_header(jsonb,text[],text,text)',
    'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
    'public.koaptix_build_rank_publication_generation(jsonb)',
    'public.koaptix_publish_latest_board_generation(jsonb)',
    'public.koaptix_rollback_latest_board_publication(jsonb)'
  ] loop
    if to_regprocedure(v_signature) is null then
      raise exception '903 function signature is missing in ACL pass: %',v_signature;
    end if;
    select pg_catalog.pg_get_userbyid(p.proowner) into v_owner
    from pg_catalog.pg_proc p where p.oid=to_regprocedure(v_signature);
    if v_owner is distinct from 'koaptix_rank_publication_owner' then
      raise exception using errcode='P0001',message='M903_FUNCTION_ACL_PASS_PRE_OWNER';
    end if;
    execute format(
      'revoke all on function %s from public,anon,authenticated,service_role,'||
      'koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,'||
      'koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,'||
      'koaptix_rank_generation_builder,koaptix_rank_generation_publisher,'||
      'koaptix_rank_publication_rollback',v_signature
    );
  end loop;
end;
$function_acl_pass$;

reset role;

do $function_owner_acl_post$
declare
  v_signature text;
  v_owner text;
  v_count integer:=0;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M903_FUNCTION_OWNER_ACL_POST_EXECUTOR';
  end if;
  foreach v_signature in array array[
    'public.koaptix_jsonb_has_exact_keys(jsonb,text[])',
    'public.koaptix_compact_jsonb_array(jsonb)',
    'public.koaptix_service_rows_digest(uuid,text)',
    'public.koaptix_global_rows_digest(uuid)',
    'public.koaptix_service_date_vector_digest(uuid)',
    'public.koaptix_reject_latest_board_immutable_mutation()',
    'public.koaptix_compact_jsonb_object(jsonb)',
    'public.koaptix_jsonb_array_has_exact_object_keys(jsonb,text[])',
    'public.koaptix_generation_surface_components_json(uuid)',
    'public.koaptix_surface_component_manifest_digest(uuid,text)',
    'public.koaptix_combined_surface_manifest_digest(uuid)',
    'public.koaptix_verify_latest_board_generation(uuid)',
    'public.koaptix_assert_rank_input_authority(text,date,jsonb)',
    'public.koaptix_assert_generation_authority(uuid)',
    'public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)',
    'public.koaptix_require_publication_event_pointer_commit()',
    'public.koaptix_guard_latest_board_publication_pointer()',
    'public.koaptix_assert_latest_board_action_packet_header(jsonb,text[],text,text)',
    'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
    'public.koaptix_build_rank_publication_generation(jsonb)',
    'public.koaptix_publish_latest_board_generation(jsonb)',
    'public.koaptix_rollback_latest_board_publication(jsonb)'
  ] loop
    select pg_catalog.pg_get_userbyid(p.proowner) into v_owner
    from pg_catalog.pg_proc p where p.oid=to_regprocedure(v_signature);
    if v_owner is distinct from 'koaptix_rank_publication_owner' then
      raise exception using errcode='P0001',message='M903_FUNCTION_OWNER_ACL_POST_OWNER';
    end if;
    v_count:=v_count+1;
  end loop;
  if v_count<>22 then
    raise exception using errcode='P0001',message='M903_FUNCTION_OWNER_ACL_POST_COUNT';
  end if;
end;
$function_owner_acl_post$;

set local role koaptix_rank_publication_owner;

grant execute on function public.koaptix_seed_latest_board_compatibility_generation(jsonb)
  to koaptix_rank_bootstrap_seeder;
grant execute on function public.koaptix_build_rank_publication_generation(jsonb)
  to koaptix_rank_generation_builder;
grant execute on function public.koaptix_publish_latest_board_generation(jsonb)
  to koaptix_rank_generation_publisher;
grant execute on function public.koaptix_rollback_latest_board_publication(jsonb)
  to koaptix_rank_publication_rollback;

do $table_acl$
declare
  v_table text;
begin
  foreach v_table in array array[
    'koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
    'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
    'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
    'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
    'koaptix_latest_board_publication'
  ] loop
    execute format(
      'revoke all on table public.%I from public,anon,authenticated,service_role,'||
      'koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,'||
      'koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,'||
      'koaptix_rank_generation_builder,koaptix_rank_generation_publisher,'||
      'koaptix_rank_publication_rollback',v_table
    );
  end loop;
end;
$table_acl$;

-- Restore the two deliberate cross-owner rights after the blanket action/app revocation.
grant select on public.koaptix_latest_board_generation to koaptix_rank_authority_owner;
grant select,update on public.koaptix_latest_board_publication to koaptix_rank_authority_owner;

reset role;

revoke create on schema public from koaptix_rank_publication_owner restrict;
revoke koaptix_rank_publication_owner from postgres granted by postgres restrict;

do $koaptix_m903_owner_bootstrap_post$
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_POST_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_POST_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_POST_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_POST_TARGET_STATE';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M903_ACLEXPLODE_MULTIDIMENSIONAL_ACL_11';
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
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_POST_SCHEMA_ACL_EXPANSION';
  end if;
  for v_object in select * from (values
      ('RELATION','public.koaptix_latest_board_generation','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_generation_surface','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_generation_universe','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_generation_row','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_generation_global_row','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_rank_publication_history_stage','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_rank_publication_snapshot_stage','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_publication_event','koaptix_rank_publication_owner'),
      ('RELATION','public.koaptix_latest_board_publication','koaptix_rank_publication_owner'),
      ('RELATION','public.v_koaptix_latest_board_read_model_published','koaptix_rank_publication_owner'),
      ('RELATION','public.v_koaptix_latest_global_rank_board_published','koaptix_rank_publication_owner'),
      ('RELATION','public.v_koaptix_latest_board_publication_currentness','koaptix_rank_publication_owner'),
      ('RELATION','public.v_koaptix_latest_board_publication_summary','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_jsonb_has_exact_keys(jsonb,text[])','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_compact_jsonb_array(jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_service_rows_digest(uuid,text)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_global_rows_digest(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_service_date_vector_digest(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_reject_latest_board_immutable_mutation()','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_compact_jsonb_object(jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_jsonb_array_has_exact_object_keys(jsonb,text[])','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_generation_surface_components_json(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_surface_component_manifest_digest(uuid,text)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_combined_surface_manifest_digest(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_verify_latest_board_generation(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_assert_rank_input_authority(text,date,jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_assert_generation_authority(uuid)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_require_publication_event_pointer_commit()','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_guard_latest_board_publication_pointer()','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_assert_latest_board_action_packet_header(jsonb,text[],text,text)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_seed_latest_board_compatibility_generation(jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_build_rank_publication_generation(jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_publish_latest_board_generation(jsonb)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_rollback_latest_board_publication(jsonb)','koaptix_rank_publication_owner')
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
      raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_OWNER_MANIFEST';
    end if;
    v_owner_count:=v_owner_count+1;
  end loop;
  if v_owner_count<>35 then
    raise exception using errcode='P0001',message='M903_OWNER_BOOTSTRAP_OWNER_COUNT';
  end if;
end;
$koaptix_m903_owner_bootstrap_post$;
-- KOAPTIX_M903_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_END

do $assertions$
declare
  v_role text;
  v_relation text;
  v_privilege text;
  v_expected_function regprocedure;
  v_candidate_function regprocedure;
begin
  if (select count(*)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      join pg_catalog.pg_roles r on r.oid=c.relowner
      where n.nspname='public'
        and c.relname=any(array[
          'koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
          'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
          'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
          'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
          'koaptix_latest_board_publication'
        ])
        and r.rolname='koaptix_rank_publication_owner'
        and c.relrowsecurity and c.relforcerowsecurity)<>9 then
    raise exception '903 owner/forced-RLS relation assertion failed';
  end if;

  if (select count(*) from pg_catalog.pg_policies
      where schemaname='public' and tablename=any(array[
        'koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
        'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
        'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
        'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
        'koaptix_latest_board_publication'
      ]))<>12
     or exists (
       select required.policy_name
       from unnest(array[
         'koaptix_rank_pub_owner_all_gen','koaptix_rank_pub_owner_all_surface',
         'koaptix_rank_pub_owner_all_universe','koaptix_rank_pub_owner_all_service_row',
         'koaptix_rank_pub_owner_all_global_row','koaptix_rank_pub_owner_all_history_stage',
         'koaptix_rank_pub_owner_all_snapshot_stage','koaptix_rank_pub_owner_all_event',
         'koaptix_rank_pub_owner_all_pointer','koaptix_rank_authority_owner_select_generation',
         'koaptix_rank_authority_owner_select_publication',
         'koaptix_rank_authority_owner_update_publication'
       ]) required(policy_name)
       where not exists (
         select 1 from pg_catalog.pg_policies p
         where p.schemaname='public' and p.policyname=required.policy_name
       )
     ) then
    raise exception '903 exact policy assertion failed';
  end if;

  if not exists (
       select 1 from pg_catalog.pg_trigger t
       join pg_catalog.pg_class c on c.oid=t.tgrelid
       join pg_catalog.pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public'
         and c.relname='koaptix_latest_board_publication_event'
         and t.tgname='trg_koaptix_publication_event_requires_pointer_commit'
         and t.tgconstraint<>0 and t.tgdeferrable and t.tginitdeferred
         and not t.tgisinternal
     ) or not exists (
       select 1 from pg_catalog.pg_constraint c
       where c.conrelid='public.koaptix_latest_board_publication'::regclass
         and c.conname='koaptix_publication_event_tuple_fk'
         and c.contype='f'
     ) then
    raise exception '903 event/pointer composite or reverse constraint assertion failed';
  end if;

  foreach v_role in array array[
    'anon','authenticated','service_role','koaptix_rank_authority_reader',
    'koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker',
    'koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder',
    'koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'
  ] loop
    foreach v_relation in array array[
      'koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
      'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
      'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
      'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
      'koaptix_latest_board_publication'
    ] loop
      foreach v_privilege in array array[
        'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] loop
        if pg_catalog.has_table_privilege(
          v_role,format('public.%I',v_relation),v_privilege
        ) then
          raise exception 'unexpected direct table privilege: role %, relation %, privilege %',
            v_role,v_relation,v_privilege;
        end if;
      end loop;
    end loop;
  end loop;

  if exists (
    with protected_role(role_name) as (
      values
        ('koaptix_rank_authority_owner'),
        ('koaptix_rank_publication_owner'),
        ('koaptix_rank_authority_reader'),
        ('koaptix_rank_manifest_sealer'),
        ('koaptix_rank_manifest_revoker'),
        ('koaptix_rank_bootstrap_seeder'),
        ('koaptix_rank_generation_builder'),
        ('koaptix_rank_generation_publisher'),
        ('koaptix_rank_publication_rollback')
    ), expected (
      granted_role_name,member_role_name,grantor_role_name,
      admin_option,inherit_option,set_option
    ) as (
      select role_name,'postgres'::text,'supabase_admin'::text,
             true,false,false
      from protected_role
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
      where granted_role.rolname in (select role_name from protected_role)
         or member_role.rolname in (select role_name from protected_role)
    ), mismatch as (
      (select * from expected except all select * from actual)
      union all
      (select * from actual except all select * from expected)
    )
    select 1 from mismatch
  ) then
    raise exception using errcode='P0001',
      message='903 final security verification requires exact accepted post-M900 nine-edge recovery-role membership graph';
  end if;

  for v_role,v_expected_function in
    select * from (values
      ('koaptix_rank_bootstrap_seeder',
       'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure),
      ('koaptix_rank_generation_builder',
       'public.koaptix_build_rank_publication_generation(jsonb)'::regprocedure),
      ('koaptix_rank_generation_publisher',
       'public.koaptix_publish_latest_board_generation(jsonb)'::regprocedure),
      ('koaptix_rank_publication_rollback',
       'public.koaptix_rollback_latest_board_publication(jsonb)'::regprocedure)
    ) mapping(role_name,function_oid)
  loop
    foreach v_candidate_function in array array[
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure,
      'public.koaptix_build_rank_publication_generation(jsonb)'::regprocedure,
      'public.koaptix_publish_latest_board_generation(jsonb)'::regprocedure,
      'public.koaptix_rollback_latest_board_publication(jsonb)'::regprocedure
    ] loop
      if pg_catalog.has_function_privilege(v_role,v_candidate_function,'EXECUTE')
         is distinct from (v_candidate_function=v_expected_function) then
        raise exception '903 action-role EXECUTE mapping is not one-to-one for %',v_role;
      end if;
    end loop;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    join pg_catalog.pg_roles r on r.oid=p.proowner
    where n.nspname='public'
      and p.proname=any(array[
        'koaptix_seed_latest_board_compatibility_generation',
        'koaptix_build_rank_publication_generation',
        'koaptix_publish_latest_board_generation',
        'koaptix_rollback_latest_board_publication'
      ])
      and (not p.prosecdef or p.provolatile<>'v'
           or r.rolname<>'koaptix_rank_publication_owner'
           or not exists (
             select 1 from unnest(p.proconfig) cfg(value)
             where replace(value,' ','')='search_path=pg_catalog,public'
           ))
  ) then
    raise exception '903 SECURITY DEFINER owner/volatility/search_path assertion failed';
  end if;
end;
$assertions$;

commit;
