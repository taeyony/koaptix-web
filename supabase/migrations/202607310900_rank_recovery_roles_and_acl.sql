-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 900: inert recovery roles, exact writer-route ACL closure, and six owner-only RLS policies.
-- Apply only under the separately approved ROLE_GRANT_DEFINITION boundary.

begin;
-- pg_catalog and pg_temp remain ahead of public for safe object resolution;
-- public remains visible so pg_get_functiondef has one portable render contract.
set local search_path = pg_catalog, pg_temp, public;

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

-- Exact pre-900 writer-route authority. The 15 identities, kinds and definition
-- fingerprints were locked by fresh REPEATABLE READ READ ONLY catalog evidence.
-- Lexical discovery below is diagnostic only: this exact contract is the final
-- classification authority, and any identity/kind/definition drift fails closed.
create temporary table koaptix_rank_recovery_writer_route_contract (
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

insert into koaptix_rank_recovery_writer_route_contract (
  ordinal,routine_identity,routine_kind,identity_arguments,primary_definition_sha256,
  primary_classification,secondary_classification,protected_writer,
  declared_mutation_targets,declared_protected_callees
) values
  (1,'public.append_daily_rank_history(date)','FUNCTION','p_run_date date','0EDA4A6EE8F755375AD841A07926AC85B3CFD964687D06D059B1BE26C90497EC',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.complex_rank_history'],array[]::text[]),
  (2,'public.build_koaptix_index_snapshot_stage(text,date,date,text[])','FUNCTION','p_stage_label text, p_base_date date, p_end_date date, p_universe_codes text[]','BD5B1F682A3C7768E94594F217AD2DB8F24105B24C5821FF7EBFDAE67CDDB75C',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_index_snapshot_stage'],array[]::text[]),
  (3,'public.capture_koaptix_daily_snapshot()','PROCEDURE','','1CC0F3CCB4CFC32B041BA8E3EE0A4615105979AB9BED917429C711F98F91EC15',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE',null,true,
    array['public.complex_rank_history'],array[]::text[]),
  (4,'public.merge_market_source_to_master(date)','FUNCTION','p_run_date date','6F16E0895A70340ADC360FACF97649D4D3FAC758B54D760E6983C54585901ADA',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.staging_market_raw','public.koaptix_complex_region_map'],array[]::text[]),
  (5,'public.refresh_koaptix_front_views()','FUNCTION','','2451B4CDE30C47799DB740D68630BBB16FEF1716A45814E2B2EFF9C22BE08FF3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER','SEALED_COMPATIBILITY_ROUTE',false,
    array[]::text[],array[]::text[]),
  (6,'public.refresh_koaptix_front_views_legacy()','FUNCTION','','B7DD0FE31DD195BD3DDE96577B67278FA61AFE969D3BE7588A74506C4739A757',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.refresh_koaptix_latest_rank_board()']),
  (7,'public.refresh_koaptix_home_kpi()','FUNCTION','','AA01F0901CA8D91F9A852C50653D20F19FE33EE6D2BC45C11448021D95EE96F3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.v_koaptix_home_kpi'],array[]::text[]),
  (8,'public.refresh_koaptix_index_snapshot(date)','FUNCTION','p_run_date date','F1F371D234FE1F8FB88CA0ED43A1458B3737F5A270A97BADC322CCD59DAF954D',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_index_snapshot'],array[]::text[]),
  (9,'public.refresh_koaptix_latest_rank_board()','FUNCTION','','E6DD83F48455B126B981A87A5549E86C90873E97128F32344BF421B8449A63BA',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.koaptix_latest_board_read_model'],array[]::text[]),
  (10,'public.refresh_koaptix_total_market_cap_history()','FUNCTION','','1C13CEB4B404C03EA1541075A44E2731FE084593214AA63DE8142560BD75A5D8',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.v_koaptix_total_market_cap_history'],array[]::text[]),
  (11,'public.run_daily_market_pipeline(date)','FUNCTION','run_date date','F64720A9A91BD5C91A324FA038070E0C6DAEEB94E6DB7C1D1D87B28E4138BD5A',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.run_daily_market_pipeline_legacy(date)']),
  (12,'public.run_daily_market_pipeline_legacy(date)','FUNCTION','p_run_date date','558C281E00993CFBE7A27E505264841C45A88F68F780E2437189A38F9BB5848B',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)']),
  (13,'public.run_koaptix_safe_finalize(date)','FUNCTION','run_date date','EA8838230C8FE536A48AFA4FE9F133F34AB9D0F3AC87B3ADCF40D5E59415DB3F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)','public.refresh_koaptix_latest_rank_board()']),
  (14,'public.sync_market_daily_aggregates(date)','FUNCTION','p_run_date date','2FCF00A62349E3B2BFFDD2A5496EFFB1ED69C2F7F2D969BA3D1A7B6A610E46F4',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_market_daily_summary'],array[]::text[]),
  (15,'public.sync_rank_snapshot_from_history(date)','FUNCTION','p_run_date date','AB5E672F687103F923BE8DF870D1FD8CF8B9993B33190C37AB462FA0BA6D456F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.koaptix_rank_snapshot'],array[]::text[]);

update koaptix_rank_recovery_writer_route_contract
set expected_security_mode='SECURITY_INVOKER',
    expected_proconfig=array[]::text[],
    expected_result_type='void'
where routine_identity='public.build_koaptix_index_snapshot_stage(text,date,date,text[])';

update koaptix_rank_recovery_writer_route_contract
set expected_security_mode='SECURITY_INVOKER',
    expected_proconfig=array['search_path=""'],
    expected_result_type=null
where routine_identity='public.capture_koaptix_daily_snapshot()';

update koaptix_rank_recovery_writer_route_contract
set expected_result_type='void'
where routine_identity in (
  'public.refresh_koaptix_front_views()',
  'public.refresh_koaptix_home_kpi()',
  'public.refresh_koaptix_latest_rank_board()',
  'public.refresh_koaptix_total_market_cap_history()'
);

update koaptix_rank_recovery_writer_route_contract
set expected_security_mode='SECURITY_INVOKER',
    expected_result_type='integer'
where routine_identity='public.refresh_koaptix_index_snapshot(date)';

update koaptix_rank_recovery_writer_route_contract
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

update koaptix_rank_recovery_writer_route_contract contract
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
from koaptix_rank_recovery_writer_route_contract contract
left join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
left join pg_catalog.pg_namespace namespace on namespace.oid=proc.pronamespace
left join pg_catalog.pg_language language on language.oid=proc.prolang;

do $writer_authority$
begin
  if current_setting('server_encoding')<>'UTF8' then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 definition authority requires strict UTF8';
  end if;

  if (select count(*) from koaptix_rank_recovery_writer_route_contract) <> 15
     or (select count(*) from koaptix_rank_recovery_writer_route_contract where protected_writer) <> 8
     or (select count(*) from koaptix_rank_recovery_writer_route_contract
         where primary_classification='EXPLICITLY_PROTECTED_BY_EXISTING_900') <> 6
     or (select count(*) from koaptix_rank_recovery_writer_route_contract
         where primary_classification='ADDITIONAL_PROTECTED_WRITER_ROUTE') <> 2
     or (select count(*) from koaptix_rank_recovery_writer_route_contract
         where primary_classification='LEXICAL_FALSE_POSITIVE_NONWRITER') <> 7 then
    raise exception 'writer-route classification count contract differs';
  end if;

  if (select count(*) from koaptix_migration_900_definition_profile)<>1
     or (select count(*) from koaptix_rank_recovery_writer_route_contract
         where compatibility_definition_sha256 is not null)<>1
     or exists (
       select 1 from koaptix_rank_recovery_writer_route_contract
       where (compatibility_profile='PRIMARY_PRODUCTION_ONLY')
          <> (compatibility_definition_sha256 is null)
     )
     or exists (
       select 1 from koaptix_rank_recovery_writer_route_contract
       where expected_owner_contract<>'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'
     ) then
    raise exception 'definition profile or portable owner-class contract differs';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract
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
    raise exception 'audited sanitized comment identity differs';
  end if;

  if (select count(distinct owner_oid)
      from koaptix_rank_recovery_writer_route_contract)<>1 then
    raise exception 'AUTHORITY_UNRESOLVED: shared pre-900 routine owner class differs';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
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
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 routine identity, kind, arguments or owner-class drift';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
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
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 structural routine property drift';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
    join koaptix_migration_900_routine_observation observed
      on observed.routine_identity=contract.routine_identity
    where observed.catalog_dependencies is distinct from contract.expected_catalog_dependencies
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 direct catalog dependency drift';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
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
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 selected definition profile drift: %',(
      select pg_catalog.string_agg(
        contract.routine_identity||'='||observed.canonical_definition_sha256,
        ',' order by contract.ordinal
      )
      from koaptix_rank_recovery_writer_route_contract contract
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
    );
  end if;
end;
$writer_authority$;

-- These are new capability principals. Any pre-existing same-named role is a
-- collision and aborts the whole migration before grants or ownership changes;
-- an existing role is never adopted merely because its attributes look safe.
create role koaptix_rank_authority_owner nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_publication_owner nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_authority_reader nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_manifest_sealer nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_manifest_revoker nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_bootstrap_seeder nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_generation_builder nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_generation_publisher nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_publication_rollback nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;

do $block$
begin
  if exists (
    select 1 from pg_catalog.pg_roles
    where rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
      and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit
        or rolreplication or rolbypassrls)
  ) then
    raise exception 'rank recovery prerequisite role has unsafe attributes';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    where granted_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
       or member_role.rolname in (
         'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
         'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
         'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
         'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
         'koaptix_rank_publication_rollback'
       )
  ) then
    raise exception 'rank recovery roles must have zero inbound and outbound memberships at definition deployment';
  end if;
end;
$block$;

grant usage on schema public to koaptix_rank_authority_owner,
  koaptix_rank_publication_owner,koaptix_rank_authority_reader,
  koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
  koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
  koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

-- Remove every observed broad helper route from service_role before a new
-- canonical definition can be activated. No replacement helper is executed.
revoke execute on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.sync_rank_snapshot_from_history(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.refresh_koaptix_latest_rank_board()
  from public,anon,authenticated,service_role;
revoke execute on function public.run_daily_market_pipeline(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.run_daily_market_pipeline_legacy(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.run_koaptix_safe_finalize(date)
  from public,anon,authenticated,service_role;
revoke execute on procedure public.capture_koaptix_daily_snapshot()
  from public,anon,authenticated,service_role;
revoke execute on function public.refresh_koaptix_front_views_legacy()
  from public,anon,authenticated,service_role;

-- Close every other direct pre-900 EXECUTE grant on the exact eight protected
-- identities. This makes the safe result independent of default/PUBLIC,
-- production-compatible or previously unknown direct grantee state. Owner
-- execution is intrinsic and is intentionally preserved.
do $close_nonowner_execute$
declare
  route record;
  acl_grantee record;
  grantee_sql text;
begin
  for route in
    select routine_identity,routine_kind,resolved_oid,owner_oid
    from koaptix_rank_recovery_writer_route_contract
    where protected_writer
    order by ordinal
  loop
    for acl_grantee in
      select distinct acl.grantee,grantee_role.rolname
      from pg_catalog.pg_proc proc
      cross join lateral pg_catalog.aclexplode(
        coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
      ) acl
      left join pg_catalog.pg_roles grantee_role on grantee_role.oid=acl.grantee
      where proc.oid=route.resolved_oid
        and acl.privilege_type='EXECUTE'
        and acl.grantee<>route.owner_oid
    loop
      if acl_grantee.grantee=0 then
        grantee_sql := 'PUBLIC';
      elsif acl_grantee.rolname is null then
        raise exception 'AUTHORITY_UNRESOLVED: protected routine has an unknown ACL grantee OID %',
          acl_grantee.grantee;
      else
        grantee_sql := format('%I',acl_grantee.rolname);
      end if;

      execute format(
        'revoke execute on %s %s from %s',
        route.routine_kind,
        route.routine_identity,
        grantee_sql
      );
    end loop;
  end loop;
end;
$close_nonowner_execute$;

-- Remove every direct mutation-capable privilege from all application roles on
-- the three observed legacy write surfaces. This is load-bearing because history
-- and the physical read model have RLS disabled. Application SELECT is unchanged.
revoke insert,update,delete,truncate,references,trigger
  on public.complex_rank_history from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger
  on public.koaptix_rank_snapshot from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger
  on public.koaptix_latest_board_read_model from public,anon,authenticated,service_role;

-- Table-level REVOKE does not remove an explicit column grant. Close the three
-- mutation-capable column privileges for every column and application role too.
do $close_application_column_writes$
declare
  relation_identity text;
  column_row record;
  privilege_name text;
begin
  foreach relation_identity in array array[
    'public.complex_rank_history',
    'public.koaptix_rank_snapshot',
    'public.koaptix_latest_board_read_model'
  ] loop
    for column_row in
      select attribute.attname
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid=relation_identity::regclass
        and attribute.attnum>0
        and not attribute.attisdropped
      order by attribute.attnum
    loop
      foreach privilege_name in array array['INSERT','UPDATE','REFERENCES'] loop
        execute format(
          'revoke %s (%I) on table %s from public,anon,authenticated,service_role',
          privilege_name,
          column_row.attname,
          relation_identity
        );
      end loop;
    end loop;
  end loop;
end;
$close_application_column_writes$;

-- Each action role is execute-only for exactly one entrypoint and receives no
-- direct table privilege. The per-membership INHERIT FALSE option additionally
-- prevents use before the approved connection executes SET ROLE.
revoke all on public.complex_rank_history,public.koaptix_rank_snapshot,
  public.koaptix_latest_board_read_model
  from koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;

-- Only the never-activated SECURITY DEFINER owner can touch existing source
-- tables. Operational roles are not members of either owner role.
grant select,insert on public.complex_rank_history to koaptix_rank_publication_owner;
grant select on public.complex_rank_history to koaptix_rank_authority_owner;
grant select,insert on public.koaptix_rank_snapshot to koaptix_rank_publication_owner;
grant select on public.koaptix_latest_board_read_model to koaptix_rank_publication_owner;
grant select on public.apt_market_cap_snapshot,public.complex_eligibility_snapshot,
  public.apt_complex,public.region_dim,public.koaptix_complex_region_map
  to koaptix_rank_publication_owner;
grant select on public.v_koaptix_universe_membership_u,
  public.v_koaptix_universe_membership,
  public.v_koaptix_universe_rank_history_dynamic
  to koaptix_rank_publication_owner;

-- koaptix_rank_snapshot has RLS enabled and fresh evidence found no policies.
-- These narrowly named policies make only the never-login SECURITY DEFINER owner
-- usable; all seven action roles and application roles remain without DML.
create policy koaptix_rank_publication_owner_select
  on public.koaptix_rank_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_insert
  on public.koaptix_rank_snapshot for insert
  to koaptix_rank_publication_owner with check (true);

-- Four canonical source tables also have RLS enabled with zero current policies.
-- The never-login publication owner receives SELECT-only policies so its reviewed
-- SECURITY DEFINER compute/build entrypoints can see the canonical rows.
create policy koaptix_rank_publication_owner_select_apt_complex
  on public.apt_complex for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_market_cap
  on public.apt_market_cap_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_eligibility
  on public.complex_eligibility_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_region_dim
  on public.region_dim for select
  to koaptix_rank_publication_owner using (true);

-- None of the nine NOLOGIN roles is granted to a login principal here. Any action
-- role membership or SET LOCAL ROLE path requires a later exact approval.

do $assertions$
declare
  v_role text;
  v_table text;
  v_privilege text;
  v_column record;
begin
  foreach v_role in array array[
    'anon','authenticated','service_role',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    foreach v_table in array array[
      'public.complex_rank_history','public.koaptix_rank_snapshot',
      'public.koaptix_latest_board_read_model'
    ] loop
      foreach v_privilege in array array[
        'INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] loop
        if has_table_privilege(v_role,v_table,v_privilege) then
          raise exception 'effective write privilege remains: role %, table %, privilege %',
            v_role,v_table,v_privilege;
        end if;
      end loop;
      for v_column in
        select a.attname
        from pg_catalog.pg_attribute a
        where a.attrelid=v_table::regclass
          and a.attnum>0 and not a.attisdropped
      loop
        foreach v_privilege in array array['INSERT','UPDATE','REFERENCES'] loop
          if has_column_privilege(v_role,v_table,v_column.attname,v_privilege) then
            raise exception 'effective column write privilege remains: role %, table %, column %, privilege %',
              v_role,v_table,v_column.attname,v_privilege;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  if exists (
    select 1 from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    where granted_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner'
    ) and member_role.rolname in (
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'action role must not be a SECURITY DEFINER owner member';
  end if;

  -- Normalized final ACL authority: each protected identity is owner-only.
  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
    join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
    cross join lateral pg_catalog.aclexplode(
      coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
    ) acl
    where contract.protected_writer
      and acl.privilege_type='EXECUTE'
      and acl.grantee<>proc.proowner
  ) then
    raise exception 'a nonowner direct EXECUTE grant remains on a protected writer identity';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
    join pg_catalog.pg_proc proc on proc.oid=contract.resolved_oid
    cross join (values
      ('anon'),('authenticated'),('service_role'),
      ('koaptix_rank_authority_owner'),('koaptix_rank_publication_owner'),
      ('koaptix_rank_authority_reader'),('koaptix_rank_manifest_sealer'),
      ('koaptix_rank_manifest_revoker'),('koaptix_rank_bootstrap_seeder'),
      ('koaptix_rank_generation_builder'),('koaptix_rank_generation_publisher'),
      ('koaptix_rank_publication_rollback')
    ) checked_role(role_name)
    join pg_catalog.pg_roles role_row on role_row.rolname=checked_role.role_name
    where contract.protected_writer
      and pg_catalog.has_function_privilege(role_row.oid,proc.oid,'EXECUTE')
  ) then
    raise exception 'an application or recovery role retains effective EXECUTE on a protected writer identity';
  end if;

  if exists (
    select 1
    from koaptix_rank_recovery_writer_route_contract contract
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
    raise exception 'migration-900 Layer-1 or Layer-2 routine authority changed during migration';
  end if;

  -- Narrow lexical discovery only identifies an unclassified candidate. It can
  -- never override a definition-fingerprint-backed classification, so the seven
  -- reviewed nonwriters do not fail merely because of names or body text.
  if exists (
    with funcs as (
      select proc.oid,
             lower(pg_catalog.pg_get_functiondef(proc.oid)) as body
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace namespace on namespace.oid=proc.pronamespace
      where namespace.nspname not in ('pg_catalog','information_schema')
        and namespace.nspname not like 'pg_toast%'
        and proc.prokind in ('f','p')
    ), normalized as (
      select oid,body,
             regexp_replace(
               regexp_replace(body,E'--[^\\n\\r]*',' ','g'),
               '''([^'']|'''')*''',' ','g'
             ) as code_without_single_quoted_literals
      from funcs
    ), diagnostic_candidates as (
      select oid
      from normalized
      where code_without_single_quoted_literals ~
        '\m(insert[[:space:]]+into|update|delete[[:space:]]+from|truncate([[:space:]]+table)?)[[:space:]]+(public\.)?(complex_rank_history|koaptix_rank_snapshot|koaptix_latest_board_read_model)\M'
         or code_without_single_quoted_literals ~
        '\m(append_daily_rank_history|capture_koaptix_daily_snapshot|refresh_koaptix_front_views_legacy|refresh_koaptix_latest_rank_board|run_daily_market_pipeline|run_daily_market_pipeline_legacy|run_koaptix_safe_finalize|sync_rank_snapshot_from_history)\M[[:space:]]*\('
         or (
           code_without_single_quoted_literals ~ '\mexecute\M'
           and body ~ '\m(complex_rank_history|koaptix_rank_snapshot|koaptix_latest_board_read_model)\M'
         )
    )
    select 1
    from diagnostic_candidates candidate
    left join koaptix_rank_recovery_writer_route_contract contract
      on contract.resolved_oid=candidate.oid
    where contract.resolved_oid is null
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: unclassified protected writer candidate discovered';
  end if;
end;
$assertions$;

commit;
