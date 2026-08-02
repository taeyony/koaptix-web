-- TRACKED STAGE-4-ONLY ROLE/ACL ROLLBACK DEFINITION. DOES NOT AUTHORIZE EXECUTION.
-- Valid only after migration 900 and before any 901+ definition or recovery action/data.
-- Restores one exact normalized ACL authority selected by a mandatory SHA-256.

begin;
-- Match migration 900's safe, portable pg_get_functiondef render contract.
set local search_path = pg_catalog, pg_temp, public;

create temporary table koaptix_migration_900_rollback_context (
  authority_sha256 text primary key,
  profile_name text not null unique
) on commit drop;

do $authority$
declare
  requested_authority text := upper(coalesce(
    current_setting('koaptix.migration_900_rollback_authority_sha256',true),''
  ));
  default_authority constant text := '456ECD8F7CA6F9E2791188DC12EE702ECD1C03CEF389081781750D264F08611C';
  production_authority constant text := '96C98452B894AA9623957CA4A7288A7F80D47B4DC28A8A6966F3C9E3D1DCCAED';
begin
  if requested_authority=default_authority then
    insert into koaptix_migration_900_rollback_context
      values (requested_authority,'SCHEMA_ONLY_DEFAULT_ACL');
  elsif requested_authority=production_authority then
    insert into koaptix_migration_900_rollback_context
      values (requested_authority,'PRODUCTION_PRE900_COMPATIBLE');
  else
    raise exception 'missing or unrecognized migration-900 rollback authority SHA-256';
  end if;
end;
$authority$;

create temporary table koaptix_migration_900_definition_profile (
  profile_name text primary key check (profile_name in (
    'PRIMARY_PRODUCTION',
    'SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1'
  ))
) on commit drop;

insert into koaptix_migration_900_definition_profile(profile_name)
values (upper(coalesce(nullif(current_setting(
  'koaptix.migration_900_definition_profile',true
),''),'PRIMARY_PRODUCTION')));

create temporary table koaptix_migration_900_protected_routine_contract (
  ordinal smallint primary key,
  routine_identity text not null unique,
  routine_kind text not null check (routine_kind in ('FUNCTION','PROCEDURE')),
  identity_arguments text not null,
  primary_definition_sha256 text not null check (primary_definition_sha256 ~ '^[0-9A-F]{64}$'),
  compatibility_definition_sha256 text check (
    compatibility_definition_sha256 is null
    or compatibility_definition_sha256 ~ '^[0-9A-F]{64}$'
  ),
  compatibility_profile text not null default 'PRIMARY_PRODUCTION_ONLY' check (
    compatibility_profile in (
      'PRIMARY_PRODUCTION_ONLY','SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1'
    )
  ),
  compatibility_direction text,
  audited_comment_line text,
  audited_comment_line_sha256 text,
  audited_comment_line_ordinal smallint,
  audited_preceding_line text,
  audited_preceding_line_sha256 text,
  audited_following_line text,
  audited_following_line_sha256 text,
  audited_primary_occurrence_count smallint,
  audited_compatibility_occurrence_count smallint,
  audited_comment_set_sha256 text,
  expected_owner_contract text not null default 'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START',
  expected_language text not null default 'plpgsql',
  expected_volatility text not null default 'VOLATILE',
  expected_parallel text not null default 'UNSAFE',
  expected_strict boolean not null default false,
  expected_leakproof boolean not null default false,
  expected_security_mode text not null default 'SECURITY_DEFINER',
  expected_proconfig text[] not null default array['search_path=public'],
  expected_result_type text default 'jsonb',
  expected_returns_set boolean not null default false,
  expected_catalog_dependencies text[] not null default array[]::text[],
  primary_classification text not null check (primary_classification in (
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE',
    'LEXICAL_FALSE_POSITIVE_NONWRITER'
  )),
  secondary_classification text,
  protected_writer boolean not null,
  declared_mutation_targets text[] not null,
  declared_protected_callees text[] not null,
  resolved_oid oid,
  owner_oid oid
) on commit drop;

insert into koaptix_migration_900_protected_routine_contract
  (ordinal,routine_identity,routine_kind,identity_arguments,primary_definition_sha256,
   primary_classification,secondary_classification,protected_writer,
   declared_mutation_targets,declared_protected_callees)
