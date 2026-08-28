-- KOAPTIX run-local unapplied forward definition candidate.
-- run_id:
-- P-KOAPTIX-PRODUCTION-M903-BOOTSTRAP-COMPATIBILITY-V2-FORWARD-DEFINITION-SOURCE-CONTROL-AND-TOOLING-CANDIDATE-SYNTHESIS.0
-- migration_number = null
-- migration_number_status =
-- UNASSIGNED_NO_UNAMBIGUOUS_REPOSITORY_NUMBERING_AUTHORITY
-- candidate_status = UNAPPLIED_CANDIDATE_NOT_ACCEPTED_CONTROL
-- intended_future_tracked_path = null
-- This candidate is definition-only. It inserts no generation, event, pointer,
-- history, snapshot, service, global, or backfill rows and executes no seed action.
-- Runtime catalog assertions below are designed future qualification gates.
-- They are not claimed PASS by the source-only synthesis lane.

begin;

set local lock_timeout='5s';
set local statement_timeout='60s';

create temporary table pg_temp.koaptix_bootstrap_v2_function_prestate (
  signature text primary key,
  function_oid oid not null,
  owner_oid oid not null,
  function_acl aclitem[] null,
  volatility "char" not null,
  security_definer boolean not null,
  function_config text[] null,
  function_kind "char" not null,
  argument_types oidvector not null,
  return_type oid not null,
  source_sha256 text not null
) on commit drop;