values
  (1,'public.append_daily_rank_history(date)','FUNCTION','p_run_date date','0EDA4A6EE8F755375AD841A07926AC85B3CFD964687D06D059B1BE26C90497EC',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,array['public.complex_rank_history'],array[]::text[]),
  (2,'public.build_koaptix_index_snapshot_stage(text,date,date,text[])','FUNCTION','p_stage_label text, p_base_date date, p_end_date date, p_universe_codes text[]','BD5B1F682A3C7768E94594F217AD2DB8F24105B24C5821FF7EBFDAE67CDDB75C',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.koaptix_index_snapshot_stage'],array[]::text[]),
  (3,'public.capture_koaptix_daily_snapshot()','PROCEDURE','','1CC0F3CCB4CFC32B041BA8E3EE0A4615105979AB9BED917429C711F98F91EC15',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE',null,true,array['public.complex_rank_history'],array[]::text[]),
  (4,'public.merge_market_source_to_master(date)','FUNCTION','p_run_date date','6F16E0895A70340ADC360FACF97649D4D3FAC758B54D760E6983C54585901ADA',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.staging_market_raw','public.koaptix_complex_region_map'],array[]::text[]),
  (5,'public.refresh_koaptix_front_views()','FUNCTION','','2451B4CDE30C47799DB740D68630BBB16FEF1716A45814E2B2EFF9C22BE08FF3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER','SEALED_COMPATIBILITY_ROUTE',false,array[]::text[],array[]::text[]),
  (6,'public.refresh_koaptix_front_views_legacy()','FUNCTION','','B7DD0FE31DD195BD3DDE96577B67278FA61AFE969D3BE7588A74506C4739A757',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE','SEALED_COMPATIBILITY_ROUTE',true,array[]::text[],array['public.refresh_koaptix_latest_rank_board()']),
  (7,'public.refresh_koaptix_home_kpi()','FUNCTION','','AA01F0901CA8D91F9A852C50653D20F19FE33EE6D2BC45C11448021D95EE96F3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.v_koaptix_home_kpi'],array[]::text[]),
  (8,'public.refresh_koaptix_index_snapshot(date)','FUNCTION','p_run_date date','F1F371D234FE1F8FB88CA0ED43A1458B3737F5A270A97BADC322CCD59DAF954D',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.koaptix_index_snapshot'],array[]::text[]),
  (9,'public.refresh_koaptix_latest_rank_board()','FUNCTION','','E6DD83F48455B126B981A87A5549E86C90873E97128F32344BF421B8449A63BA',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,array['public.koaptix_latest_board_read_model'],array[]::text[]),
  (10,'public.refresh_koaptix_total_market_cap_history()','FUNCTION','','1C13CEB4B404C03EA1541075A44E2731FE084593214AA63DE8142560BD75A5D8',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.v_koaptix_total_market_cap_history'],array[]::text[]),
  (11,'public.run_daily_market_pipeline(date)','FUNCTION','run_date date','F64720A9A91BD5C91A324FA038070E0C6DAEEB94E6DB7C1D1D87B28E4138BD5A',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,array[]::text[],array['public.run_daily_market_pipeline_legacy(date)']),
  (12,'public.run_daily_market_pipeline_legacy(date)','FUNCTION','p_run_date date','558C281E00993CFBE7A27E505264841C45A88F68F780E2437189A38F9BB5848B',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)']),
  (13,'public.run_koaptix_safe_finalize(date)','FUNCTION','run_date date','EA8838230C8FE536A48AFA4FE9F133F34AB9D0F3AC87B3ADCF40D5E59415DB3F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)','public.refresh_koaptix_latest_rank_board()']),
  (14,'public.sync_market_daily_aggregates(date)','FUNCTION','p_run_date date','2FCF00A62349E3B2BFFDD2A5496EFFB1ED69C2F7F2D969BA3D1A7B6A610E46F4',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,array['public.koaptix_market_daily_summary'],array[]::text[]),
  (15,'public.sync_rank_snapshot_from_history(date)','FUNCTION','p_run_date date','AB5E672F687103F923BE8DF870D1FD8CF8B9993B33190C37AB462FA0BA6D456F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,array['public.koaptix_rank_snapshot'],array[]::text[]);

update koaptix_migration_900_protected_routine_contract
set expected_security_mode='SECURITY_INVOKER',expected_proconfig=array[]::text[],
    expected_result_type='void'
where routine_identity='public.build_koaptix_index_snapshot_stage(text,date,date,text[])';

update koaptix_migration_900_protected_routine_contract
set expected_security_mode='SECURITY_INVOKER',expected_proconfig=array['search_path=""'],
    expected_result_type=null
where routine_identity='public.capture_koaptix_daily_snapshot()';

update koaptix_migration_900_protected_routine_contract
set expected_result_type='void'
where routine_identity in (
  'public.refresh_koaptix_front_views()','public.refresh_koaptix_home_kpi()',
  'public.refresh_koaptix_latest_rank_board()',
  'public.refresh_koaptix_total_market_cap_history()'
);

update koaptix_migration_900_protected_routine_contract
set expected_security_mode='SECURITY_INVOKER',expected_result_type='integer'
where routine_identity='public.refresh_koaptix_index_snapshot(date)';

update koaptix_migration_900_protected_routine_contract
set compatibility_definition_sha256='E97A55726F16027C1344E8F4B968F3040E4FA325CDB7F9C40F366238ECB39535',
    compatibility_profile='SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1',
    compatibility_direction='PRIMARY_PRODUCTION_PRESENT__SANITIZED_BASELINE_ABSENT',
    audited_comment_line='  -- 임시로 기록 기능 생략(의존성 제거)',
    audited_comment_line_sha256='FB7F69E60E6FA5E5192CA08FE1E060814D8FA8D4B51C1EA0A9B6962727FE7F77',
    audited_comment_line_ordinal=16,
    audited_preceding_line='begin',
    audited_preceding_line_sha256='E6F07D43B5C21DB0FBB9A31FEAC2DC599787763393DD5ACBFAD80E247EB02AD5',
    audited_following_line='  v_merge := public.merge_market_source_to_master(p_run_date);',
    audited_following_line_sha256='5A36A3797E163DEE67443FD22412818B351D7F0606E9F41E11CD9E7303F05535',
    audited_primary_occurrence_count=1,
    audited_compatibility_occurrence_count=0,
    audited_comment_set_sha256='A8E86FDC0E23B7ECE7E5F88F7FC53865A14D1F7D7C7BB9A7033B9AA51582230F',
    expected_catalog_dependencies=array['ROUTINE:n:public.current_seoul_date()']
where routine_identity='public.run_daily_market_pipeline_legacy(date)';

update koaptix_migration_900_protected_routine_contract contract
set resolved_oid=proc.oid,owner_oid=proc.proowner
from pg_catalog.pg_proc proc
where proc.oid=pg_catalog.to_regprocedure(contract.routine_identity);

create temporary table koaptix_migration_900_routine_observation (
  routine_identity text primary key,
  resolved_oid oid,
  schema_name text,
  routine_name text,
  routine_kind text,
  identity_arguments text,
  owner_oid oid,
  language_name text,
  volatility text,
  parallel_mode text,
  is_strict boolean,
  is_leakproof boolean,
  security_mode text,
  proconfig text[],
  result_type text,
  returns_set boolean,
  catalog_dependencies text[],
  canonical_definition_sha256 text
) on commit drop;

insert into koaptix_migration_900_routine_observation
select contract.routine_identity,
       proc.oid,
       namespace.nspname,
       proc.proname,
       case proc.prokind when 'f' then 'FUNCTION' when 'p' then 'PROCEDURE' else 'UNSUPPORTED' end,
       pg_catalog.pg_get_function_identity_arguments(proc.oid),
       proc.proowner,
       language.lanname,
       case proc.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' when 'v' then 'VOLATILE' end,
       case proc.proparallel when 's' then 'SAFE' when 'r' then 'RESTRICTED' when 'u' then 'UNSAFE' end,
       proc.proisstrict,
       proc.proleakproof,
       case when proc.prosecdef then 'SECURITY_DEFINER' else 'SECURITY_INVOKER' end,
       coalesce(proc.proconfig,array[]::text[]),
       pg_catalog.pg_get_function_result(proc.oid),
       proc.proretset,
       coalesce((
         select pg_catalog.array_agg(dependency_row.item order by dependency_row.item)
         from (
           select distinct 'RELATION:'||dependency.deptype::text||':'||
             pg_catalog.quote_ident(dep_namespace.nspname)||'.'||
             pg_catalog.quote_ident(dep_relation.relname) as item
           from pg_catalog.pg_depend dependency
           join pg_catalog.pg_class dep_relation
             on dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
            and dep_relation.oid=dependency.refobjid
           join pg_catalog.pg_namespace dep_namespace
             on dep_namespace.oid=dep_relation.relnamespace
           where dependency.classid='pg_catalog.pg_proc'::pg_catalog.regclass
             and dependency.objid=proc.oid
           union
           select distinct 'ROUTINE:'||dependency.deptype::text||':'||
             pg_catalog.quote_ident(dep_namespace.nspname)||'.'||
             pg_catalog.quote_ident(dep_proc.proname)||'('||
             pg_catalog.pg_get_function_identity_arguments(dep_proc.oid)||')' as item
           from pg_catalog.pg_depend dependency
           join pg_catalog.pg_proc dep_proc
             on dependency.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
            and dep_proc.oid=dependency.refobjid
           join pg_catalog.pg_namespace dep_namespace
             on dep_namespace.oid=dep_proc.pronamespace
           where dependency.classid='pg_catalog.pg_proc'::pg_catalog.regclass
             and dependency.objid=proc.oid
         ) dependency_row
       ),array[]::text[]),
       upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
         pg_catalog.regexp_replace(
           pg_catalog.regexp_replace(
             pg_catalog.replace(
               pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
               E'\r',E'\n'
             ),
             E'[ \t]+(\n|$)',E'\\1','g'
           ),
           E'\n*$', ''
         ) || E'\n','UTF8'
       )),'hex'))
from koaptix_migration_900_protected_routine_contract contract
left join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
left join pg_catalog.pg_namespace namespace on namespace.oid=proc.pronamespace
left join pg_catalog.pg_language language on language.oid=proc.prolang;

create temporary table koaptix_migration_900_expected_routine_execute (
  routine_identity text not null,
  grantee_label text not null,
  is_grantable boolean not null,
  primary key (routine_identity,grantee_label)
) on commit drop;

insert into koaptix_migration_900_expected_routine_execute
  (routine_identity,grantee_label,is_grantable)
select contract.routine_identity,
       case context.profile_name
         when 'SCHEMA_ONLY_DEFAULT_ACL' then 'PUBLIC'
         else 'service_role'
       end,
       false
from koaptix_migration_900_protected_routine_contract contract
cross join koaptix_migration_900_rollback_context context
where contract.protected_writer;

create temporary table koaptix_migration_900_expected_relation_mutation (
  relation_identity text not null,
  grantee_label text not null,
  privilege_type text not null,
  is_grantable boolean not null,
  primary key (relation_identity,grantee_label,privilege_type)
) on commit drop;

insert into koaptix_migration_900_expected_relation_mutation
  (relation_identity,grantee_label,privilege_type,is_grantable)
select relation_identity,grantee_label,privilege_type,false
from koaptix_migration_900_rollback_context context
cross join (values
  ('public.complex_rank_history'),
  ('public.koaptix_rank_snapshot'),
  ('public.koaptix_latest_board_read_model')
) relation(relation_identity)
cross join (values ('anon'),('authenticated'),('service_role')) grantee(grantee_label)
cross join (values
  ('DELETE'),('INSERT'),('REFERENCES'),('TRIGGER'),('TRUNCATE'),('UPDATE')
) privilege(privilege_type)
where context.profile_name='PRODUCTION_PRE900_COMPATIBLE';

do $preconditions$
begin
  if current_setting('server_encoding')<>'UTF8' then
    raise exception 'migration-900 rollback definition authority requires strict UTF8';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_rollback_context rollback_context
    cross join koaptix_migration_900_definition_profile definition_profile
    where (rollback_context.profile_name='SCHEMA_ONLY_DEFAULT_ACL'
           and definition_profile.profile_name<>'SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1')
       or (rollback_context.profile_name='PRODUCTION_PRE900_COMPATIBLE'
           and definition_profile.profile_name<>'PRIMARY_PRODUCTION')
  ) then
    raise exception 'migration-900 rollback ACL and definition profiles are not an exact pair';
  end if;

  if (select count(*) from koaptix_migration_900_protected_routine_contract)<>15
     or (select count(*) from koaptix_migration_900_protected_routine_contract
         where protected_writer)<>8
     or (select count(*) from koaptix_migration_900_protected_routine_contract
         where compatibility_definition_sha256 is not null)<>1
     or (select count(distinct owner_oid)
         from koaptix_migration_900_protected_routine_contract)<>1
     or exists (
       select 1 from koaptix_migration_900_protected_routine_contract
       where (compatibility_profile='PRIMARY_PRODUCTION_ONLY')
          <> (compatibility_definition_sha256 is null)
          or expected_owner_contract<>'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'
     ) then
    raise exception 'migration-900 rollback routine/profile/owner-class contract differs';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract
    where compatibility_profile='SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1'
      and (
        routine_identity<>'public.run_daily_market_pipeline_legacy(date)'
        or compatibility_direction<>'PRIMARY_PRODUCTION_PRESENT__SANITIZED_BASELINE_ABSENT'
        or audited_comment_line_ordinal<>16
        or audited_primary_occurrence_count<>1
        or audited_compatibility_occurrence_count<>0
        or audited_comment_set_sha256<>'A8E86FDC0E23B7ECE7E5F88F7FC53865A14D1F7D7C7BB9A7033B9AA51582230F'
        or audited_comment_line !~ '^[ \t]*--[^\r\n]*$'
        or upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(audited_comment_line,'UTF8')),'hex'))
           <>audited_comment_line_sha256
        or upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(audited_preceding_line,'UTF8')),'hex'))
           <>audited_preceding_line_sha256
        or upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(audited_following_line,'UTF8')),'hex'))
           <>audited_following_line_sha256
      )
  ) then
    raise exception 'migration-900 rollback audited sanitized comment identity differs';
  end if;

  if to_regclass('public.koaptix_rank_input_authority_manifest') is not null
     or to_regclass('public.v_koaptix_rank_membership_authority_u') is not null
     or to_regclass('public.koaptix_latest_board_generation') is not null then
    raise exception 'stage-4-only rollback is prohibited after any 901+ definition';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract contract
    left join koaptix_migration_900_routine_observation observed
      on observed.routine_identity=contract.routine_identity
    where contract.resolved_oid is null
       or observed.resolved_oid is null
       or observed.schema_name<>'public'
       or observed.routine_name<>
          pg_catalog.split_part(pg_catalog.split_part(contract.routine_identity,'.',2),'(',1)
       or observed.routine_kind<>contract.routine_kind
       or observed.identity_arguments<>contract.identity_arguments
       or observed.owner_oid<>contract.owner_oid
  ) then
    raise exception 'migration-900 rollback routine identity, kind, arguments or owner-class drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract contract
    join koaptix_migration_900_routine_observation observed
      on observed.routine_identity=contract.routine_identity
    where observed.language_name<>contract.expected_language
       or observed.volatility<>contract.expected_volatility
       or observed.parallel_mode<>contract.expected_parallel
       or observed.is_strict<>contract.expected_strict
       or observed.is_leakproof<>contract.expected_leakproof
       or observed.security_mode<>contract.expected_security_mode
       or observed.proconfig is distinct from contract.expected_proconfig
       or observed.result_type is distinct from contract.expected_result_type
       or observed.returns_set<>contract.expected_returns_set
       or observed.catalog_dependencies is distinct from contract.expected_catalog_dependencies
  ) then
    raise exception 'migration-900 rollback Layer-1 structural routine authority drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract contract
    cross join koaptix_migration_900_definition_profile profile
    join koaptix_migration_900_routine_observation observed
      on observed.routine_identity=contract.routine_identity
    where observed.canonical_definition_sha256<>
      case
        when profile.profile_name='SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1'
         and contract.compatibility_profile=profile.profile_name
          then contract.compatibility_definition_sha256
        else contract.primary_definition_sha256
      end
  ) then
    raise exception 'migration-900 rollback selected definition profile drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract contract
    join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
    cross join lateral pg_catalog.aclexplode(
      coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
    ) acl
    where contract.protected_writer
      and acl.privilege_type='EXECUTE'
      and acl.grantee<>proc.proowner
  ) then
    raise exception 'protected routine is not in the migration-900 owner-only ACL state';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles granted_role on granted_role.oid=membership.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=membership.member
    where granted_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    ) or member_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'all inbound and outbound recovery-role memberships must be zero';
  end if;
end;
$preconditions$;

drop policy koaptix_rank_publication_owner_select on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_insert on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_select_apt_complex on public.apt_complex;
drop policy koaptix_rank_publication_owner_select_market_cap on public.apt_market_cap_snapshot;
drop policy koaptix_rank_publication_owner_select_eligibility on public.complex_eligibility_snapshot;
drop policy koaptix_rank_publication_owner_select_region_dim on public.region_dim;

revoke select,insert on public.complex_rank_history from koaptix_rank_publication_owner;
revoke select on public.complex_rank_history from koaptix_rank_authority_owner;
revoke select,insert on public.koaptix_rank_snapshot from koaptix_rank_publication_owner;
revoke select on public.koaptix_latest_board_read_model from koaptix_rank_publication_owner;
revoke select on public.apt_market_cap_snapshot,public.complex_eligibility_snapshot,
  public.apt_complex,public.region_dim,public.koaptix_complex_region_map
  from koaptix_rank_publication_owner;
revoke select on public.v_koaptix_universe_membership_u,
  public.v_koaptix_universe_membership,
  public.v_koaptix_universe_rank_history_dynamic
  from koaptix_rank_publication_owner;

-- Restore only the EXECUTE scope changed by migration 900. The mandatory
-- authority profile selects PUBLIC/default or service_role/production state.
do $restore_routine_execute$
declare
  route record;
  expected record;
  owner_name text;
  grantee_sql text;