insert into pg_temp.koaptix_bootstrap_v2_function_prestate
select s.signature,p.oid,p.proowner,p.proacl,p.provolatile,p.prosecdef,p.proconfig,
       p.prokind,p.proargtypes,p.prorettype,
       upper(encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'))
from unnest(array[
  'public.koaptix_verify_latest_board_generation(uuid)',
  'public.koaptix_assert_generation_authority(uuid)',
  'public.koaptix_guard_latest_board_publication_pointer()',
  'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'
]) s(signature)
cross join lateral (
  select p.*
  from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure(s.signature)
) p;

create temporary table pg_temp.koaptix_bootstrap_v2_constraint_prestate
on commit drop as
select c.oid,c.conname,c.contype,c.condeferrable,c.condeferred,
       c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
       c.conkey,c.confkey,
       pg_catalog.pg_get_constraintdef(c.oid,false) as definition,
       pg_catalog.pg_get_expr(c.conbin,c.conrelid,false) as expression
from pg_catalog.pg_constraint c
where c.conrelid='public.koaptix_latest_board_generation'::regclass;

create temporary table pg_temp.koaptix_bootstrap_v2_trigger_prestate
on commit drop as
select t.oid,t.tgrelid,t.tgfoid,t.tgtype,t.tgenabled,t.tgisinternal
from pg_catalog.pg_trigger t
where t.tgrelid='public.koaptix_latest_board_publication'::regclass
  and t.tgname='trg_koaptix_latest_board_publication_guard';

create temporary table pg_temp.koaptix_bootstrap_v2_row_prestate (
  generation_rows bigint not null,
  event_rows bigint not null,
  pointer_rows bigint not null,
  old_oid oid not null,
  old_conname name not null,
  old_contype "char" not null,
  old_condeferrable boolean not null,
  old_condeferred boolean not null,
  old_convalidated boolean not null,
  old_conislocal boolean not null,
  old_coninhcount integer not null,
  old_connoinherit boolean not null,
  old_conkey smallint[] not null,
  old_confkey smallint[] null,
  old_definition text not null,
  old_expression text not null
) on commit drop;

grant select on table pg_temp.koaptix_bootstrap_v2_row_prestate
  to koaptix_rank_publication_owner;

create temporary table pg_temp.koaptix_bootstrap_v2_bridge_prestate (
  schema_acl aclitem[] null,
  helper_acl aclitem[] null
) on commit drop;

insert into pg_temp.koaptix_bootstrap_v2_bridge_prestate
select n.nspacl,p.proacl
from pg_catalog.pg_namespace n
cross join pg_catalog.pg_proc p
where n.nspname='public'
  and p.oid=
    'public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure;

do $koaptix_bootstrap_v2_preflight$
declare
  v_definition text;
  v_role text;
  v_signature text;
  v_expected_volatility "char";
  v_expected_source_sha256 text;
  v_expected_signature text;
begin
  if session_user<>'postgres' or current_user<>'postgres' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_EXECUTOR_MISMATCH';
  end if;
  if pg_catalog.to_regclass('public.koaptix_latest_board_generation') is null
     or pg_catalog.to_regclass('public.koaptix_latest_board_publication_event') is null
     or pg_catalog.to_regclass('public.koaptix_latest_board_publication') is null then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_REQUIRED_RELATION_MISSING';
  end if;
  if pg_catalog.pg_get_userbyid(
       (select c.relowner from pg_catalog.pg_class c
        where c.oid='public.koaptix_latest_board_generation'::regclass)
     ) is distinct from 'koaptix_rank_publication_owner' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_GENERATION_OWNER_MISMATCH';
  end if;

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
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_MEMBERSHIP_GRAPH_MISMATCH';
  end if;

  if pg_catalog.pg_has_role(
       'postgres','koaptix_rank_authority_owner','SET'
     )
     or pg_catalog.pg_has_role(
       'postgres','koaptix_rank_publication_owner','SET'
     )
     or exists (
       select 1
       from pg_catalog.pg_auth_members am
       join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
       join pg_catalog.pg_roles member_role on member_role.oid=am.member
       join pg_catalog.pg_roles grantor_role on grantor_role.oid=am.grantor
       where granted_role.rolname in (
         'koaptix_rank_authority_owner','koaptix_rank_publication_owner'
       )
         and member_role.rolname='postgres'
         and grantor_role.rolname='postgres'
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_TEMP_MEMBERSHIP_ALREADY_ACTIVE';
  end if;

  if (select r.rolname
      from pg_catalog.pg_namespace n
      join pg_catalog.pg_roles r on r.oid=n.nspowner
      where n.nspname='public') is distinct from 'pg_database_owner'
     or not pg_catalog.has_schema_privilege(
       'koaptix_rank_publication_owner','public','USAGE'
     )
     or pg_catalog.has_schema_privilege(
       'koaptix_rank_publication_owner','public','CREATE'
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SCHEMA_AUTHORITY_MISMATCH';
  end if;

  if (select count(*) from pg_temp.koaptix_bootstrap_v2_bridge_prestate)<>1
     or (select pg_catalog.pg_get_userbyid(p.proowner)
         from pg_catalog.pg_proc p
         where p.oid=
           'public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure)
        is distinct from 'koaptix_rank_authority_owner'
     or not pg_catalog.has_function_privilege(
       'koaptix_rank_publication_owner',
       'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'postgres',
       'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_HELPER_AUTHORITY_MISMATCH';
  end if;

  if (select count(*) from pg_temp.koaptix_bootstrap_v2_function_prestate)<>4 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_FUNCTION_COUNT_MISMATCH';
  end if;
  -- These four source identities are derived from the exact tracked M903
  -- 181871-byte/E361687F958588BFDC21845C857EE1FA04061247CAB90288EC1EBBB04E32C682
  -- source.  Each value is SHA-256 over the UTF-8
  -- bytes between that function's $function$ delimiters, which is the exact
  -- text PostgreSQL materializes in pg_proc.prosrc (including its leading and
  -- trailing newline).  They bind the accepted M903 deployed predefinition;
  -- they are not hashes of this forward candidate's replacement bodies.
  for v_signature,v_expected_volatility,v_expected_source_sha256 in
    select * from (values
      ('public.koaptix_verify_latest_board_generation(uuid)','s'::"char",
       'F82596932EF4659057788CA2BC07466CFAE89068887713E914FF186E56C7BCF6'),
      ('public.koaptix_assert_generation_authority(uuid)','s'::"char",
       'DE2A97485CC4703BBAFD2055FEB8B1E8953508BDBEE574D2D284A5651076BD1A'),
      ('public.koaptix_guard_latest_board_publication_pointer()','v'::"char",
       'AF63309BDB95DCF0AA13211669B461DB6CCB679B8F105C19CEE0DD39443B8EAF'),
      ('public.koaptix_seed_latest_board_compatibility_generation(jsonb)','v'::"char",
       '5119B2010E41750B71168394A12DAFC44DA50F327E668B4E21583A74C9AD0172')
    ) expected(signature,volatility,source_sha256)
  loop
    if not exists (
      select 1
      from pg_temp.koaptix_bootstrap_v2_function_prestate p
      where p.signature=v_signature
        and p.volatility=v_expected_volatility
        and p.security_definer
        and p.function_kind='f'
        and p.source_sha256=v_expected_source_sha256
        and pg_catalog.pg_get_userbyid(p.owner_oid)=
            'koaptix_rank_publication_owner'
        and exists (
          select 1
          from unnest(p.function_config) cfg(value)
          where replace(value,' ','')='search_path=pg_catalog,public'
        )
    ) then
      raise exception using errcode='P0001',
        message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_FUNCTION_PROPERTY_MISMATCH',
        detail=v_signature;
    end if;
  end loop;

  if (select count(*) from pg_temp.koaptix_bootstrap_v2_trigger_prestate)<>1
     or exists (
       select 1
       from pg_temp.koaptix_bootstrap_v2_trigger_prestate t
       where t.tgfoid<>
         'public.koaptix_guard_latest_board_publication_pointer()'::regprocedure
         or t.tgisinternal
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_POINTER_TRIGGER_BINDING_MISMATCH';
  end if;

  if (select count(*)
      from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
      where p.contype='c'
        and not p.condeferrable
        and not p.condeferred
        and p.convalidated
        and p.conislocal
        and p.coninhcount=0
        and not p.connoinherit
        and p.conkey=array[4,5,6,7,8]::smallint[])<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_OLD_CHECK_CARDINALITY_MISMATCH';
  end if;

  select p.definition into strict v_definition
  from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
  where p.contype='c'
    and not p.condeferrable
    and not p.condeferred
    and p.convalidated
    and p.conislocal
    and p.coninhcount=0
    and not p.connoinherit
    and p.conkey=array[4,5,6,7,8]::smallint[];

  if v_definition is null
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE_V1' in v_definition)=0
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE_V2' in v_definition)<>0
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE' in v_definition)=0
     or position('SEALED_RANK_INPUT_MANIFEST' in v_definition)=0
     or position('source_authority_key = input_manifest_run_id' in v_definition)=0
     or position('input_manifest_run_id IS NULL' in v_definition)=0
     or position('affected_rank_date IS NULL' in v_definition)=0
     or position('affected_universe_codes = ARRAY[]::text[]' in v_definition)=0
     or position('koaptix_text_array_is_distinct_nonblank' in v_definition)=0 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_EXACT_M903_CHECK_MISMATCH';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) acl
    where p.oid=any(array[
      'public.koaptix_verify_latest_board_generation(uuid)'::regprocedure,
      'public.koaptix_assert_generation_authority(uuid)'::regprocedure,
      'public.koaptix_guard_latest_board_publication_pointer()'::regprocedure,
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
    ])
      and acl.grantee=0
      and acl.privilege_type='EXECUTE'
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_PUBLIC_EXECUTE_EXPOSED';
  end if;

  foreach v_role in array array[
    'anon','authenticated','service_role',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    if pg_catalog.has_function_privilege(
         v_role,
         'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
         'EXECUTE'
       ) then
      raise exception using errcode='P0001',
        message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_UNEXPECTED_SEED_EXECUTE',
        detail=v_role;
    end if;
  end loop;
  if pg_catalog.has_function_privilege(
       'koaptix_rank_bootstrap_seeder',
       'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
       'EXECUTE'
     ) is distinct from true then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SEEDER_EXECUTE_MISSING';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and coalesce(pg_catalog.array_ndims(
            coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SEED_ACL_MULTIDIMENSIONAL';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname='koaptix_rank_bootstrap_seeder'
    cross join lateral pg_catalog.unnest(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(
      array[acl_source.acl_item]::aclitem[]
    ) acl
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and (
        acl.privilege_type<>'EXECUTE'
        or not (
          acl.grantee=p.proowner
          or (
            acl.grantee=allowed_role.oid
            and acl.grantor=p.proowner
            and not acl.is_grantable
          )
        )
      )
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SEED_DIRECT_ACL_MISMATCH';
  end if;
  if (select count(*)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_roles allowed_role
        on allowed_role.rolname='koaptix_rank_bootstrap_seeder'
      cross join lateral pg_catalog.unnest(
        coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(
        array[acl_source.acl_item]::aclitem[]
      ) acl
      where p.oid=
        'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
        and acl.privilege_type='EXECUTE'
        and acl.grantee=allowed_role.oid
        and acl.grantor=p.proowner
        and not acl.is_grantable)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SEED_EXACT_GRANT_MISSING';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper
     and role_row.oid<>p.proowner
     and role_row.rolname is distinct from 'koaptix_rank_bootstrap_seeder'
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and pg_catalog.has_function_privilege(role_row.oid,p.oid,'EXECUTE')
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_SEED_EFFECTIVE_GRANTEE_MISMATCH';
  end if;

  foreach v_signature in array array[
    'public.koaptix_verify_latest_board_generation(uuid)',
    'public.koaptix_assert_generation_authority(uuid)',
    'public.koaptix_guard_latest_board_publication_pointer()'
  ] loop
    foreach v_role in array array[
      'anon','authenticated','service_role',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker',
      'koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder',
      'koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'
    ] loop
      if pg_catalog.has_function_privilege(v_role,v_signature,'EXECUTE') then
        raise exception using errcode='P0001',
          message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_INTERNAL_EXECUTE_EXPOSED',
          detail=v_signature||' -> '||v_role;
      end if;
    end loop;
  end loop;

  foreach v_role in array array[
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    v_expected_signature:=case v_role
      when 'koaptix_rank_authority_reader'
        then 'public.koaptix_compute_rank_input_authority(date)'
      when 'koaptix_rank_manifest_sealer'
        then 'public.koaptix_seal_rank_input_manifest(jsonb)'
      when 'koaptix_rank_manifest_revoker'
        then 'public.koaptix_revoke_rank_input_manifest(jsonb)'
      when 'koaptix_rank_bootstrap_seeder'
        then 'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'
      when 'koaptix_rank_generation_builder'
        then 'public.koaptix_build_rank_publication_generation(jsonb)'
      when 'koaptix_rank_generation_publisher'
        then 'public.koaptix_publish_latest_board_generation(jsonb)'
      when 'koaptix_rank_publication_rollback'
        then 'public.koaptix_rollback_latest_board_publication(jsonb)'
    end;
    foreach v_signature in array array[
      'public.koaptix_compute_rank_input_authority(date)',
      'public.koaptix_seal_rank_input_manifest(jsonb)',
      'public.koaptix_revoke_rank_input_manifest(jsonb)',
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
      'public.koaptix_build_rank_publication_generation(jsonb)',
      'public.koaptix_publish_latest_board_generation(jsonb)',
      'public.koaptix_rollback_latest_board_publication(jsonb)'
    ] loop
      if pg_catalog.has_function_privilege(
           v_role,pg_catalog.to_regprocedure(v_signature),'EXECUTE'
         ) is distinct from (v_signature=v_expected_signature) then
        raise exception using errcode='P0001',
          message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_ACTION_MATRIX_MISMATCH',
          detail=v_role||' -> '||v_signature;
      end if;
    end loop;
  end loop;
end;
$koaptix_bootstrap_v2_preflight$;

grant koaptix_rank_authority_owner to postgres
  with admin false, inherit false, set true granted by postgres;
grant koaptix_rank_publication_owner to postgres
  with admin false, inherit false, set true granted by postgres;

do $koaptix_bootstrap_v2_bridge_membership_active$
begin
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
    ), target_role(role_name) as (
      values
        ('koaptix_rank_authority_owner'),
        ('koaptix_rank_publication_owner')
    ), expected (
      granted_role_name,member_role_name,grantor_role_name,
      admin_option,inherit_option,set_option
    ) as (
      select role_name,'postgres'::text,'supabase_admin'::text,
             true,false,false
      from protected_role
      union all
      select role_name,'postgres'::text,'postgres'::text,
             false,false,true
      from target_role
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
  )
  or not pg_catalog.pg_has_role(
    'postgres','koaptix_rank_authority_owner','SET'
  )
  or not pg_catalog.pg_has_role(
    'postgres','koaptix_rank_publication_owner','SET'
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_BRIDGE_ACTIVE_MEMBERSHIP_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_bridge_membership_active$;

grant create on schema public to koaptix_rank_publication_owner;

do $koaptix_bootstrap_v2_bridge_schema_active$
begin
  if not pg_catalog.has_schema_privilege(
       'koaptix_rank_publication_owner','public','USAGE'
     )
     or not pg_catalog.has_schema_privilege(
       'koaptix_rank_publication_owner','public','CREATE'
     )
     or exists (
       select 1
       from pg_catalog.pg_namespace n
       cross join lateral pg_catalog.unnest(
         coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
       ) with ordinality acl_source(acl_item,acl_ordinal)
       cross join lateral pg_catalog.aclexplode(
         array[acl_source.acl_item]::aclitem[]
       ) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       where n.nspname='public'
         and acl.privilege_type='CREATE'
         and coalesce(grantee.rolname,'PUBLIC') not in (
           'pg_database_owner','koaptix_rank_publication_owner'
         )
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_BRIDGE_ACTIVE_SCHEMA_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_bridge_schema_active$;

set local role koaptix_rank_authority_owner;

do $koaptix_bootstrap_v2_bridge_authority_role$
begin
  if current_user<>'koaptix_rank_authority_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_BRIDGE_AUTHORITY_ROLE_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_bridge_authority_role$;

grant execute on function
  public.koaptix_text_array_is_distinct_nonblank(text[])
  to postgres granted by koaptix_rank_authority_owner;

reset role;

do $koaptix_bootstrap_v2_bridge_helper_active$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or not pg_catalog.has_function_privilege(
       'postgres',
       'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     )
     or exists (
       with baseline (
         grantor_role,grantee_role,privilege_type,is_grantable
       ) as (
         select grantor.rolname::text,
                coalesce(grantee.rolname,'PUBLIC')::text,
                acl.privilege_type::text,acl.is_grantable
         from pg_temp.koaptix_bootstrap_v2_bridge_prestate b
         cross join lateral pg_catalog.unnest(
           coalesce(
             b.helper_acl,
             pg_catalog.acldefault(
               'f',
               (select p.proowner
                from pg_catalog.pg_proc p
                where p.oid=
                  'public.koaptix_text_array_is_distinct_nonblank(text[])'
                    ::regprocedure)
             )
           )
         ) with ordinality acl_source(acl_item,acl_ordinal)
         cross join lateral pg_catalog.aclexplode(
           array[acl_source.acl_item]::aclitem[]
         ) acl
         join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
         left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       ), current_acl (
         grantor_role,grantee_role,privilege_type,is_grantable
       ) as (
         select grantor.rolname::text,
                coalesce(grantee.rolname,'PUBLIC')::text,
                acl.privilege_type::text,acl.is_grantable
         from pg_catalog.pg_proc p
         cross join lateral pg_catalog.unnest(
           coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
         ) with ordinality acl_source(acl_item,acl_ordinal)
         cross join lateral pg_catalog.aclexplode(
           array[acl_source.acl_item]::aclitem[]
         ) acl
         join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
         left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
         where p.oid=
           'public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
       ), expected_added as (
         select 'koaptix_rank_authority_owner'::text as grantor_role,
                'postgres'::text as grantee_role,
                'EXECUTE'::text as privilege_type,
                false as is_grantable
       ), actual_added as (
         select * from current_acl
         except all
         select * from baseline
       ), removed as (
         select * from baseline
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
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_BRIDGE_ACTIVE_HELPER_ACL_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_bridge_helper_active$;

create temporary table
  pg_temp.koaptix_bootstrap_v2_expected_old_constraint
  (
    source_authority_kind text,
    source_authority_key text,
    input_manifest_run_id text,
    affected_rank_date date,
    affected_universe_codes text[]
  )
  on commit drop;

alter table pg_temp.koaptix_bootstrap_v2_expected_old_constraint
  add constraint koaptix_bootstrap_v2_expected_old_check
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
      and public.koaptix_text_array_is_distinct_nonblank(
        affected_universe_codes
      ))
  );

create temporary table
  pg_temp.koaptix_bootstrap_v2_expected_new_constraint
  (
    source_authority_kind text,
    source_authority_key text,
    input_manifest_run_id text,
    affected_rank_date date,
    affected_universe_codes text[]
  )
  on commit drop;

alter table pg_temp.koaptix_bootstrap_v2_expected_new_constraint
  add constraint koaptix_bootstrap_v2_expected_new_check
  check (
    (source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE'
      and source_authority_key in (
        'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
        'BOOTSTRAP_COMPATIBILITY_BUNDLE_V2'
      )
      and input_manifest_run_id is null
      and affected_rank_date is null
      and affected_universe_codes=array[]::text[])
    or
    (source_authority_kind='SEALED_RANK_INPUT_MANIFEST'
      and input_manifest_run_id is not null
      and affected_rank_date is not null
      and source_authority_key=input_manifest_run_id
      and public.koaptix_text_array_is_distinct_nonblank(
        affected_universe_codes
      ))
  );

insert into pg_temp.koaptix_bootstrap_v2_row_prestate (
  generation_rows,event_rows,pointer_rows,old_oid,old_conname,old_contype,
  old_condeferrable,old_condeferred,old_convalidated,old_conislocal,
  old_coninhcount,old_connoinherit,old_conkey,old_confkey,
  old_definition,old_expression
)
select
  (select count(*) from public.koaptix_latest_board_generation),
  (select count(*) from public.koaptix_latest_board_publication_event),
  (select count(*) from public.koaptix_latest_board_publication),
  p.oid,p.conname,p.contype,p.condeferrable,p.condeferred,
  p.convalidated,p.conislocal,p.coninhcount,p.connoinherit,
  p.conkey,p.confkey,p.definition,p.expression
from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
cross join pg_catalog.pg_constraint e
where e.conrelid=
      'pg_temp.koaptix_bootstrap_v2_expected_old_constraint'::regclass
  and e.conname='koaptix_bootstrap_v2_expected_old_check'
  and e.contype='c'
  and p.contype='c'
  and not p.condeferrable
  and not p.condeferred
  and p.convalidated
  and p.conislocal
  and p.coninhcount=0
  and not p.connoinherit
  and p.conkey=array[4,5,6,7,8]::smallint[]
  and p.definition=pg_catalog.pg_get_constraintdef(e.oid,false);

do $koaptix_bootstrap_v2_exact_old_constraint$
declare
  v_old record;
  v_expected text;
begin
  if (select count(*)
      from pg_temp.koaptix_bootstrap_v2_row_prestate)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_EXACT_OLD_CONSTRAINT_CARDINALITY_MISMATCH';
  end if;

  select r.* into strict v_old
  from pg_temp.koaptix_bootstrap_v2_row_prestate r;

  select pg_catalog.pg_get_constraintdef(c.oid,false)
    into strict v_expected
  from pg_catalog.pg_constraint c
  where c.conrelid=
        'pg_temp.koaptix_bootstrap_v2_expected_old_constraint'::regclass
    and c.conname='koaptix_bootstrap_v2_expected_old_check'
    and c.contype='c';

  if v_old.old_contype<>'c'
     or v_old.old_condeferrable
     or v_old.old_condeferred
     or not v_old.old_convalidated
     or not v_old.old_conislocal
     or v_old.old_coninhcount<>0
     or v_old.old_connoinherit
     or v_old.old_conkey is distinct from
        array[4,5,6,7,8]::smallint[]
     or v_old.old_definition is distinct from v_expected then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_EXACT_OLD_CONSTRAINT_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_exact_old_constraint$;

set local role koaptix_rank_publication_owner;

do $koaptix_bootstrap_v2_publication_owner_active$
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres'
     or not pg_catalog.has_schema_privilege(
       current_user,'public','CREATE'
     )
     or not pg_catalog.has_function_privilege(
       current_user,
       'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PUBLICATION_OWNER_ACTIVE_MISMATCH';
  end if;
end;
$koaptix_bootstrap_v2_publication_owner_active$;

do $koaptix_bootstrap_v2_row_prestate_gate$
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_ROW_PRESTATE_EXECUTOR_MISMATCH';
  end if;

  if (select count(*)
      from pg_temp.koaptix_bootstrap_v2_row_prestate)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_ROW_PRESTATE_CARDINALITY_MISMATCH';
  end if;

  if (select generation_rows from pg_temp.koaptix_bootstrap_v2_row_prestate)<>0
     or (select event_rows from pg_temp.koaptix_bootstrap_v2_row_prestate)<>0
     or (select pointer_rows from pg_temp.koaptix_bootstrap_v2_row_prestate)<>0 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_PREFLIGHT_NOT_EMPTY_INITIAL_CHAIN';
  end if;
end;
$koaptix_bootstrap_v2_row_prestate_gate$;

do $koaptix_bootstrap_v2_bounded_old_constraint_drop$
declare
  v_live_conname name;
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_DROP_EXECUTOR_MISMATCH';
  end if;

  if (select count(*)
      from pg_temp.koaptix_bootstrap_v2_row_prestate)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_DROP_TARGET_CARDINALITY_MISMATCH';
  end if;

  lock table public.koaptix_latest_board_generation
    in access exclusive mode;

  select c.conname into strict v_live_conname
  from pg_catalog.pg_constraint c
  cross join pg_temp.koaptix_bootstrap_v2_row_prestate r
  where c.conrelid='public.koaptix_latest_board_generation'::regclass
    and c.oid=r.old_oid
    and c.conname=r.old_conname
    and c.contype=r.old_contype
    and c.condeferrable=r.old_condeferrable
    and c.condeferred=r.old_condeferred
    and c.convalidated=r.old_convalidated
    and c.conislocal=r.old_conislocal
    and c.coninhcount=r.old_coninhcount
    and c.connoinherit=r.old_connoinherit
    and c.conkey=r.old_conkey
    and c.confkey is not distinct from r.old_confkey
    and pg_catalog.pg_get_constraintdef(c.oid,false)=r.old_definition
    and pg_catalog.pg_get_expr(c.conbin,c.conrelid,false)
        is not distinct from r.old_expression;

  execute pg_catalog.format(
    'ALTER TABLE public.koaptix_latest_board_generation DROP CONSTRAINT %I',
    v_live_conname
  );
end;
$koaptix_bootstrap_v2_bounded_old_constraint_drop$;

alter table public.koaptix_latest_board_generation
  add constraint koaptix_latest_board_generation_bootstrap_authority_v1_v2_check
  check (
    (source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE'
      and source_authority_key in (
        'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
        'BOOTSTRAP_COMPATIBILITY_BUNDLE_V2'
      )
      and input_manifest_run_id is null
      and affected_rank_date is null
      and affected_universe_codes=array[]::text[])
    or
    (source_authority_kind='SEALED_RANK_INPUT_MANIFEST'
      and input_manifest_run_id is not null
      and affected_rank_date is not null
      and source_authority_key=input_manifest_run_id
      and public.koaptix_text_array_is_distinct_nonblank(affected_universe_codes))
  );

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
    if v_generation.source_authority_key='BOOTSTRAP_COMPATIBILITY_BUNDLE_V1' then
      if v_generation.input_manifest_run_id is not null
         or v_generation.affected_rank_date is not null
         or v_generation.affected_universe_codes<>array[]::text[]
         or v_global.snapshot_date<>date '2026-07-31'
         or v_global.previous_snapshot_date is distinct from date '2026-07-30'
         or v_global.universe_count<>1 or v_global.row_count<>13497
         or v_global.full_row_digest_sha256<>
            'C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908'
         or v_global.component_manifest_sha256<>
            'DED5CE75CCD8B4A36F064AD59D3BF43F7DD1D8CEADD33AD43E9150ED7826DB6C'
         or v_service.snapshot_date is not null
         or v_service.previous_snapshot_date is not null
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
        raise exception 'bootstrap compatibility bundle V1 identity mismatch for generation %',p_generation_id;
      end if;
    elsif v_generation.source_authority_key='BOOTSTRAP_COMPATIBILITY_BUNDLE_V2' then
      if v_generation.input_manifest_run_id is not null
         or v_generation.affected_rank_date is not null
         or v_generation.affected_universe_codes<>array[]::text[]
         or v_global.snapshot_date<>date '2026-08-26'
         or v_global.previous_snapshot_date is distinct from date '2026-08-25'
         or v_global.universe_count<>1 or v_global.row_count<>13497
         or v_global.full_row_digest_sha256<>
            'E62394980D8A76FBEEAC8CDE7EED176934CE7280B7732ED4A4007B29E82B5FCB'
         or v_global.component_manifest_sha256<>
            'B7B2305831883D5018EECD5B557738C1741B0D6BD2392E18D319466507C5FF82'
         or v_service.snapshot_date is not null
         or v_service.previous_snapshot_date is not null
         or v_service.universe_count<>225 or v_service.row_count<>40484
         or v_service.date_vector_sha256<>
            '6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7'
         or v_service.full_row_digest_sha256<>
            'FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008'
         or v_service.component_manifest_sha256<>
            'A1CCACBCE1AF6EE106840E482A97A303813F096EA616F7D3837D865CFA8707E2'
         or v_generation.total_component_row_count<>53981
         or v_generation.combined_surface_manifest_sha256<>
            'D59ED800AD9E99F409E21AA57BFFDFE2D66F2971C2C4C622186A1844A6C3C1BD'
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
        raise exception 'bootstrap compatibility bundle V2 identity mismatch for generation %',p_generation_id;
      end if;
    else
      raise exception 'unknown bootstrap compatibility bundle key %',
        v_generation.source_authority_key;
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
    if v_generation.source_authority_key not in (
         'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
         'BOOTSTRAP_COMPATIBILITY_BUNDLE_V2'
       )
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

create or replace function public.koaptix_guard_latest_board_publication_pointer()
returns trigger
language plpgsql
volatile
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
       or v_generation.source_authority_key not in (
            'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
            'BOOTSTRAP_COMPATIBILITY_BUNDLE_V2'
          )
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
    'source_authority_kind','source_authority_key',
    'required_surface_codes','surface_components','service_universes','service_rows',
    'global_rows','combined_surface_manifest_sha256','event_id','recorded_at'
  ];
  v_generation_id uuid;
  v_generation public.koaptix_latest_board_generation%rowtype;
  v_event_id uuid;
  v_generated_at timestamptz;
  v_verified_at timestamptz;
  v_recorded_at timestamptz;
begin
  if p_packet is null
     or jsonb_typeof(p_packet) is distinct from 'object'
     or public.koaptix_jsonb_has_exact_keys(p_packet,v_required_keys)
        is distinct from true
     or jsonb_typeof(p_packet->'schema_version')<>'string'
     or jsonb_typeof(p_packet->'action')<>'string'
     or jsonb_typeof(p_packet->'plan_run_id')<>'string'
     or jsonb_typeof(p_packet->'execution_run_id')<>'string'
     or jsonb_typeof(p_packet->'authorization_proof_exact')<>'string'
     or jsonb_typeof(p_packet->'automatic_retry')<>'boolean'
     or jsonb_typeof(p_packet->'source_authority_kind')<>'string'
     or jsonb_typeof(p_packet->'source_authority_key')<>'string'
     or p_packet->>'schema_version'<>'koaptix-latest-board-packet-v2'
     or p_packet->>'action'<>'SEED_COMPATIBILITY'
     or p_packet->>'authorization_proof_exact'<>
        'SEPARATE_INITIAL_READ_MODEL_SEED_EXECUTION_APPROVAL'
     or btrim(p_packet->>'plan_run_id')=''
     or btrim(p_packet->>'execution_run_id')=''
     or p_packet->'automatic_retry'<>'false'::jsonb then
    raise exception 'SEED_COMPATIBILITY action packet header or exact key set is invalid';
  end if;
  if current_setting('transaction_isolation')<>'serializable' then
    raise exception 'SEED_COMPATIBILITY requires a SERIALIZABLE transaction';
  end if;
  if p_packet->>'source_authority_kind'<>'BOOTSTRAP_COMPATIBILITY_BUNDLE'
     or p_packet->>'source_authority_key' not in (
       'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1',
       'BOOTSTRAP_COMPATIBILITY_BUNDLE_V2'
     ) then
    raise exception 'SEED_COMPATIBILITY authority selector is invalid';
  end if;
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
    p_packet,p_packet->>'source_authority_kind',p_packet->>'source_authority_key',
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

  select * into strict v_generation
  from public.koaptix_latest_board_generation
  where generation_id=v_generation_id;
  perform public.koaptix_verify_latest_board_generation(v_generation_id);

  return jsonb_build_object(
    'action','SEED_COMPATIBILITY','outcome','PUBLISHED',
    'generation_id',v_generation_id,'event_id',v_event_id,
    'publication_version',1,'active_generation_id',v_generation_id,
    'previous_generation_id',null,'published_at',v_recorded_at,
    'surface_count',v_generation.surface_count,
    'total_component_rows',v_generation.total_component_row_count,
    'source_authority_kind',v_generation.source_authority_kind,
    'source_authority_key',v_generation.source_authority_key,
    'combined_surface_manifest_sha256',
      v_generation.combined_surface_manifest_sha256,
    'official_history_rows_written',0,'official_snapshot_rows_written',0,
    'automatic_retry_count',0
  );
end;
$function$;

do $koaptix_bootstrap_v2_definition_only_rows$
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres'
     or (select count(*) from pg_temp.koaptix_bootstrap_v2_row_prestate)<>1
     or (select count(*) from public.koaptix_latest_board_generation)<>
       (select generation_rows from pg_temp.koaptix_bootstrap_v2_row_prestate)
     or (select count(*) from public.koaptix_latest_board_publication_event)<>
       (select event_rows from pg_temp.koaptix_bootstrap_v2_row_prestate)
     or (select count(*) from public.koaptix_latest_board_publication)<>
       (select pointer_rows from pg_temp.koaptix_bootstrap_v2_row_prestate) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_DEFINITION_ONLY_ROW_DELTA';
  end if;
end;
$koaptix_bootstrap_v2_definition_only_rows$;

reset role;

revoke select on table pg_temp.koaptix_bootstrap_v2_row_prestate
  from koaptix_rank_publication_owner restrict;

revoke create on schema public
  from koaptix_rank_publication_owner restrict;

set local role koaptix_rank_authority_owner;

revoke execute on function
  public.koaptix_text_array_is_distinct_nonblank(text[])
  from postgres granted by koaptix_rank_authority_owner restrict;

reset role;

revoke koaptix_rank_authority_owner
  from postgres granted by postgres restrict;
revoke koaptix_rank_publication_owner
  from postgres granted by postgres restrict;

do $koaptix_bootstrap_v2_postcondition$
declare
  v_definition text;
  v_expected_definition text;
  v_role text;
  v_signature text;
  v_expected_signature text;
  v_expected_source_sha256 text;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_EXECUTOR_MISMATCH';
  end if;

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
  )
  or pg_catalog.pg_has_role(
    'postgres','koaptix_rank_authority_owner','SET'
  )
  or pg_catalog.pg_has_role(
    'postgres','koaptix_rank_publication_owner','SET'
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_MEMBERSHIP_RESTORATION_MISMATCH';
  end if;

  if exists (
    select 1
    from pg_temp.koaptix_bootstrap_v2_bridge_prestate b
    cross join pg_catalog.pg_namespace n
    cross join pg_catalog.pg_proc p
    where n.nspname='public'
      and p.oid=
        'public.koaptix_text_array_is_distinct_nonblank(text[])'::regprocedure
      and (
        n.nspacl is distinct from b.schema_acl
        or p.proacl is distinct from b.helper_acl
      )
  )
  or pg_catalog.has_schema_privilege(
    'koaptix_rank_publication_owner','public','CREATE'
  )
  or pg_catalog.has_function_privilege(
    'postgres',
    'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
  )
  or not pg_catalog.has_function_privilege(
    'koaptix_rank_publication_owner',
    'public.koaptix_text_array_is_distinct_nonblank(text[])','EXECUTE'
  )
  or pg_catalog.has_table_privilege(
    'koaptix_rank_publication_owner',
    'pg_temp.koaptix_bootstrap_v2_row_prestate','SELECT'
  )
  or pg_catalog.has_table_privilege(
    'koaptix_rank_publication_owner',
    'pg_temp.koaptix_bootstrap_v2_row_prestate','INSERT'
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_BRIDGE_ACL_RESTORATION_MISMATCH';
  end if;

  if exists (
    (select p.signature,p.function_oid,p.owner_oid,p.function_acl,p.volatility,
            p.security_definer,p.function_config,p.function_kind,
            p.argument_types,p.return_type
     from pg_temp.koaptix_bootstrap_v2_function_prestate p
     except all
     select p.signature,q.oid,q.proowner,q.proacl,q.provolatile,q.prosecdef,
            q.proconfig,q.prokind,q.proargtypes,q.prorettype
     from pg_temp.koaptix_bootstrap_v2_function_prestate p
     join pg_catalog.pg_proc q
       on q.oid=pg_catalog.to_regprocedure(p.signature))
    union all
    (select p.signature,q.oid,q.proowner,q.proacl,q.provolatile,q.prosecdef,
            q.proconfig,q.prokind,q.proargtypes,q.prorettype
     from pg_temp.koaptix_bootstrap_v2_function_prestate p
     join pg_catalog.pg_proc q
       on q.oid=pg_catalog.to_regprocedure(p.signature)
     except all
     select p.signature,p.function_oid,p.owner_oid,p.function_acl,p.volatility,
            p.security_definer,p.function_config,p.function_kind,
            p.argument_types,p.return_type
     from pg_temp.koaptix_bootstrap_v2_function_prestate p)
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_FUNCTION_CATALOG_IDENTITY_MISMATCH';
  end if;

  -- Exact intended postdefinition bodies, using the same pg_proc.prosrc UTF-8
  -- byte identity method as the tracked-M903 predefinition gates above.
  for v_signature,v_expected_source_sha256 in
    select * from (values
      ('public.koaptix_verify_latest_board_generation(uuid)',
       'F07B4052FD151EA52E1EDDE71CE6B51902734A251FBCDF7538597AF8452747E6'),
      ('public.koaptix_assert_generation_authority(uuid)',
       'A69E3E02A25980E0B6DD87BF7824C64D50592DD3783AB11E216832B64E4D6FED'),
      ('public.koaptix_guard_latest_board_publication_pointer()',
       'E7551AD719E533B44F2E17A11BFA9C5E88BCBD4B131712087C475332377DE9DC'),
      ('public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
       '49A5586B6ACDAF709C2F11C9EE39BCDBC2C0E20471E84D7F894C47B23FEB4943')
    ) expected(signature,source_sha256)
  loop
    if (select upper(encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'))
        from pg_catalog.pg_proc p
        where p.oid=pg_catalog.to_regprocedure(v_signature))
       is distinct from v_expected_source_sha256 then
      raise exception using errcode='P0001',
        message='BOOTSTRAP_V2_FORWARD_POST_FUNCTION_SOURCE_IDENTITY_MISMATCH',
        detail=v_signature;
    end if;
  end loop;

  select pg_catalog.pg_get_constraintdef(c.oid,false)
    into strict v_expected_definition
  from pg_catalog.pg_constraint c
  where c.conrelid=
        'pg_temp.koaptix_bootstrap_v2_expected_old_constraint'::regclass
    and c.conname='koaptix_bootstrap_v2_expected_old_check'
    and c.contype='c';

  if (select count(*)
      from pg_catalog.pg_constraint c
      where c.conrelid='public.koaptix_latest_board_generation'::regclass
        and c.contype='c'
        and not c.condeferrable
        and not c.condeferred
        and c.convalidated
        and c.conislocal
        and c.coninhcount=0
        and not c.connoinherit
        and c.conkey=array[4,5,6,7,8]::smallint[]
        and pg_catalog.pg_get_constraintdef(c.oid,false)=
            v_expected_definition)<>0 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_OLD_CHECK_REMAINS';
  end if;

  select pg_catalog.pg_get_constraintdef(c.oid,false)
    into strict v_expected_definition
  from pg_catalog.pg_constraint c
  where c.conrelid=
        'pg_temp.koaptix_bootstrap_v2_expected_new_constraint'::regclass
    and c.conname='koaptix_bootstrap_v2_expected_new_check'
    and c.contype='c';

  if (select count(*)
      from pg_catalog.pg_constraint c
      where c.conrelid='public.koaptix_latest_board_generation'::regclass
        and c.conname=
          'koaptix_latest_board_generation_bootstrap_authority_v1_v2_check'
        and c.contype='c'
        and not c.condeferrable
        and not c.condeferred
        and c.convalidated
        and c.conislocal
        and c.coninhcount=0
        and not c.connoinherit
        and c.conkey=array[4,5,6,7,8]::smallint[]
        and pg_catalog.pg_get_constraintdef(c.oid,false)=
            v_expected_definition)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_NEW_CHECK_CARDINALITY_MISMATCH';
  end if;

  select pg_catalog.pg_get_constraintdef(c.oid,false) into v_definition
  from pg_catalog.pg_constraint c
  where c.conrelid='public.koaptix_latest_board_generation'::regclass
    and c.conname=
      'koaptix_latest_board_generation_bootstrap_authority_v1_v2_check'
    and c.contype='c'
    and c.convalidated
    and c.conislocal
    and c.coninhcount=0
    and not c.connoinherit
    and c.conkey=array[4,5,6,7,8]::smallint[];

  select pg_catalog.pg_get_constraintdef(c.oid,false)
    into strict v_expected_definition
  from pg_catalog.pg_constraint c
  where c.conrelid=
        'pg_temp.koaptix_bootstrap_v2_expected_new_constraint'::regclass
    and c.conname='koaptix_bootstrap_v2_expected_new_check'
    and c.contype='c';

  if v_definition is distinct from v_expected_definition
     or v_definition is null
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE_V1' in v_definition)=0
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE_V2' in v_definition)=0
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE' in v_definition)=0
     or position('SEALED_RANK_INPUT_MANIFEST' in v_definition)=0
     or position('source_authority_key = input_manifest_run_id' in v_definition)=0
     or position('input_manifest_run_id IS NULL' in v_definition)=0
     or position('affected_rank_date IS NULL' in v_definition)=0
     or position('affected_universe_codes = ARRAY[]::text[]' in v_definition)=0
     or position('koaptix_text_array_is_distinct_nonblank' in v_definition)=0
     or position('BOOTSTRAP_COMPATIBILITY_BUNDLE_V3' in v_definition)<>0 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_EXACT_CLOSED_CHECK_MISMATCH';
  end if;

  if (select count(*)
      from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
      where p.contype='c'
        and p.conkey=array[14,13]::smallint[]
        and p.definition='CHECK ((verified_at >= generated_at))')<>1
     or (select count(*)
         from pg_catalog.pg_constraint c
         where c.conrelid=
               'public.koaptix_latest_board_generation'::regclass
           and c.contype='c'
           and c.conkey=array[14,13]::smallint[]
           and pg_catalog.pg_get_constraintdef(c.oid,false)=
               'CHECK ((verified_at >= generated_at))')<>1
     or exists (
       (select p.oid,p.conname,p.contype,p.condeferrable,p.condeferred,
               p.convalidated,p.conislocal,p.coninhcount,p.connoinherit,
               p.conkey,p.confkey,p.definition,p.expression
        from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
        where p.contype='c'
          and p.conkey=array[14,13]::smallint[]
          and p.definition='CHECK ((verified_at >= generated_at))'
        except all
        select c.oid,c.conname,c.contype,c.condeferrable,c.condeferred,
               c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
               c.conkey,c.confkey,
               pg_catalog.pg_get_constraintdef(c.oid,false),
               pg_catalog.pg_get_expr(c.conbin,c.conrelid,false)
        from pg_catalog.pg_constraint c
        where c.conrelid=
              'public.koaptix_latest_board_generation'::regclass
          and c.contype='c'
          and c.conkey=array[14,13]::smallint[]
          and pg_catalog.pg_get_constraintdef(c.oid,false)=
              'CHECK ((verified_at >= generated_at))')
       union all
       (select c.oid,c.conname,c.contype,c.condeferrable,c.condeferred,
               c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
               c.conkey,c.confkey,
               pg_catalog.pg_get_constraintdef(c.oid,false),
               pg_catalog.pg_get_expr(c.conbin,c.conrelid,false)
        from pg_catalog.pg_constraint c
        where c.conrelid=
              'public.koaptix_latest_board_generation'::regclass
          and c.contype='c'
          and c.conkey=array[14,13]::smallint[]
          and pg_catalog.pg_get_constraintdef(c.oid,false)=
              'CHECK ((verified_at >= generated_at))'
        except all
        select p.oid,p.conname,p.contype,p.condeferrable,p.condeferred,
               p.convalidated,p.conislocal,p.coninhcount,p.connoinherit,
               p.conkey,p.confkey,p.definition,p.expression
        from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
        where p.contype='c'
          and p.conkey=array[14,13]::smallint[]
          and p.definition='CHECK ((verified_at >= generated_at))')
     ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_TIMESTAMP_CHECK_CHANGED';
  end if;

  if exists (
    (select p.oid,p.conname,p.contype,p.condeferrable,p.condeferred,
            p.convalidated,p.conislocal,p.coninhcount,p.connoinherit,
            p.conkey,p.confkey,p.definition,p.expression
     from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
     where p.contype='c'
       and not exists (
         select 1
         from pg_temp.koaptix_bootstrap_v2_row_prestate r
         where r.old_oid=p.oid
       )
     except all
     select c.oid,c.conname,c.contype,c.condeferrable,c.condeferred,
            c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
            c.conkey,c.confkey,
            pg_catalog.pg_get_constraintdef(c.oid,false),
            pg_catalog.pg_get_expr(c.conbin,c.conrelid,false)
     from pg_catalog.pg_constraint c
     where c.conrelid='public.koaptix_latest_board_generation'::regclass
       and c.contype='c'
       and not (
         c.conname=
           'koaptix_latest_board_generation_bootstrap_authority_v1_v2_check'
         and not c.condeferrable
         and not c.condeferred
         and c.convalidated
         and c.conislocal
         and c.coninhcount=0
         and not c.connoinherit
         and c.conkey is not distinct from
             array[4,5,6,7,8]::smallint[]
         and pg_catalog.pg_get_constraintdef(c.oid,false)
             is not distinct from v_expected_definition
       ))
    union all
    (select c.oid,c.conname,c.contype,c.condeferrable,c.condeferred,
            c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
            c.conkey,c.confkey,
            pg_catalog.pg_get_constraintdef(c.oid,false),
            pg_catalog.pg_get_expr(c.conbin,c.conrelid,false)
     from pg_catalog.pg_constraint c
     where c.conrelid='public.koaptix_latest_board_generation'::regclass
       and c.contype='c'
       and not (
         c.conname=
           'koaptix_latest_board_generation_bootstrap_authority_v1_v2_check'
         and not c.condeferrable
         and not c.condeferred
         and c.convalidated
         and c.conislocal
         and c.coninhcount=0
         and not c.connoinherit
         and c.conkey is not distinct from
             array[4,5,6,7,8]::smallint[]
         and pg_catalog.pg_get_constraintdef(c.oid,false)
             is not distinct from v_expected_definition
       )
     except all
     select p.oid,p.conname,p.contype,p.condeferrable,p.condeferred,
            p.convalidated,p.conislocal,p.coninhcount,p.connoinherit,
            p.conkey,p.confkey,p.definition,p.expression
     from pg_temp.koaptix_bootstrap_v2_constraint_prestate p
     where p.contype='c'
       and not exists (
         select 1
         from pg_temp.koaptix_bootstrap_v2_row_prestate r
         where r.old_oid=p.oid
       ))
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_OTHER_CONSTRAINT_CHANGED';
  end if;

  if exists (
    select 1
    from pg_temp.koaptix_bootstrap_v2_trigger_prestate b
    full join (
      select t.oid,t.tgrelid,t.tgfoid,t.tgtype,t.tgenabled,t.tgisinternal
      from pg_catalog.pg_trigger t
      where t.tgrelid='public.koaptix_latest_board_publication'::regclass
        and t.tgname='trg_koaptix_latest_board_publication_guard'
    ) t on t.oid=b.oid
    where b.oid is null or t.oid is null
       or t.tgrelid<>b.tgrelid
       or t.tgfoid<>b.tgfoid
       or t.tgtype<>b.tgtype
       or t.tgenabled<>b.tgenabled
       or t.tgisinternal<>b.tgisinternal
       or t.tgfoid<>
          'public.koaptix_guard_latest_board_publication_pointer()'::regprocedure
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_POINTER_TRIGGER_BINDING_MISMATCH';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) acl
    where p.oid=any(array[
      'public.koaptix_verify_latest_board_generation(uuid)'::regprocedure,
      'public.koaptix_assert_generation_authority(uuid)'::regprocedure,
      'public.koaptix_guard_latest_board_publication_pointer()'::regprocedure,
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
    ])
      and acl.grantee=0
      and acl.privilege_type='EXECUTE'
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_PUBLIC_EXECUTE_EXPOSED';
  end if;

  foreach v_role in array array[
    'anon','authenticated','service_role',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    if pg_catalog.has_function_privilege(
         v_role,
         'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
         'EXECUTE'
       ) then
      raise exception using errcode='P0001',
        message='BOOTSTRAP_V2_FORWARD_POST_UNEXPECTED_SEED_EXECUTE',
        detail=v_role;
    end if;
  end loop;
  if pg_catalog.has_function_privilege(
       'koaptix_rank_bootstrap_seeder',
       'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
       'EXECUTE'
     ) is distinct from true then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_SEEDER_EXECUTE_MISSING';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and coalesce(pg_catalog.array_ndims(
            coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',
      message='BOOTSTRAP_V2_FORWARD_POST_SEED_ACL_MULTIDIMENSIONAL';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname='koaptix_rank_bootstrap_seeder'
    cross join lateral pg_catalog.unnest(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(
      array[acl_source.acl_item]::aclitem[]
    ) acl
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and (
        acl.privilege_type<>'EXECUTE'
        or not (
          acl.grantee=p.proowner
          or (
            acl.grantee=allowed_role.oid
            and acl.grantor=p.proowner
            and not acl.is_grantable
          )
        )
      )
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_SEED_DIRECT_ACL_MISMATCH';
  end if;
  if (select count(*)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_roles allowed_role
        on allowed_role.rolname='koaptix_rank_bootstrap_seeder'
      cross join lateral pg_catalog.unnest(
        coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(
        array[acl_source.acl_item]::aclitem[]
      ) acl
      where p.oid=
        'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
        and acl.privilege_type='EXECUTE'
        and acl.grantee=allowed_role.oid
        and acl.grantor=p.proowner
        and not acl.is_grantable)<>1 then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_SEED_EXACT_GRANT_MISSING';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper
     and role_row.oid<>p.proowner
     and role_row.rolname is distinct from 'koaptix_rank_bootstrap_seeder'
    where p.oid=
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'::regprocedure
      and pg_catalog.has_function_privilege(role_row.oid,p.oid,'EXECUTE')
  ) then
    raise exception using errcode='P0001',
      message='BOOTSTRAP_V2_FORWARD_POST_SEED_EFFECTIVE_GRANTEE_MISMATCH';
  end if;

  foreach v_signature in array array[
    'public.koaptix_verify_latest_board_generation(uuid)',
    'public.koaptix_assert_generation_authority(uuid)',
    'public.koaptix_guard_latest_board_publication_pointer()'
  ] loop
    foreach v_role in array array[
      'anon','authenticated','service_role',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker',
      'koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder',
      'koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'
    ] loop
      if pg_catalog.has_function_privilege(v_role,v_signature,'EXECUTE') then
        raise exception using errcode='P0001',
          message='BOOTSTRAP_V2_FORWARD_POST_INTERNAL_EXECUTE_EXPOSED',
          detail=v_signature||' -> '||v_role;
      end if;
    end loop;
  end loop;

  foreach v_role in array array[
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    v_expected_signature:=case v_role
      when 'koaptix_rank_authority_reader'
        then 'public.koaptix_compute_rank_input_authority(date)'
      when 'koaptix_rank_manifest_sealer'
        then 'public.koaptix_seal_rank_input_manifest(jsonb)'
      when 'koaptix_rank_manifest_revoker'
        then 'public.koaptix_revoke_rank_input_manifest(jsonb)'
      when 'koaptix_rank_bootstrap_seeder'
        then 'public.koaptix_seed_latest_board_compatibility_generation(jsonb)'
      when 'koaptix_rank_generation_builder'
        then 'public.koaptix_build_rank_publication_generation(jsonb)'
      when 'koaptix_rank_generation_publisher'
        then 'public.koaptix_publish_latest_board_generation(jsonb)'
      when 'koaptix_rank_publication_rollback'
        then 'public.koaptix_rollback_latest_board_publication(jsonb)'
    end;
    foreach v_signature in array array[
      'public.koaptix_compute_rank_input_authority(date)',
      'public.koaptix_seal_rank_input_manifest(jsonb)',
      'public.koaptix_revoke_rank_input_manifest(jsonb)',
      'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
      'public.koaptix_build_rank_publication_generation(jsonb)',
      'public.koaptix_publish_latest_board_generation(jsonb)',
      'public.koaptix_rollback_latest_board_publication(jsonb)'
    ] loop
      if pg_catalog.has_function_privilege(
           v_role,pg_catalog.to_regprocedure(v_signature),'EXECUTE'
         ) is distinct from (v_signature=v_expected_signature) then
        raise exception using errcode='P0001',
          message='BOOTSTRAP_V2_FORWARD_POST_ACTION_MATRIX_MISMATCH',
          detail=v_role||' -> '||v_signature;
      end if;
    end loop;
  end loop;
end;
$koaptix_bootstrap_v2_postcondition$;

commit;