begin
  for route in
    select * from koaptix_migration_900_protected_routine_contract
    where protected_writer order by ordinal
  loop
    select role_row.rolname into owner_name
    from pg_catalog.pg_roles role_row where role_row.oid=route.owner_oid;
    if owner_name is null then
      raise exception 'protected routine owner disappeared during rollback';
    end if;

    -- Reset only the two allowed profile grantees; migration 900 already proved
    -- that no other nonowner EXECUTE entry survived.
    execute format(
      'revoke execute on %s %s from PUBLIC,anon,authenticated,service_role',
      route.routine_kind,
      route.routine_identity
    );

    for expected in
      select * from koaptix_migration_900_expected_routine_execute
      where routine_identity=route.routine_identity
    loop
      grantee_sql := case when expected.grantee_label='PUBLIC'
        then 'PUBLIC' else format('%I',expected.grantee_label) end;
      execute format(
        'grant execute on %s %s to %s%s granted by %I',
        route.routine_kind,
        route.routine_identity,
        grantee_sql,
        case when expected.is_grantable then ' with grant option' else '' end,
        owner_name
      );
    end loop;
  end loop;
end;
$restore_routine_execute$;

-- Migration 900 changed only mutation privileges for these application roles.
-- SELECT and all unrelated ACL entries remain untouched.
do $restore_relation_mutation$
declare
  v_relation_identity text;
  relation_owner text;
  expected_relation record;
  column_row record;
  privilege_name text;
begin
  foreach v_relation_identity in array array[
    'public.complex_rank_history',
    'public.koaptix_rank_snapshot',
    'public.koaptix_latest_board_read_model'
  ] loop
    select role_row.rolname into relation_owner
    from pg_catalog.pg_class relation_row
    join pg_catalog.pg_roles role_row on role_row.oid=relation_row.relowner
    where relation_row.oid=v_relation_identity::regclass;
    if relation_owner is null then
      raise exception 'protected relation owner disappeared during rollback';
    end if;

    execute format(
      'revoke insert,update,delete,truncate,references,trigger on table %s from public,anon,authenticated,service_role',
      v_relation_identity
    );
    for column_row in
      select attribute.attname
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid=v_relation_identity::regclass
        and attribute.attnum>0 and not attribute.attisdropped
      order by attribute.attnum
    loop
      foreach privilege_name in array array['INSERT','UPDATE','REFERENCES'] loop
        execute format(
          'revoke %s (%I) on table %s from public,anon,authenticated,service_role',
          privilege_name,column_row.attname,v_relation_identity
        );
      end loop;
    end loop;

    for expected_relation in
      select expected_row.*
      from koaptix_migration_900_expected_relation_mutation expected_row
      where expected_row.relation_identity=v_relation_identity
      order by expected_row.grantee_label,expected_row.privilege_type
    loop
      execute format(
        'grant %s on table %s to %I%s granted by %I',
        expected_relation.privilege_type,
        expected_relation.relation_identity,
        expected_relation.grantee_label,
        case when expected_relation.is_grantable then ' with grant option' else '' end,
        relation_owner
      );
    end loop;
  end loop;
end;
$restore_relation_mutation$;

do $postrollback_acl_equality$
begin
  if exists (
    with actual as (
      select contract.routine_identity,
             case when acl.grantee=0 then 'PUBLIC' else grantee_role.rolname end as grantee_label,
             acl.is_grantable,
             acl.grantor=proc.proowner as grantor_is_owner
      from koaptix_migration_900_protected_routine_contract contract
      join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
      cross join lateral pg_catalog.aclexplode(
        coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
      ) acl
      left join pg_catalog.pg_roles grantee_role on grantee_role.oid=acl.grantee
      where contract.protected_writer
        and acl.privilege_type='EXECUTE' and acl.grantee<>proc.proowner
    ), unexpected as (
      select routine_identity,grantee_label,is_grantable,grantor_is_owner from actual
      except
      select routine_identity,grantee_label,is_grantable,true
      from koaptix_migration_900_expected_routine_execute
    ), missing as (
      select routine_identity,grantee_label,is_grantable,true
      from koaptix_migration_900_expected_routine_execute
      except
      select routine_identity,grantee_label,is_grantable,grantor_is_owner from actual
    )
    select 1 from unexpected
    union all
    select 1 from missing
  ) then
    raise exception 'postrollback routine ACL fingerprint differs from selected authority';
  end if;

  if exists (
    with actual as (
      select namespace.nspname||'.'||relation_row.relname as relation_identity,
             case when acl.grantee=0 then 'PUBLIC' else grantee_role.rolname end as grantee_label,
             acl.privilege_type,
             acl.is_grantable,
             acl.grantor=relation_row.relowner as grantor_is_owner
      from pg_catalog.pg_class relation_row
      join pg_catalog.pg_namespace namespace on namespace.oid=relation_row.relnamespace
      cross join lateral pg_catalog.aclexplode(
        coalesce(relation_row.relacl,pg_catalog.acldefault('r',relation_row.relowner))
      ) acl
      left join pg_catalog.pg_roles grantee_role on grantee_role.oid=acl.grantee
      where namespace.nspname||'.'||relation_row.relname in (
        'public.complex_rank_history','public.koaptix_rank_snapshot',
        'public.koaptix_latest_board_read_model'
      )
        and (acl.grantee=0 or grantee_role.rolname in ('anon','authenticated','service_role'))
        and acl.privilege_type in ('DELETE','INSERT','REFERENCES','TRIGGER','TRUNCATE','UPDATE')
    ), unexpected as (
      select relation_identity,grantee_label,privilege_type,is_grantable,grantor_is_owner from actual
      except
      select relation_identity,grantee_label,privilege_type,is_grantable,true
      from koaptix_migration_900_expected_relation_mutation
    ), missing as (
      select relation_identity,grantee_label,privilege_type,is_grantable,true
      from koaptix_migration_900_expected_relation_mutation
      except
      select relation_identity,grantee_label,privilege_type,is_grantable,grantor_is_owner from actual
    )
    select 1 from unexpected
    union all
    select 1 from missing
  ) then
    raise exception 'postrollback relation ACL fingerprint differs from selected authority';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute attribute
    cross join lateral pg_catalog.aclexplode(attribute.attacl) acl
    left join pg_catalog.pg_roles grantee_role on grantee_role.oid=acl.grantee
    where attribute.attrelid in (
      'public.complex_rank_history'::regclass,
      'public.koaptix_rank_snapshot'::regclass,
      'public.koaptix_latest_board_read_model'::regclass
    )
      and (acl.grantee=0 or grantee_role.rolname in ('anon','authenticated','service_role'))
      and acl.privilege_type in ('INSERT','UPDATE','REFERENCES')
  ) then
    raise exception 'postrollback column ACL fingerprint has an unexpected mutation grant';
  end if;

  if exists (
    select 1
    from koaptix_migration_900_protected_routine_contract contract
    left join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
    left join koaptix_migration_900_routine_observation observed
      on observed.routine_identity=contract.routine_identity
    left join pg_catalog.pg_language language on language.oid=proc.prolang
    where proc.oid is null
       or observed.routine_identity is null
       or language.oid is null
       or proc.proowner is distinct from observed.owner_oid
       or case proc.prokind when 'f' then 'FUNCTION' when 'p' then 'PROCEDURE' else 'UNSUPPORTED' end
          is distinct from observed.routine_kind
       or pg_catalog.pg_get_function_identity_arguments(proc.oid) is distinct from observed.identity_arguments
       or language.lanname is distinct from observed.language_name
       or case proc.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' when 'v' then 'VOLATILE' end
          is distinct from observed.volatility
       or case proc.proparallel when 's' then 'SAFE' when 'r' then 'RESTRICTED' when 'u' then 'UNSAFE' end
          is distinct from observed.parallel_mode
       or proc.proisstrict is distinct from observed.is_strict
       or proc.proleakproof is distinct from observed.is_leakproof
       or case when proc.prosecdef then 'SECURITY_DEFINER' else 'SECURITY_INVOKER' end
          is distinct from observed.security_mode
       or coalesce(proc.proconfig,array[]::text[]) is distinct from observed.proconfig
       or pg_catalog.pg_get_function_result(proc.oid) is distinct from observed.result_type
       or proc.proretset is distinct from observed.returns_set
       or coalesce((
            select pg_catalog.array_agg(dependency_row.item order by dependency_row.item)
            from (
              select distinct 'RELATION:'||dependency.deptype::text||':'||
                pg_catalog.quote_ident(dep_namespace.nspname)||'.'||
                pg_catalog.quote_ident(dep_relation.relname) as item
              from pg_catalog.pg_depend dependency
              join pg_catalog.pg_class dep_relation
                on dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
               and dep_relation.oid=dependency.refobjid
              join pg_catalog.pg_namespace dep_namespace
                on dep_namespace.oid=dep_relation.relnamespace
              where dependency.classid='pg_catalog.pg_proc'::pg_catalog.regclass
                and dependency.objid=proc.oid
              union
              select distinct 'ROUTINE:'||dependency.deptype::text||':'||
                pg_catalog.quote_ident(dep_namespace.nspname)||'.'||
                pg_catalog.quote_ident(dep_proc.proname)||'('||
                pg_catalog.pg_get_function_identity_arguments(dep_proc.oid)||')' as item
              from pg_catalog.pg_depend dependency
              join pg_catalog.pg_proc dep_proc
                on dependency.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
               and dep_proc.oid=dependency.refobjid
              join pg_catalog.pg_namespace dep_namespace
                on dep_namespace.oid=dep_proc.pronamespace
              where dependency.classid='pg_catalog.pg_proc'::pg_catalog.regclass
                and dependency.objid=proc.oid
            ) dependency_row
          ),array[]::text[]) is distinct from observed.catalog_dependencies
       or upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
            pg_catalog.regexp_replace(
              pg_catalog.regexp_replace(
                pg_catalog.replace(
                  pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
                  E'\r',E'\n'
                ),
                E'[ \t]+(\n|$)',E'\\1','g'
              ),
              E'\n*$', ''
            ) || E'\n','UTF8'
          )),'hex')) is distinct from observed.canonical_definition_sha256
  ) then
    raise exception 'postrollback migration-900 Layer-1 or Layer-2 routine authority changed';
  end if;
end;
$postrollback_acl_equality$;

revoke usage on schema public from koaptix_rank_authority_owner,
  koaptix_rank_publication_owner,koaptix_rank_authority_reader,
  koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
  koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
  koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

drop role koaptix_rank_authority_reader;
drop role koaptix_rank_manifest_sealer;
drop role koaptix_rank_manifest_revoker;
drop role koaptix_rank_bootstrap_seeder;
drop role koaptix_rank_generation_builder;
drop role koaptix_rank_generation_publisher;
drop role koaptix_rank_publication_rollback;
drop role koaptix_rank_authority_owner;
drop role koaptix_rank_publication_owner;

commit;
