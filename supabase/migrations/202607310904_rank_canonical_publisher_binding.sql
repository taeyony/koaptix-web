-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 904: membership-bound canonical compute/seal/revoke and publisher binding after 901/902/903.
-- No function in this file is invoked by migration execution.

begin;

-- Migration 900's temporary writer authority is intentionally gone after its
-- commit. Reproduce that accepted authority before this migration changes any
-- persistent object, and fail closed unless the live pre-904 routines still
-- match it exactly. Lexical discovery below is diagnostic only; these rows are
-- the sole classification authority for the pre-900 routine set.
set local search_path = pg_catalog, pg_temp, public;

create temporary table koaptix_migration_904_writer_authority (
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
  structural_identity_sha256 text not null check (structural_identity_sha256 ~ '^[0-9A-F]{64}$'),
  normalized_acl_sha256 text not null check (normalized_acl_sha256 ~ '^[0-9A-F]{64}$'),
  combined_authority_sha256 text not null check (combined_authority_sha256 ~ '^[0-9A-F]{64}$'),
  resolved_oid oid,
  owner_oid oid
) on commit drop;

insert into koaptix_migration_904_writer_authority (
  ordinal,routine_identity,routine_kind,identity_arguments,primary_definition_sha256,
  primary_classification,secondary_classification,protected_writer,
  declared_mutation_targets,declared_protected_callees,
  structural_identity_sha256,normalized_acl_sha256,combined_authority_sha256
) values
  (1,'public.append_daily_rank_history(date)','FUNCTION','p_run_date date','0EDA4A6EE8F755375AD841A07926AC85B3CFD964687D06D059B1BE26C90497EC',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.complex_rank_history'],array[]::text[],
    '248975F4737BF85F49C1002B59A039D12B4ABF4A650E49AD3EF5873D45F0531B','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','FDAC8434F81B1364ED8D2BBFD90FABC03F6ED60C9DC96E764A22DCF64D0FAD48'),
  (2,'public.build_koaptix_index_snapshot_stage(text,date,date,text[])','FUNCTION','p_stage_label text, p_base_date date, p_end_date date, p_universe_codes text[]','BD5B1F682A3C7768E94594F217AD2DB8F24105B24C5821FF7EBFDAE67CDDB75C',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_index_snapshot_stage'],array[]::text[],
    'DD224C55A3A02C03D39B3A9B74FCE8020939850792C9BAE3AC5E8E5EE59D5ECE','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','B22EC373099649A20F580B50F103D532B08E51C760B38BEAD105D696D7C37E7B'),
  (3,'public.capture_koaptix_daily_snapshot()','PROCEDURE','','1CC0F3CCB4CFC32B041BA8E3EE0A4615105979AB9BED917429C711F98F91EC15',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE',null,true,
    array['public.complex_rank_history'],array[]::text[],
    'F0FDC87C894B050E64B55728038F5C1E6753C86B4BAFA3EF22308EF1DB9CA394','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','065F232EC7EC63F6187E95DDBEF53AABEA5EBB4225AE7F8246A414D5A178C188'),
  (4,'public.merge_market_source_to_master(date)','FUNCTION','p_run_date date','6F16E0895A70340ADC360FACF97649D4D3FAC758B54D760E6983C54585901ADA',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.staging_market_raw','public.koaptix_complex_region_map'],array[]::text[],
    'F8DD245FED37D03CCCC625D48B2FB54BF70C427A333A540A843C6F0DDA9216A9','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','B007488D30BA27B9EAD919E3AEE35C91EA58133D3139FB47B2DC5C75A0574620'),
  (5,'public.refresh_koaptix_front_views()','FUNCTION','','2451B4CDE30C47799DB740D68630BBB16FEF1716A45814E2B2EFF9C22BE08FF3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER','SEALED_COMPATIBILITY_ROUTE',false,
    array[]::text[],array[]::text[],
    '8F239EDC37ED987B174E022084ED16330048D3F25F379BB75339D1DADFFF8993','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','27D2E9D28ACA1645124756CA1426DDB572E4E782A4659047D668EE5BAD03F3CA'),
  (6,'public.refresh_koaptix_front_views_legacy()','FUNCTION','','B7DD0FE31DD195BD3DDE96577B67278FA61AFE969D3BE7588A74506C4739A757',
    'ADDITIONAL_PROTECTED_WRITER_ROUTE','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.refresh_koaptix_latest_rank_board()'],
    '23D87A530B8F7ED6E0F13CE7DA000DCA6A32C3E3F941C9E2312842059061BC91','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','C2016AC900A8E3F388C403FF5B76C9255CEC0B7D4EA1C43084F73A29E94F9CF9'),
  (7,'public.refresh_koaptix_home_kpi()','FUNCTION','','AA01F0901CA8D91F9A852C50653D20F19FE33EE6D2BC45C11448021D95EE96F3',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.v_koaptix_home_kpi'],array[]::text[],
    'F1CEBA511545AEA67E4A51560FEE51AE815306450D7F9A18577DD8A138A199EF','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','E96CA7A52C2B57990A631631CA90C56D0AF83C2428837466350DC7CBB817C4D3'),
  (8,'public.refresh_koaptix_index_snapshot(date)','FUNCTION','p_run_date date','F1F371D234FE1F8FB88CA0ED43A1458B3737F5A270A97BADC322CCD59DAF954D',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_index_snapshot'],array[]::text[],
    '50243EDC1AC3E9F3B49810A2FD6032AA394246B0A694538FA9F8A83FCE18FFBC','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','0CCE9FBA167087291BA8CFD0C8F80FB4B6C6C2445BCA8398D24F09697EB8B413'),
  (9,'public.refresh_koaptix_latest_rank_board()','FUNCTION','','E6DD83F48455B126B981A87A5549E86C90873E97128F32344BF421B8449A63BA',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.koaptix_latest_board_read_model'],array[]::text[],
    '5C9C16112D71986071E5F38C2004B82258B3F92186511F6E2AC1A293066C960B','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','59841C43D550C34B43DF66D4F3D5803C347DA47A244EAE62A0FEADD04E4565D3'),
  (10,'public.refresh_koaptix_total_market_cap_history()','FUNCTION','','1C13CEB4B404C03EA1541075A44E2731FE084593214AA63DE8142560BD75A5D8',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.v_koaptix_total_market_cap_history'],array[]::text[],
    '64FDDFBA962D7BF239DDDC93D405EA90D0A50F93313D9C668CEB81BE298FC918','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','18BE4BCBFD8A981ED6D87DADFDAB562FC92AFAADA6907D3E1047DF79CAEAC637'),
  (11,'public.run_daily_market_pipeline(date)','FUNCTION','run_date date','F64720A9A91BD5C91A324FA038070E0C6DAEEB94E6DB7C1D1D87B28E4138BD5A',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.run_daily_market_pipeline_legacy(date)'],
    'C3A27BC2C2013CB3E54B9DF8A851F1C815CBB80201B09BD86590FB7C3B838D78','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','88D592C52956895330867B4B366F92D9D9AC454963F34F9EFE6F17E3938AC510'),
  (12,'public.run_daily_market_pipeline_legacy(date)','FUNCTION','p_run_date date','558C281E00993CFBE7A27E505264841C45A88F68F780E2437189A38F9BB5848B',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)'],
    '4027222C9BAEED9DBE20C23BFB577C8D8919773490AFD96F0CF4ECBBEA20AC76','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','1B3B1D9A2AEE07A9BAC8135B5FFB53A99D78BC485DEA38466D00D0EBCADC1ACA'),
  (13,'public.run_koaptix_safe_finalize(date)','FUNCTION','run_date date','EA8838230C8FE536A48AFA4FE9F133F34AB9D0F3AC87B3ADCF40D5E59415DB3F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900','SEALED_COMPATIBILITY_ROUTE',true,
    array[]::text[],array['public.append_daily_rank_history(date)','public.sync_rank_snapshot_from_history(date)','public.refresh_koaptix_latest_rank_board()'],
    'C99F026E297C90CD643AAAE81398BF39DB377983EE559DF98321EEBCF0E765ED','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','837012B006281004802D53045D8D40F7B34CD44C1DE88BAD637F536C9FEA990B'),
  (14,'public.sync_market_daily_aggregates(date)','FUNCTION','p_run_date date','2FCF00A62349E3B2BFFDD2A5496EFFB1ED69C2F7F2D969BA3D1A7B6A610E46F4',
    'LEXICAL_FALSE_POSITIVE_NONWRITER',null,false,
    array['public.koaptix_market_daily_summary'],array[]::text[],
    '3B500774B1A59E5AF948434AD7EB2F229CC14BF7B8D4411B66CC874AB817D2A1','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','AEC746CC6002D2BE7D74E06DB3E946C940C5332817709F908A3328E9AD80FF78'),
  (15,'public.sync_rank_snapshot_from_history(date)','FUNCTION','p_run_date date','AB5E672F687103F923BE8DF870D1FD8CF8B9993B33190C37AB462FA0BA6D456F',
    'EXPLICITLY_PROTECTED_BY_EXISTING_900',null,true,
    array['public.koaptix_rank_snapshot'],array[]::text[],
    '86DB8E4C4869215608EEDF25F6D626D19F5D2673ABE72E6F25448A5DCFA4F43F','E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014','1AA6277F3D1F38A6B0E7570D8D2BF1DBADC6A6DDCF02DFBC294D22CF8FE86F62');

update koaptix_migration_904_writer_authority
set expected_security_mode='SECURITY_INVOKER',
    expected_proconfig=array[]::text[],
    expected_result_type='void'
where routine_identity='public.build_koaptix_index_snapshot_stage(text,date,date,text[])';

update koaptix_migration_904_writer_authority
set expected_security_mode='SECURITY_INVOKER',
    expected_proconfig=array['search_path=""'],
    expected_result_type=null
where routine_identity='public.capture_koaptix_daily_snapshot()';

update koaptix_migration_904_writer_authority
set expected_result_type='void'
where routine_identity in (
  'public.refresh_koaptix_front_views()',
  'public.refresh_koaptix_home_kpi()',
  'public.refresh_koaptix_latest_rank_board()',
  'public.refresh_koaptix_total_market_cap_history()'
);

update koaptix_migration_904_writer_authority
set expected_security_mode='SECURITY_INVOKER',
    expected_result_type='integer'
where routine_identity='public.refresh_koaptix_index_snapshot(date)';

update koaptix_migration_904_writer_authority
set compatibility_definition_sha256='E97A55726F16027C1344E8F4B968F3040E4FA325CDB7F9C40F366238ECB39535',
    compatibility_profile='SANITIZED_SCHEMA_ONLY_COMMENT_OMISSION_V1',
    audited_comment_set_sha256='A8E86FDC0E23B7ECE7E5F88F7FC53865A14D1F7D7C7BB9A7033B9AA51582230F',
    expected_catalog_dependencies=array['ROUTINE:n:public.current_seoul_date()']
where routine_identity='public.run_daily_market_pipeline_legacy(date)';

update koaptix_migration_904_writer_authority authority
set resolved_oid=proc.oid,owner_oid=proc.proowner
from pg_catalog.pg_proc proc
where proc.oid=pg_catalog.to_regprocedure(authority.routine_identity);

create temporary table koaptix_migration_904_routine_observation
on commit drop as
select authority.routine_identity,
       proc.oid as resolved_oid,
       namespace.nspname as schema_name,
       proc.proname as routine_name,
       case proc.prokind when 'f' then 'FUNCTION' when 'p' then 'PROCEDURE' else 'UNSUPPORTED' end as routine_kind,
       pg_catalog.pg_get_function_identity_arguments(proc.oid) as identity_arguments,
       proc.proowner as owner_oid,
       language.lanname as language_name,
       case proc.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' when 'v' then 'VOLATILE' end as volatility,
       case proc.proparallel when 's' then 'SAFE' when 'r' then 'RESTRICTED' when 'u' then 'UNSAFE' end as parallel_mode,
       proc.proisstrict as is_strict,
       proc.proleakproof as is_leakproof,
       case when proc.prosecdef then 'SECURITY_DEFINER' else 'SECURITY_INVOKER' end as security_mode,
       coalesce(proc.proconfig,array[]::text[]) as proconfig,
       pg_catalog.pg_get_function_result(proc.oid) as result_type,
       proc.proretset as returns_set,
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
       ),array[]::text[]) as catalog_dependencies,
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
       )),'hex')) as canonical_definition_sha256,
       proc.proacl as raw_acl
from koaptix_migration_904_writer_authority authority
left join pg_catalog.pg_proc proc on proc.oid=authority.resolved_oid
left join pg_catalog.pg_namespace namespace on namespace.oid=proc.pronamespace
left join pg_catalog.pg_language language on language.oid=proc.prolang;

create temporary table koaptix_migration_904_nonwriter_acl_baseline
on commit drop as
select authority.routine_identity,observation.resolved_oid,
       observation.owner_oid,observation.raw_acl
from koaptix_migration_904_writer_authority authority
join koaptix_migration_904_routine_observation observation using (routine_identity)
where not authority.protected_writer;

-- Exact final writer inventory. The first eight rows are Migration 900's
-- accepted protected writers. The remaining seven are the committed 903/904
-- internal or action entrypoints that form the canonical publication closure.
-- Any discovered writer outside this set fails independently of its ACL.
create temporary table koaptix_migration_904_allowed_writer (
  ordinal smallint primary key,
  routine_identity text not null unique,
  routine_kind text not null check (routine_kind in ('FUNCTION','PROCEDURE')),
  authority_source text not null check (authority_source in (
    'MIGRATION_900_PROTECTED_WRITER','MIGRATION_903_COMMITTED_WRITER',
    'MIGRATION_904_COMMITTED_WRITER'
  )),
  expected_owner_role text,
  allowed_execute_role text,
  expected_definition_sha256 text check (
    expected_definition_sha256 is null
    or expected_definition_sha256 ~ '^[0-9A-F]{64}$'
  ),
  expected_language text not null default 'plpgsql',
  expected_volatility text not null default 'VOLATILE',
  expected_parallel text not null default 'UNSAFE',
  expected_strict boolean not null default false,
  expected_leakproof boolean not null default false,
  expected_security_mode text not null default 'SECURITY_DEFINER',
  expected_proconfig text[] not null default array['search_path=pg_catalog, public'],
  expected_result_type text,
  expected_returns_set boolean not null default false,
  resolved_oid oid
) on commit drop;

insert into koaptix_migration_904_allowed_writer (
  ordinal,routine_identity,routine_kind,authority_source,
  expected_owner_role,allowed_execute_role
)
select pg_catalog.row_number() over (order by authority.ordinal)::smallint,
       authority.routine_identity,authority.routine_kind,
       'MIGRATION_900_PROTECTED_WRITER',null,null
from koaptix_migration_904_writer_authority authority
where authority.protected_writer;

insert into koaptix_migration_904_allowed_writer (
  ordinal,routine_identity,routine_kind,authority_source,
  expected_owner_role,allowed_execute_role,
  expected_definition_sha256,expected_result_type
) values
  (9,'public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)',
    'FUNCTION','MIGRATION_903_COMMITTED_WRITER','koaptix_rank_publication_owner',null,
    'CF8FAF65267CAECF7282E7A242F361B6597E2A6492733DC885FEA6C2BEC6E868','uuid'),
  (10,'public.koaptix_seal_rank_input_manifest(jsonb)',
    'FUNCTION','MIGRATION_904_COMMITTED_WRITER','koaptix_rank_authority_owner','koaptix_rank_manifest_sealer',
    '4CB990F6323E2340306A9E95778AD842E2F80AAD6519603BB06E5C7BDCEB88EA','jsonb'),
  (11,'public.koaptix_revoke_rank_input_manifest(jsonb)',
    'FUNCTION','MIGRATION_904_COMMITTED_WRITER','koaptix_rank_authority_owner','koaptix_rank_manifest_revoker',
    'F7677886B59878E06DC9EA9D9A58D6514570D3F507E300E9FA454C58E4F2EAA9','jsonb'),
  (12,'public.koaptix_seed_latest_board_compatibility_generation(jsonb)',
    'FUNCTION','MIGRATION_903_COMMITTED_WRITER','koaptix_rank_publication_owner','koaptix_rank_bootstrap_seeder',
    'BA0883B6355BEBE724B791DE1BD3E7CCB9AE7F8A8FECA372AE7D357F5F9BA2C0','jsonb'),
  (13,'public.koaptix_build_rank_publication_generation(jsonb)',
    'FUNCTION','MIGRATION_903_COMMITTED_WRITER','koaptix_rank_publication_owner','koaptix_rank_generation_builder',
    '7F7330F630E642B3854F124EFD94293FE71F4458C863D1051C82D10FCA62A600','jsonb'),
  (14,'public.koaptix_publish_latest_board_generation(jsonb)',
    'FUNCTION','MIGRATION_903_COMMITTED_WRITER','koaptix_rank_publication_owner','koaptix_rank_generation_publisher',
    'D376843000B7B90261F3FB757C59532C2ACF47835566FDD09A2E375ED0D35A68','jsonb'),
  (15,'public.koaptix_rollback_latest_board_publication(jsonb)',
    'FUNCTION','MIGRATION_903_COMMITTED_WRITER','koaptix_rank_publication_owner','koaptix_rank_publication_rollback',
    '78CA9F12A3DE31CD4C9F8178A95F776CA0F894D9F57112A9DB347EE84520643E','jsonb');

do $migration_900_authority$
declare
  v_aggregate_authority_sha256 text;
begin
  if current_setting('server_encoding')<>'UTF8' then
    raise exception 'AUTHORITY_UNRESOLVED: migration-904 definition authority requires strict UTF8';
  end if;

  if (select count(*) from koaptix_migration_904_writer_authority)<>15
     or (select count(*) from koaptix_migration_904_writer_authority where protected_writer)<>8
     or (select count(*) from koaptix_migration_904_writer_authority where not protected_writer)<>7
     or (select count(*) from koaptix_migration_904_writer_authority
         where primary_classification='EXPLICITLY_PROTECTED_BY_EXISTING_900')<>6
     or (select count(*) from koaptix_migration_904_writer_authority
         where primary_classification='ADDITIONAL_PROTECTED_WRITER_ROUTE')<>2
     or (select count(*) from koaptix_migration_904_writer_authority
         where primary_classification='LEXICAL_FALSE_POSITIVE_NONWRITER')<>7
     or (select count(*) from koaptix_migration_904_writer_authority
         where compatibility_definition_sha256 is not null)<>1
     or exists (
       select 1 from koaptix_migration_904_writer_authority
       where protected_writer<>(primary_classification<>'LEXICAL_FALSE_POSITIVE_NONWRITER')
          or expected_owner_contract<>'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'
          or normalized_acl_sha256<>'E708AB248301E6936AB16007836E92EBB042F4D8FBC13CAE1B5C404A0D458014'
     ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900/904 writer authority count or classification drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    join pg_catalog.pg_proc proc on proc.oid=authority.resolved_oid
    where authority.protected_writer
      and coalesce(pg_catalog.array_ndims(
            coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M904_ACLEXPLODE_MULTIDIMENSIONAL_ACL_01';
  end if;
  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    join pg_catalog.pg_proc proc on proc.oid=authority.resolved_oid
    cross join lateral pg_catalog.unnest(
      coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    where authority.protected_writer
      and acl.privilege_type='EXECUTE'
      and acl.grantee<>proc.proowner
  ) then
    raise exception 'a nonowner direct EXECUTE grant remains on a Migration-900 protected writer';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    join pg_catalog.pg_proc proc on proc.oid=authority.resolved_oid
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper and role_row.oid<>proc.proowner
    where authority.protected_writer
      and pg_catalog.has_function_privilege(
        role_row.oid,authority.resolved_oid,'EXECUTE'
      )
  ) then
    raise exception 'a nonowner role retains effective EXECUTE on a Migration-900 protected writer';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    where upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
      '{"audited_comment_set_sha256":'||coalesce(
        pg_catalog.to_json(authority.audited_comment_set_sha256)::text,'null'
      )||
      ',"classification":'||pg_catalog.to_json(authority.primary_classification)::text||
      ',"compatibility_definition_sha256":'||coalesce(
        pg_catalog.to_json(authority.compatibility_definition_sha256)::text,'null'
      )||
      ',"compatibility_profile":'||pg_catalog.to_json(authority.compatibility_profile)::text||
      ',"declared_mutation_targets":'||pg_catalog.to_json(authority.declared_mutation_targets)::text||
      ',"declared_protected_callees":'||pg_catalog.to_json(authority.declared_protected_callees)::text||
      ',"normalized_acl_sha256":'||pg_catalog.to_json(authority.normalized_acl_sha256)::text||
      ',"primary_definition_sha256":'||pg_catalog.to_json(authority.primary_definition_sha256)::text||
      ',"protected_writer":'||pg_catalog.to_json(authority.protected_writer)::text||
      ',"routine_identity":'||pg_catalog.to_json(authority.routine_identity)::text||
      ',"secondary_classification":'||coalesce(
        pg_catalog.to_json(authority.secondary_classification)::text,'null'
      )||
      ',"structural_identity_sha256":'||pg_catalog.to_json(authority.structural_identity_sha256)::text||
      '}','UTF8'
    )),'hex'))<>authority.combined_authority_sha256
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900/904 combined row authority fingerprint drift';
  end if;

  select upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
           '['||pg_catalog.string_agg(
             '{"combined_authority_sha256":"'||combined_authority_sha256||
             '","routine_identity":"'||routine_identity||'"}',
             ',' order by ordinal
           )||']','UTF8'
         )),'hex'))
    into v_aggregate_authority_sha256
  from koaptix_migration_904_writer_authority;

  if v_aggregate_authority_sha256<>
       'BF8449BDAA1D2E92ACC2AD3F4F0987E83ECE8FB3591AFDD5A534A0A3CC68FC82' then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900/904 aggregate authority fingerprint drift';
  end if;

  if (select count(distinct owner_oid) from koaptix_migration_904_writer_authority)<>1 then
    raise exception 'AUTHORITY_UNRESOLVED: shared pre-900 routine owner class differs';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    left join koaptix_migration_904_routine_observation observation
      using (routine_identity)
    where authority.resolved_oid is null
       or observation.resolved_oid is null
       or observation.schema_name<>'public'
       or observation.routine_name<>
          pg_catalog.split_part(pg_catalog.split_part(authority.routine_identity,'.',2),'(',1)
       or observation.routine_kind<>authority.routine_kind
       or observation.identity_arguments<>authority.identity_arguments
       or observation.owner_oid<>authority.owner_oid
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 routine identity, kind, arguments or owner-class drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    join koaptix_migration_904_routine_observation observation using (routine_identity)
    where observation.language_name<>authority.expected_language
       or observation.volatility<>authority.expected_volatility
       or observation.parallel_mode<>authority.expected_parallel
       or observation.is_strict<>authority.expected_strict
       or observation.is_leakproof<>authority.expected_leakproof
       or observation.security_mode<>authority.expected_security_mode
       or observation.proconfig is distinct from authority.expected_proconfig
       or observation.result_type is distinct from authority.expected_result_type
       or observation.returns_set<>authority.expected_returns_set
       or observation.catalog_dependencies is distinct from authority.expected_catalog_dependencies
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 structural routine property or dependency drift';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    join koaptix_migration_904_routine_observation observation using (routine_identity)
    where observation.canonical_definition_sha256 is distinct from authority.primary_definition_sha256
      and (
        authority.compatibility_definition_sha256 is null
        or observation.canonical_definition_sha256 is distinct from authority.compatibility_definition_sha256
      )
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: migration-900 selected definition fingerprint drift';
  end if;
end;
$migration_900_authority$;

create temporary table koaptix_migration_904_protected_relation (
  ordinal smallint primary key,
  relation_identity text not null unique,
  expected_owner_contract text not null check (expected_owner_contract in (
    'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START',
    'ROLE:koaptix_rank_authority_owner',
    'ROLE:koaptix_rank_publication_owner'
  )),
  expected_owner_oid oid,
  resolved_oid oid unique
) on commit drop;

insert into koaptix_migration_904_protected_relation(
  ordinal,relation_identity,expected_owner_contract
) values
  (1,'public.complex_rank_history','SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'),
  (2,'public.koaptix_rank_snapshot','SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'),
  (3,'public.koaptix_latest_board_read_model','SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START'),
  (4,'public.koaptix_rank_input_authority_manifest','ROLE:koaptix_rank_authority_owner'),
  (5,'public.koaptix_rank_input_manifest_revocation','ROLE:koaptix_rank_authority_owner'),
  (6,'public.koaptix_latest_board_generation','ROLE:koaptix_rank_publication_owner'),
  (7,'public.koaptix_latest_board_generation_surface','ROLE:koaptix_rank_publication_owner'),
  (8,'public.koaptix_latest_board_generation_universe','ROLE:koaptix_rank_publication_owner'),
  (9,'public.koaptix_latest_board_generation_row','ROLE:koaptix_rank_publication_owner'),
  (10,'public.koaptix_latest_board_generation_global_row','ROLE:koaptix_rank_publication_owner'),
  (11,'public.koaptix_rank_publication_history_stage','ROLE:koaptix_rank_publication_owner'),
  (12,'public.koaptix_rank_publication_snapshot_stage','ROLE:koaptix_rank_publication_owner'),
  (13,'public.koaptix_latest_board_publication_event','ROLE:koaptix_rank_publication_owner'),
  (14,'public.koaptix_latest_board_publication','ROLE:koaptix_rank_publication_owner');

update koaptix_migration_904_protected_relation protected
set resolved_oid=pg_catalog.to_regclass(protected.relation_identity),
    expected_owner_oid=case protected.expected_owner_contract
      when 'SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START' then (
        select authority.owner_oid
        from koaptix_migration_904_writer_authority authority
        where authority.ordinal=1
      )
      when 'ROLE:koaptix_rank_authority_owner' then
        pg_catalog.to_regrole('koaptix_rank_authority_owner')::oid
      when 'ROLE:koaptix_rank_publication_owner' then
        pg_catalog.to_regrole('koaptix_rank_publication_owner')::oid
    end;

do $owner_and_predefined_writer_gate$
declare
  v_pg_write_all_data oid;
begin
  if (select count(*) from koaptix_migration_904_protected_relation)<>14
     or (select count(*) from koaptix_migration_904_protected_relation
         where expected_owner_contract='SHARED_PRE900_ROUTINE_OWNER_AT_MIGRATION_START')<>3
     or (select count(*) from koaptix_migration_904_protected_relation
         where expected_owner_contract='ROLE:koaptix_rank_authority_owner')<>2
     or (select count(*) from koaptix_migration_904_protected_relation
         where expected_owner_contract='ROLE:koaptix_rank_publication_owner')<>9
     or exists (
       select 1
       from koaptix_migration_904_protected_relation protected
       left join pg_catalog.pg_class relation_row on relation_row.oid=protected.resolved_oid
       where protected.resolved_oid is null
          or protected.expected_owner_oid is null
          or relation_row.oid is null
          or relation_row.relowner is distinct from protected.expected_owner_oid
     ) then
    raise exception 'AUTHORITY_UNRESOLVED: protected relation owner contract drift';
  end if;

  select role_row.oid
    into v_pg_write_all_data
  from pg_catalog.pg_roles role_row
  where role_row.rolname='pg_write_all_data';

  if v_pg_write_all_data is null then
    raise exception 'AUTHORITY_UNRESOLVED: PostgreSQL-17 pg_write_all_data role missing';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    where membership.roleid=v_pg_write_all_data
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: pg_write_all_data membership remains';
  end if;
end;
$owner_and_predefined_writer_gate$;

-- Narrow cross-domain rights exist only for the never-activated owner of the serialized revocation entrypoint.
grant select,update on public.koaptix_latest_board_publication to koaptix_rank_authority_owner;
grant select on public.koaptix_latest_board_generation to koaptix_rank_authority_owner;

create or replace function public.koaptix_compute_rank_input_authority(p_snapshot_date date)
returns jsonb
language sql
stable
security definer
set search_path=pg_catalog,public
as $function$
with m as (
  select * from public.apt_market_cap_snapshot where snapshot_date=p_snapshot_date
), e as (
  select * from public.complex_eligibility_snapshot where snapshot_date=p_snapshot_date
), paired as (
  select coalesce(m.complex_id,e.complex_id) as complex_id,
         m.complex_id as m_id,e.complex_id as e_id,
         m.market_cap_krw,m.coverage_status,m.calculation_version,
         e.is_rank_eligible,e.eligibility_status,e.rule_version,e.manual_override,
         a.is_active,a.master_status,a.merged_into_complex_id
  from m full join e using(snapshot_date,complex_id)
  left join public.apt_complex a on a.complex_id=coalesce(m.complex_id,e.complex_id)
), market_hashes as (
  select complex_id,encode(sha256(convert_to(jsonb_build_array(
    complex_id,market_cap_krw,coverage_status,calculation_version,
    total_household_count,priced_household_count,priced_household_ratio,
    total_cluster_count,priced_cluster_count
  )::text,'UTF8')),'hex') as row_hash from m
), eligibility_hashes as (
  select complex_id,encode(sha256(convert_to(jsonb_build_array(
    complex_id,is_rank_eligible,eligibility_status,rule_version,manual_override,
    total_household_count,priced_household_count,total_cluster_count,priced_cluster_count
  )::text,'UTF8')),'hex') as row_hash from e
), combined_hashes as (
  select complex_id,encode(sha256(convert_to(jsonb_build_array(
    complex_id,m_id,e_id,market_cap_krw,coverage_status,calculation_version,
    is_rank_eligible,eligibility_status,rule_version,manual_override,
    is_active,master_status,merged_into_complex_id
  )::text,'UTF8')),'hex') as row_hash from paired
), qualified as (
  select m.complex_id,m.market_cap_krw,m.coverage_status,m.calculation_version,
         e.eligibility_status,e.rule_version,e.manual_override
  from m join e using(snapshot_date,complex_id)
  join public.apt_complex a on a.complex_id=m.complex_id
  where m.market_cap_krw>0 and m.coverage_status='full'
    and e.is_rank_eligible is true and e.eligibility_status='eligible'
    and a.is_active is true and a.master_status='active'
    and a.merged_into_complex_id is null
), selected_hashes as (
  select complex_id,encode(sha256(convert_to(jsonb_build_array(
    complex_id,market_cap_krw,coverage_status,calculation_version,
    eligibility_status,rule_version,manual_override
  )::text,'UTF8')),'hex') as row_hash from qualified
), qualified_membership as (
  select q.complex_id,u.universe_code
  from qualified q
  join public.v_koaptix_universe_membership_u u on u.complex_id=q.complex_id
), membership_hashes as (
  select complex_id,universe_code,
         encode(sha256(convert_to(jsonb_build_array(
           complex_id,universe_code
         )::text,'UTF8')),'hex') as row_hash
  from qualified_membership
), universe_rollup as (
  select universe_code,count(*)::bigint as row_count,
         upper(encode(sha256(convert_to(
           string_agg(complex_id::text,',' order by complex_id),'UTF8'
         )),'hex')) as row_set_sha256
  from qualified_membership group by universe_code
), universe_hashes as (
  select universe_code,row_count,row_set_sha256,
         encode(sha256(convert_to(jsonb_build_array(
           universe_code,row_count,row_set_sha256
         )::text,'UTF8')),'hex') as universe_hash
  from universe_rollup
), universe_manifest as (
  select jsonb_agg(jsonb_build_object(
           'universe_code',universe_code,'row_count',row_count,
           'row_set_sha256',row_set_sha256
         ) order by universe_code) as manifest,
         to_jsonb(array_agg(universe_code order by universe_code)) as codes,
         upper(encode(sha256(convert_to(
           string_agg(universe_hash,'' order by universe_code),'UTF8'
         )),'hex')) as set_sha256
  from universe_hashes
), digests as (
  select
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from market_hashes) as market_cap_set_sha256,
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from eligibility_hashes) as eligibility_set_sha256,
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from combined_hashes) as source_set_sha256,
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from selected_hashes) as selected_input_sha256,
    (select upper(encode(sha256(convert_to(string_agg(
       row_hash,'' order by universe_code,complex_id
     ),'UTF8')),'hex')) from membership_hashes) as membership_set_sha256
)
select jsonb_build_object(
  'snapshot_date',p_snapshot_date,
  'market_cap_rows',(select count(*) from m),
  'eligibility_rows',(select count(*) from e),
  'join_rows',(select count(*) from paired where m_id is not null and e_id is not null),
  'market_cap_only_rows',(select count(*) from paired where m_id is not null and e_id is null),
  'eligibility_only_rows',(select count(*) from paired where m_id is null and e_id is not null),
  'qualified_rows',(select count(*) from qualified),
  'manual_override_rows',(select count(*) from e where manual_override is true),
  'invalid_source_contract_rows',
    (select count(*) from m where calculation_version is null or btrim(calculation_version)=''
       or coverage_status is null or btrim(coverage_status)='')
    +(select count(*) from e where rule_version is null or btrim(rule_version)=''
       or eligibility_status is null or btrim(eligibility_status)=''
       or is_rank_eligible is null or manual_override is null),
  'market_cap_calculation_versions',coalesce((
    select to_jsonb(array_agg(distinct calculation_version order by calculation_version))
    from m where calculation_version is not null
  ),'[]'::jsonb),
  'eligibility_rule_versions',coalesce((
    select to_jsonb(array_agg(distinct rule_version order by rule_version))
    from e where rule_version is not null
  ),'[]'::jsonb),
  'market_cap_source_ids',jsonb_build_array(
    'relation:public.apt_market_cap_snapshot','set-sha256:'||digests.market_cap_set_sha256),
  'eligibility_source_ids',jsonb_build_array(
    'relation:public.complex_eligibility_snapshot','set-sha256:'||digests.eligibility_set_sha256),
  'membership_source_ids',jsonb_build_array(
    'relation:public.v_koaptix_rank_membership_authority_u',
    'relation:public.v_koaptix_universe_membership_u',
    'set-sha256:'||digests.membership_set_sha256),
  'jeonbuk_membership_rows',(select count(*) from public.v_koaptix_universe_membership_u where universe_code='JEONBUK_ALL'),
  'sgg_52111_membership_rows',(select count(*) from public.v_koaptix_universe_membership_u where universe_code='SGG_52111'),
  'sgg_52111_qualified_rows',(select count(*) from qualified_membership where universe_code='SGG_52111'),
  'membership_duplicate_pairs',(select count(*) from (
    select complex_id,universe_code from public.v_koaptix_universe_membership_u
    group by complex_id,universe_code having count(*)<>1
  ) duplicate_pairs),
  'membership_fail_closed_qualified_rows',(select count(*)
    from qualified q left join public.v_koaptix_rank_membership_authority_u a
      on a.complex_id=q.complex_id
    where a.resolution_status is distinct from 'RESOLVED'),
  'affected_universe_codes',(select codes from universe_manifest),
  'affected_universe_manifest',(select manifest from universe_manifest),
  'market_cap_set_sha256',digests.market_cap_set_sha256,
  'eligibility_set_sha256',digests.eligibility_set_sha256,
  'source_set_sha256',digests.source_set_sha256,
  'selected_input_sha256',digests.selected_input_sha256,
  'membership_set_sha256',digests.membership_set_sha256,
  'affected_universe_set_sha256',(select set_sha256 from universe_manifest),
  'blocking_review_rule_version','NO_DIRECT_RANK_REVIEW_AUTHORITY_V1',
  'blocking_review_rows',0,
  'blocking_review_sha256','4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'
)
from digests;
$function$;

-- KOAPTIX_M904_OWNER_TRANSFER_BOOTSTRAP_AUTHORITY_BEGIN
do $koaptix_m904_owner_bootstrap_pre$
declare
  v_expected_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner','koaptix_rank_authority_reader','koaptix_rank_manifest_sealer','koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder','koaptix_rank_generation_builder','koaptix_rank_generation_publisher','koaptix_rank_publication_rollback'];
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
  v_role text;
  v_mismatch jsonb;
begin
  if current_user<>'postgres' or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_PRE_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_PRE_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_PRE_TARGET_STATE';
    end if;
  end loop;
end;
$koaptix_m904_owner_bootstrap_pre$;

grant koaptix_rank_authority_owner to postgres with admin false, inherit false, set true granted by postgres;
grant koaptix_rank_publication_owner to postgres with admin false, inherit false, set true granted by postgres;

do $koaptix_m904_owner_bootstrap_membership$
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_ACTIVE_MEMBERSHIP_GRAPH';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.pg_has_role('postgres',v_role,'SET') then
      raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_SET_OPTION';
    end if;
  end loop;
end;
$koaptix_m904_owner_bootstrap_membership$;

grant create on schema public to koaptix_rank_authority_owner;
grant create on schema public to koaptix_rank_publication_owner;

do $koaptix_m904_owner_bootstrap_schema$
declare
  v_target_roles constant text[]:=array['koaptix_rank_authority_owner','koaptix_rank_publication_owner'];
  v_role text;
begin
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_OWNER';
  end if;
  foreach v_role in array v_target_roles loop
    if not pg_catalog.has_schema_privilege(v_role,'public','USAGE')
       or not pg_catalog.has_schema_privilege(v_role,'public','CREATE') then
      raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M904_ACLEXPLODE_MULTIDIMENSIONAL_ACL_02';
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_ACTIVE_SCHEMA_ACL_EXPANSION';
  end if;
end;
$koaptix_m904_owner_bootstrap_schema$;

do $koaptix_m904_compute_owner_pre$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_compute_rank_input_authority(date)'
         )) is distinct from 'postgres'
     or not pg_catalog.pg_has_role(
       'postgres','koaptix_rank_publication_owner','SET'
     ) then
    raise exception using errcode='P0001',message='M904_COMPUTE_OWNER_PRE_AUTHORITY';
  end if;
end;
$koaptix_m904_compute_owner_pre$;

alter function public.koaptix_compute_rank_input_authority(date)
  owner to koaptix_rank_publication_owner;
do $koaptix_m904_compute_owner_transferred$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_compute_rank_input_authority(date)'
         )) is distinct from 'koaptix_rank_publication_owner' then
    raise exception using errcode='P0001',message='M904_COMPUTE_OWNER_TRANSFER';
  end if;
end;
$koaptix_m904_compute_owner_transferred$;
set local role koaptix_rank_publication_owner;
do $koaptix_m904_compute_owner_role$
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M904_COMPUTE_OWNER_ROLE';
  end if;
end;
$koaptix_m904_compute_owner_role$;
revoke all on function public.koaptix_compute_rank_input_authority(date)
  from public,anon,authenticated,service_role,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_compute_rank_input_authority(date)
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner,
     koaptix_rank_authority_reader;
reset role;
do $koaptix_m904_compute_owner_reset$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_compute_rank_input_authority(date)'
         )) is distinct from 'koaptix_rank_publication_owner' then
    raise exception using errcode='P0001',message='M904_COMPUTE_OWNER_RESET';
  end if;
end;
$koaptix_m904_compute_owner_reset$;

create or replace function public.koaptix_seal_rank_input_manifest(p_packet jsonb)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[] := array[
    'snapshot_date','manifest_run_id','canonical_query_version','membership_contract_version',
    'authority_contract_version','expected_market_cap_rows','expected_eligibility_rows',
    'expected_join_rows','expected_qualified_rows','market_cap_calculation_versions',
    'eligibility_rule_versions','market_cap_source_ids','eligibility_source_ids',
    'membership_source_ids','expected_jeonbuk_membership_rows',
    'expected_sgg_52111_membership_rows','expected_sgg_52111_qualified_rows',
    'membership_duplicate_pairs','membership_fail_closed_qualified_rows',
    'affected_universe_codes','affected_universe_manifest',
    'manual_override_allowed','blocking_review_rule_version','blocking_review_rows',
    'blocking_review_sha256','market_cap_set_sha256','eligibility_set_sha256',
    'source_set_sha256','selected_input_sha256','membership_set_sha256',
    'affected_universe_set_sha256'
  ];
  v_date date;
  v_history_max date;
  v_actual jsonb;
  v_manual_allowed boolean;
begin
  if current_setting('transaction_isolation')<>'serializable' then
    raise exception 'manifest sealing requires serializable transaction';
  end if;
  if jsonb_typeof(p_packet)<>'object'
     or not (p_packet ?& v_required_keys)
     or (p_packet-v_required_keys)<>'{}'::jsonb
     or exists (
       select 1 from unnest(v_required_keys) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)='null'
     ) then
    raise exception 'manifest packet keys are not exact';
  end if;
  if exists (
       select 1 from unnest(array[
         'snapshot_date','manifest_run_id','canonical_query_version',
         'membership_contract_version','authority_contract_version',
         'blocking_review_rule_version','blocking_review_sha256',
         'market_cap_set_sha256','eligibility_set_sha256','source_set_sha256',
         'selected_input_sha256','membership_set_sha256',
         'affected_universe_set_sha256'
       ]) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)<>'string'
     ) or exists (
       select 1 from unnest(array[
         'market_cap_calculation_versions','eligibility_rule_versions',
         'market_cap_source_ids','eligibility_source_ids','membership_source_ids',
         'affected_universe_codes','affected_universe_manifest'
       ]) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)<>'array'
     ) or exists (
       select 1 from unnest(array[
         'expected_market_cap_rows','expected_eligibility_rows','expected_join_rows',
         'expected_qualified_rows','expected_jeonbuk_membership_rows',
         'expected_sgg_52111_membership_rows','expected_sgg_52111_qualified_rows',
         'membership_duplicate_pairs','membership_fail_closed_qualified_rows',
         'blocking_review_rows'
       ]) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)<>'number'
          or p_packet->>k.key_name !~ '^[0-9]+$'
     ) or jsonb_typeof(p_packet->'manual_override_allowed')<>'boolean' then
    raise exception 'manifest packet JSON types are not exact';
  end if;

  if p_packet->>'snapshot_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'snapshot_date must use canonical YYYY-MM-DD serialization';
  end if;
  v_date := (p_packet->>'snapshot_date')::date;
  if to_char(v_date,'YYYY-MM-DD') is distinct from p_packet->>'snapshot_date' then
    raise exception 'snapshot_date canonical serialization changed during date parsing';
  end if;
  v_manual_allowed := (p_packet->>'manual_override_allowed')::boolean;
  if btrim(p_packet->>'manifest_run_id')='' then
    raise exception 'manifest run id is required';
  end if;
  select max(snapshot_date) into v_history_max from public.complex_rank_history;
  if v_date<=date '2026-05-31' or (v_history_max is not null and v_date<=v_history_max) then
    raise exception 'manifest date is not a future collision-free rank date';
  end if;
  v_actual := public.koaptix_compute_rank_input_authority(v_date);

  if (v_actual->>'market_cap_rows')::bigint<=0
     or (v_actual->>'market_cap_rows')::bigint<>(v_actual->>'eligibility_rows')::bigint
     or (v_actual->>'market_cap_rows')::bigint<>(v_actual->>'join_rows')::bigint
     or (v_actual->>'market_cap_only_rows')::bigint<>0
     or (v_actual->>'eligibility_only_rows')::bigint<>0
     or (v_actual->>'qualified_rows')::bigint<=0
     or (v_actual->>'invalid_source_contract_rows')::bigint<>0
     or (v_actual->>'jeonbuk_membership_rows')::bigint<=0
     or (v_actual->>'sgg_52111_membership_rows')::bigint<=0
     or (v_actual->>'sgg_52111_qualified_rows')::bigint<=0
     or (v_actual->>'membership_duplicate_pairs')::bigint<>0
     or (v_actual->>'membership_fail_closed_qualified_rows')::bigint<>0
     or ((v_actual->>'manual_override_rows')::bigint>0 and not v_manual_allowed)
     or p_packet->>'canonical_query_version' is distinct from 'canonical-rank-input-v1'
     or p_packet->>'membership_contract_version' is distinct from 'membership-map-first-45-52-v1'
     or p_packet->>'authority_contract_version' is distinct from 'rank-input-v1'
     or (p_packet->>'expected_market_cap_rows')::bigint is distinct from (v_actual->>'market_cap_rows')::bigint
     or (p_packet->>'expected_eligibility_rows')::bigint is distinct from (v_actual->>'eligibility_rows')::bigint
     or (p_packet->>'expected_join_rows')::bigint is distinct from (v_actual->>'join_rows')::bigint
     or (p_packet->>'expected_qualified_rows')::bigint is distinct from (v_actual->>'qualified_rows')::bigint
     or p_packet->'market_cap_calculation_versions' is distinct from v_actual->'market_cap_calculation_versions'
     or p_packet->'eligibility_rule_versions' is distinct from v_actual->'eligibility_rule_versions'
     or p_packet->'market_cap_source_ids' is distinct from v_actual->'market_cap_source_ids'
     or p_packet->'eligibility_source_ids' is distinct from v_actual->'eligibility_source_ids'
     or p_packet->'membership_source_ids' is distinct from v_actual->'membership_source_ids'
     or (p_packet->>'expected_jeonbuk_membership_rows')::bigint is distinct from (v_actual->>'jeonbuk_membership_rows')::bigint
     or (p_packet->>'expected_sgg_52111_membership_rows')::bigint is distinct from (v_actual->>'sgg_52111_membership_rows')::bigint
     or (p_packet->>'expected_sgg_52111_qualified_rows')::bigint is distinct from (v_actual->>'sgg_52111_qualified_rows')::bigint
     or (p_packet->>'membership_duplicate_pairs')::bigint is distinct from 0::bigint
     or (p_packet->>'membership_fail_closed_qualified_rows')::bigint is distinct from 0::bigint
     or p_packet->'affected_universe_codes' is distinct from v_actual->'affected_universe_codes'
     or p_packet->'affected_universe_manifest' is distinct from v_actual->'affected_universe_manifest'
     or p_packet->>'blocking_review_rule_version' is distinct from v_actual->>'blocking_review_rule_version'
     or (p_packet->>'blocking_review_rows')::bigint is distinct from 0::bigint
     or p_packet->>'blocking_review_sha256' is distinct from v_actual->>'blocking_review_sha256'
     or p_packet->>'market_cap_set_sha256' is distinct from v_actual->>'market_cap_set_sha256'
     or p_packet->>'eligibility_set_sha256' is distinct from v_actual->>'eligibility_set_sha256'
     or p_packet->>'source_set_sha256' is distinct from v_actual->>'source_set_sha256'
     or p_packet->>'selected_input_sha256' is distinct from v_actual->>'selected_input_sha256'
     or p_packet->>'membership_set_sha256' is distinct from v_actual->>'membership_set_sha256'
     or p_packet->>'affected_universe_set_sha256' is distinct from v_actual->>'affected_universe_set_sha256' then
    raise exception 'manifest packet does not equal same-transaction canonical authority';
  end if;

  insert into public.koaptix_rank_input_authority_manifest(
    snapshot_date,run_id,scope_code,authority_status,
    market_cap_snapshot_date,eligibility_snapshot_date,
    canonical_query_version,membership_contract_version,
    market_cap_source_ids,eligibility_source_ids,membership_source_ids,
    expected_market_cap_rows,expected_eligibility_rows,expected_join_rows,
    expected_qualified_rows,expected_jeonbuk_membership_rows,
    expected_sgg_52111_membership_rows,expected_sgg_52111_qualified_rows,
    membership_duplicate_pairs,membership_fail_closed_qualified_rows,
    affected_universe_codes,affected_universe_manifest,
    market_cap_calculation_versions,eligibility_rule_versions,
    manual_override_allowed,blocking_review_rule_version,blocking_review_rows,
    blocking_review_sha256,market_cap_set_sha256,eligibility_set_sha256,
    source_set_sha256,selected_input_sha256,membership_set_sha256,
    affected_universe_set_sha256,authority_contract_version,sealed_at,created_at
  ) values (
    v_date,p_packet->>'manifest_run_id','KOREA_FULL','SEALED',v_date,v_date,
    'canonical-rank-input-v1','membership-map-first-45-52-v1',
    array(select jsonb_array_elements_text(v_actual->'market_cap_source_ids')),
    array(select jsonb_array_elements_text(v_actual->'eligibility_source_ids')),
    array(select jsonb_array_elements_text(v_actual->'membership_source_ids')),
    (v_actual->>'market_cap_rows')::integer,(v_actual->>'eligibility_rows')::integer,
    (v_actual->>'join_rows')::integer,(v_actual->>'qualified_rows')::integer,
    (v_actual->>'jeonbuk_membership_rows')::integer,
    (v_actual->>'sgg_52111_membership_rows')::integer,
    (v_actual->>'sgg_52111_qualified_rows')::integer,0,0,
    array(select jsonb_array_elements_text(v_actual->'affected_universe_codes')),
    v_actual->'affected_universe_manifest',
    array(select jsonb_array_elements_text(v_actual->'market_cap_calculation_versions')),
    array(select jsonb_array_elements_text(v_actual->'eligibility_rule_versions')),
    v_manual_allowed,'NO_DIRECT_RANK_REVIEW_AUTHORITY_V1',0,
    v_actual->>'blocking_review_sha256',v_actual->>'market_cap_set_sha256',
    v_actual->>'eligibility_set_sha256',v_actual->>'source_set_sha256',
    v_actual->>'selected_input_sha256',v_actual->>'membership_set_sha256',
    v_actual->>'affected_universe_set_sha256','rank-input-v1',
    transaction_timestamp(),transaction_timestamp()
  );

  return jsonb_build_object(
    'snapshot_date',v_date,'manifest_run_id',p_packet->>'manifest_run_id',
    'authority_contract_version','rank-input-v1','sealed_at',transaction_timestamp()
  );
end;
$function$;

do $koaptix_m904_seal_owner_pre$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_seal_rank_input_manifest(jsonb)'
         )) is distinct from 'postgres'
     or not pg_catalog.pg_has_role(
       'postgres','koaptix_rank_authority_owner','SET'
     ) then
    raise exception using errcode='P0001',message='M904_SEAL_OWNER_PRE_AUTHORITY';
  end if;
end;
$koaptix_m904_seal_owner_pre$;

alter function public.koaptix_seal_rank_input_manifest(jsonb)
  owner to koaptix_rank_authority_owner;
do $koaptix_m904_seal_owner_transferred$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_seal_rank_input_manifest(jsonb)'
         )) is distinct from 'koaptix_rank_authority_owner' then
    raise exception using errcode='P0001',message='M904_SEAL_OWNER_TRANSFER';
  end if;
end;
$koaptix_m904_seal_owner_transferred$;
set local role koaptix_rank_authority_owner;
do $koaptix_m904_seal_owner_role$
begin
  if current_user<>'koaptix_rank_authority_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M904_SEAL_OWNER_ROLE';
  end if;
end;
$koaptix_m904_seal_owner_role$;
revoke all on function public.koaptix_seal_rank_input_manifest(jsonb)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_seal_rank_input_manifest(jsonb)
  to koaptix_rank_manifest_sealer;
reset role;
do $koaptix_m904_seal_owner_reset$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_seal_rank_input_manifest(jsonb)'
         )) is distinct from 'koaptix_rank_authority_owner' then
    raise exception using errcode='P0001',message='M904_SEAL_OWNER_RESET';
  end if;
end;
$koaptix_m904_seal_owner_reset$;

create or replace function public.koaptix_revoke_rank_input_manifest(p_packet jsonb)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
declare
  v_required_keys constant text[] := array[
    'manifest_run_id','revocation_run_id','reason_code',
    'expected_active_generation_id','expected_publication_version'
  ];
  v_manifest_run_id text;
  v_revocation_run_id text;
  v_reason_code text;
  v_active_generation_id uuid;
  v_publication_version bigint;
begin
  if current_setting('transaction_isolation')<>'serializable' then
    raise exception 'manifest revocation requires serializable transaction';
  end if;
  if jsonb_typeof(p_packet)<>'object'
     or not (p_packet ?& v_required_keys)
     or (p_packet-v_required_keys)<>'{}'::jsonb
     or exists (
       select 1 from unnest(v_required_keys) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)='null'
     ) then
    raise exception 'manifest revocation packet keys are not exact';
  end if;
  if exists (
       select 1 from unnest(array[
         'manifest_run_id','revocation_run_id','reason_code',
         'expected_active_generation_id'
       ]) k(key_name)
       where jsonb_typeof(p_packet->k.key_name)<>'string'
     ) or jsonb_typeof(p_packet->'expected_publication_version')<>'number'
        or p_packet->>'expected_publication_version' !~ '^[1-9][0-9]*$' then
    raise exception 'manifest revocation packet JSON types are not exact';
  end if;
  v_manifest_run_id := p_packet->>'manifest_run_id';
  v_revocation_run_id := p_packet->>'revocation_run_id';
  v_reason_code := p_packet->>'reason_code';
  if btrim(v_manifest_run_id)='' or btrim(v_revocation_run_id)=''
     or btrim(v_reason_code)='' then
    raise exception 'revocation identifiers and reason are required';
  end if;
  select active_generation_id,publication_version
    into v_active_generation_id,v_publication_version
  from public.koaptix_latest_board_publication
  where singleton_id=true for update nowait;
  if not found then
    raise exception 'publication singleton is unavailable for serialized revocation';
  end if;
  if v_active_generation_id::text is distinct from p_packet->>'expected_active_generation_id'
     or v_publication_version is distinct from
       (p_packet->>'expected_publication_version')::bigint then
    raise exception 'publication pointer changed before manifest revocation';
  end if;
  if exists (
    select 1
    from public.koaptix_latest_board_publication p
    join public.koaptix_latest_board_generation g
      on g.generation_id in (p.active_generation_id,p.previous_generation_id)
    where p.singleton_id=true and g.input_manifest_run_id=v_manifest_run_id
  ) then
    raise exception 'active or rollback-target generation manifest cannot be revoked';
  end if;
  insert into public.koaptix_rank_input_manifest_revocation(
    manifest_run_id,revocation_run_id,reason_code,revoked_at,created_at
  ) values (
    v_manifest_run_id,v_revocation_run_id,v_reason_code,
    transaction_timestamp(),transaction_timestamp()
  );
  return jsonb_build_object(
    'manifest_run_id',v_manifest_run_id,'revocation_run_id',v_revocation_run_id,
    'revoked_at',transaction_timestamp()
  );
end;
$function$;

do $koaptix_m904_revoke_owner_pre$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_revoke_rank_input_manifest(jsonb)'
         )) is distinct from 'postgres'
     or not pg_catalog.pg_has_role(
       'postgres','koaptix_rank_authority_owner','SET'
     ) then
    raise exception using errcode='P0001',message='M904_REVOKE_OWNER_PRE_AUTHORITY';
  end if;
end;
$koaptix_m904_revoke_owner_pre$;

alter function public.koaptix_revoke_rank_input_manifest(jsonb)
  owner to koaptix_rank_authority_owner;
do $koaptix_m904_revoke_owner_transferred$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_revoke_rank_input_manifest(jsonb)'
         )) is distinct from 'koaptix_rank_authority_owner' then
    raise exception using errcode='P0001',message='M904_REVOKE_OWNER_TRANSFER';
  end if;
end;
$koaptix_m904_revoke_owner_transferred$;
set local role koaptix_rank_authority_owner;
do $koaptix_m904_revoke_owner_role$
begin
  if current_user<>'koaptix_rank_authority_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M904_REVOKE_OWNER_ROLE';
  end if;
end;
$koaptix_m904_revoke_owner_role$;
revoke all on function public.koaptix_revoke_rank_input_manifest(jsonb)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_sealer,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_revoke_rank_input_manifest(jsonb)
  to koaptix_rank_manifest_revoker;
reset role;
do $koaptix_m904_revoke_owner_reset$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.koaptix_revoke_rank_input_manifest(jsonb)'
         )) is distinct from 'koaptix_rank_authority_owner' then
    raise exception using errcode='P0001',message='M904_REVOKE_OWNER_RESET';
  end if;
end;
$koaptix_m904_revoke_owner_reset$;

create or replace function public.append_daily_rank_history(p_run_date date)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_manifest public.koaptix_rank_input_authority_manifest%rowtype;
  v_history_max_date date;
  v_market_cap_rows bigint;
  v_eligibility_rows bigint;
  v_join_rows bigint;
  v_mcap_only bigint;
  v_eligibility_only bigint;
  v_qualified_rows bigint;
  v_unexpected_mcap_versions bigint;
  v_unexpected_eligibility_versions bigint;
  v_unauthorized_manual_overrides bigint;
  v_invalid_source_contract_rows bigint;
  v_source_set_sha256 text;
  v_market_cap_set_sha256 text;
  v_eligibility_set_sha256 text;
  v_selected_input_sha256 text;
  v_actual jsonb;
  v_inserted_rows integer;
begin
  if current_setting('transaction_isolation') <> 'serializable' then
    raise exception 'rank publication requires serializable transaction';
  end if;

  if p_run_date <= date '2026-05-31' then
    raise exception 'historical rank date is closed: %', p_run_date;
  end if;
  if p_run_date > (transaction_timestamp() at time zone 'Asia/Seoul')::date then
    raise exception 'rank date is later than the Seoul calendar date: %', p_run_date;
  end if;

  perform 1
  from public.koaptix_latest_board_publication
  where singleton_id = true
  for update nowait;
  if not found then
    raise exception 'rank publication singleton is unavailable';
  end if;

  select max(h.snapshot_date) into v_history_max_date
  from public.complex_rank_history h;
  if v_history_max_date is not null and p_run_date <= v_history_max_date then
    raise exception 'rank date % is not later than existing history maximum %', p_run_date, v_history_max_date;
  end if;

  select * into v_manifest
  from public.koaptix_rank_input_authority_manifest m
  where m.snapshot_date = p_run_date
    and m.scope_code = 'KOREA_FULL'
    and m.authority_status = 'SEALED'
    and m.authority_contract_version = 'rank-input-v1'
    and m.canonical_query_version = 'canonical-rank-input-v1'
    and m.membership_contract_version = 'membership-map-first-45-52-v1'
    and m.blocking_review_rule_version = 'NO_DIRECT_RANK_REVIEW_AUTHORITY_V1'
    and m.blocking_review_rows = 0
    and m.blocking_review_sha256 = '4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'
    and m.sealed_at = m.created_at
    and m.sealed_at <= transaction_timestamp()
    and not exists (
      select 1 from public.koaptix_rank_input_manifest_revocation r
      where r.manifest_run_id=m.run_id
    )
  ;
  if not found then
    raise exception 'sealed full-population authority manifest missing for %', p_run_date;
  end if;

  -- The owner-internal compatibility helper must not become a path around the
  -- membership-bound seal. Recompute the complete authority payload in this
  -- transaction and bind every membership/universe field before any insert.
  v_actual := public.koaptix_compute_rank_input_authority(p_run_date);
  if to_jsonb(v_manifest.market_cap_source_ids) is distinct from v_actual->'market_cap_source_ids'
     or to_jsonb(v_manifest.eligibility_source_ids) is distinct from v_actual->'eligibility_source_ids'
     or to_jsonb(v_manifest.membership_source_ids) is distinct from v_actual->'membership_source_ids'
     or v_manifest.expected_jeonbuk_membership_rows is distinct from (v_actual->>'jeonbuk_membership_rows')::integer
     or v_manifest.expected_sgg_52111_membership_rows is distinct from (v_actual->>'sgg_52111_membership_rows')::integer
     or v_manifest.expected_sgg_52111_qualified_rows is distinct from (v_actual->>'sgg_52111_qualified_rows')::integer
     or v_manifest.membership_duplicate_pairs is distinct from (v_actual->>'membership_duplicate_pairs')::integer
     or v_manifest.membership_fail_closed_qualified_rows is distinct from (v_actual->>'membership_fail_closed_qualified_rows')::integer
     or to_jsonb(v_manifest.affected_universe_codes) is distinct from v_actual->'affected_universe_codes'
     or v_manifest.affected_universe_manifest is distinct from v_actual->'affected_universe_manifest'
     or v_manifest.membership_set_sha256 is distinct from v_actual->>'membership_set_sha256'
     or v_manifest.affected_universe_set_sha256 is distinct from v_actual->>'affected_universe_set_sha256' then
    raise exception 'membership-bound rank input manifest mismatch for %', p_run_date;
  end if;

  with m as (
    select * from public.apt_market_cap_snapshot where snapshot_date = p_run_date
  ), e as (
    select * from public.complex_eligibility_snapshot where snapshot_date = p_run_date
  ), paired as (
    select coalesce(m.complex_id,e.complex_id) as complex_id,
           m.complex_id as m_id, e.complex_id as e_id,
           m.market_cap_krw, m.coverage_status, m.calculation_version,
           e.is_rank_eligible, e.eligibility_status, e.rule_version,
           e.manual_override,
           a.is_active, a.master_status, a.merged_into_complex_id
    from m full join e using (snapshot_date,complex_id)
    left join public.apt_complex a
      on a.complex_id = coalesce(m.complex_id,e.complex_id)
  ), market_cap_hashes as (
    select complex_id,
           encode(sha256(convert_to(jsonb_build_array(
             complex_id,market_cap_krw,coverage_status,calculation_version,
             total_household_count,priced_household_count,priced_household_ratio,
             total_cluster_count,priced_cluster_count
           )::text,'UTF8')),'hex') as row_hash
    from m
  ), eligibility_hashes as (
    select complex_id,
           encode(sha256(convert_to(jsonb_build_array(
             complex_id,is_rank_eligible,eligibility_status,rule_version,manual_override,
             total_household_count,priced_household_count,total_cluster_count,priced_cluster_count
           )::text,'UTF8')),'hex') as row_hash
    from e
  ), row_hashes as (
    select complex_id,
           encode(sha256(convert_to(jsonb_build_array(
             complex_id,m_id,e_id,market_cap_krw,coverage_status,calculation_version,
             is_rank_eligible,eligibility_status,rule_version,manual_override,
             is_active,master_status,merged_into_complex_id
           )::text,'UTF8')),'hex') as row_hash
    from paired
  )
  select
    (select count(*) from m),
    (select count(*) from e),
    count(*) filter (where m_id is not null and e_id is not null),
    count(*) filter (where m_id is not null and e_id is null),
    count(*) filter (where m_id is null and e_id is not null),
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from market_cap_hashes),
    (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from eligibility_hashes),
    upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex'))
  into v_market_cap_rows,v_eligibility_rows,v_join_rows,v_mcap_only,
       v_eligibility_only,v_market_cap_set_sha256,v_eligibility_set_sha256,
       v_source_set_sha256
  from paired join row_hashes using (complex_id);

  select count(*) into v_qualified_rows
  from public.v_koaptix_canonical_rank_input_u
  where snapshot_date = p_run_date;

  select count(*) into v_unexpected_mcap_versions
  from public.apt_market_cap_snapshot m
  where m.snapshot_date=p_run_date
    and (m.calculation_version is null
      or not (m.calculation_version=any(v_manifest.market_cap_calculation_versions)));

  select count(*) into v_unexpected_eligibility_versions
  from public.complex_eligibility_snapshot e
  where e.snapshot_date=p_run_date
    and (e.rule_version is null
      or not (e.rule_version=any(v_manifest.eligibility_rule_versions)));

  select count(*) into v_unauthorized_manual_overrides
  from public.complex_eligibility_snapshot e
  where e.snapshot_date=p_run_date
    and e.manual_override is true
    and not v_manifest.manual_override_allowed;

  select
    (select count(*) from public.apt_market_cap_snapshot m
      where m.snapshot_date=p_run_date
        and (m.calculation_version is null or btrim(m.calculation_version)=''
          or m.coverage_status is null or btrim(m.coverage_status)=''))
    +
    (select count(*) from public.complex_eligibility_snapshot e
      where e.snapshot_date=p_run_date
        and (e.rule_version is null or btrim(e.rule_version)=''
          or e.eligibility_status is null or btrim(e.eligibility_status)=''
          or e.is_rank_eligible is null or e.manual_override is null))
  into v_invalid_source_contract_rows;

  select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex'))
  into v_selected_input_sha256
  from (
    select i.complex_id,
           encode(sha256(convert_to(jsonb_build_array(
             i.complex_id,i.market_cap_krw,i.coverage_status,
             i.market_cap_calculation_version,i.eligibility_status,
             i.eligibility_rule_version,i.manual_override
           )::text,'UTF8')),'hex') as row_hash
    from public.v_koaptix_canonical_rank_input_u i
    where i.snapshot_date=p_run_date
  ) selected_hashes;

  if v_market_cap_rows <> v_manifest.expected_market_cap_rows
     or v_eligibility_rows <> v_manifest.expected_eligibility_rows
     or v_join_rows <> v_manifest.expected_join_rows
     or v_qualified_rows <> v_manifest.expected_qualified_rows
     or v_mcap_only <> 0 or v_eligibility_only <> 0
     or v_unexpected_mcap_versions <> 0
     or v_unexpected_eligibility_versions <> 0
     or v_unauthorized_manual_overrides <> 0
     or v_invalid_source_contract_rows <> 0
     or v_market_cap_set_sha256 <> v_manifest.market_cap_set_sha256
     or v_eligibility_set_sha256 <> v_manifest.eligibility_set_sha256
     or v_source_set_sha256 <> v_manifest.source_set_sha256
     or v_selected_input_sha256 <> v_manifest.selected_input_sha256 then
    raise exception 'canonical rank input manifest mismatch for %', p_run_date;
  end if;

  if exists (select 1 from public.complex_rank_history where snapshot_date=p_run_date) then
    raise exception 'target rank date collision: %', p_run_date;
  end if;

  with ranked as (
    select i.snapshot_date,i.complex_id,i.market_cap_krw,
           row_number() over (order by i.market_cap_krw desc,i.complex_id asc)::integer as rank_all
    from public.v_koaptix_canonical_rank_input_u i
    where i.snapshot_date=p_run_date
  )
  insert into public.complex_rank_history
    (snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap)
  select snapshot_date,complex_id,market_cap_krw,rank_all,market_cap_krw
  from ranked
  order by rank_all;
  get diagnostics v_inserted_rows = row_count;

  if v_inserted_rows <> v_manifest.expected_qualified_rows
     or (select count(distinct complex_id) from public.complex_rank_history where snapshot_date=p_run_date) <> v_inserted_rows
     or (select min(rank_all) from public.complex_rank_history where snapshot_date=p_run_date) <> 1
     or (select max(rank_all) from public.complex_rank_history where snapshot_date=p_run_date) <> v_inserted_rows then
    raise exception 'postinsert rank invariant failed for %', p_run_date;
  end if;

  return jsonb_build_object(
    'snapshot_date',p_run_date,
    'manifest_run_id',v_manifest.run_id,
    'inserted_rows',v_inserted_rows,
    'source_set_sha256',v_source_set_sha256
  );
end;
$function$;

do $koaptix_m904_append_owner_pre$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.append_daily_rank_history(date)'
         )) is distinct from 'postgres'
     or not pg_catalog.pg_has_role(
       'postgres','koaptix_rank_publication_owner','SET'
     ) then
    raise exception using errcode='P0001',message='M904_APPEND_OWNER_PRE_AUTHORITY';
  end if;
end;
$koaptix_m904_append_owner_pre$;

alter function public.append_daily_rank_history(date)
  owner to koaptix_rank_publication_owner;
do $koaptix_m904_append_owner_transferred$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.append_daily_rank_history(date)'
         )) is distinct from 'koaptix_rank_publication_owner' then
    raise exception using errcode='P0001',message='M904_APPEND_OWNER_TRANSFER';
  end if;
end;
$koaptix_m904_append_owner_transferred$;
set local role koaptix_rank_publication_owner;
do $koaptix_m904_append_owner_role$
begin
  if current_user<>'koaptix_rank_publication_owner'
     or session_user<>'postgres' then
    raise exception using errcode='P0001',message='M904_APPEND_OWNER_ROLE';
  end if;
end;
$koaptix_m904_append_owner_role$;
revoke all on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
       koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
       koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;
reset role;
do $koaptix_m904_append_owner_reset$
begin
  if current_user<>'postgres' or session_user<>'postgres'
     or (select pg_catalog.pg_get_userbyid(proc.proowner)
         from pg_catalog.pg_proc proc
         where proc.oid=pg_catalog.to_regprocedure(
           'public.append_daily_rank_history(date)'
         )) is distinct from 'koaptix_rank_publication_owner' then
    raise exception using errcode='P0001',message='M904_APPEND_OWNER_RESET';
  end if;
end;
$koaptix_m904_append_owner_reset$;
revoke create on schema public from koaptix_rank_authority_owner restrict;
revoke create on schema public from koaptix_rank_publication_owner restrict;
revoke koaptix_rank_authority_owner from postgres granted by postgres restrict;
revoke koaptix_rank_publication_owner from postgres granted by postgres restrict;

do $koaptix_m904_owner_bootstrap_post$
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_POST_EXECUTOR_IDENTITY';
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_POST_MEMBERSHIP_GRAPH';
  end if;
  if (select r.rolname from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='public')
       is distinct from 'pg_database_owner' then
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_POST_SCHEMA_OWNER';
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
      raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_POST_TARGET_STATE';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_namespace n
    where n.nspname='public'
      and coalesce(pg_catalog.array_ndims(
            coalesce(n.nspacl,pg_catalog.acldefault('n',n.nspowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M904_ACLEXPLODE_MULTIDIMENSIONAL_ACL_03';
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
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_POST_SCHEMA_ACL_EXPANSION';
  end if;
  for v_object in select * from (values
      ('FUNCTION','public.koaptix_compute_rank_input_authority(date)','koaptix_rank_publication_owner'),
      ('FUNCTION','public.koaptix_seal_rank_input_manifest(jsonb)','koaptix_rank_authority_owner'),
      ('FUNCTION','public.koaptix_revoke_rank_input_manifest(jsonb)','koaptix_rank_authority_owner'),
      ('FUNCTION','public.append_daily_rank_history(date)','koaptix_rank_publication_owner')
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
      raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_OWNER_MANIFEST';
    end if;
    v_owner_count:=v_owner_count+1;
  end loop;
  if v_owner_count<>4 then
    raise exception using errcode='P0001',message='M904_OWNER_BOOTSTRAP_OWNER_COUNT';
  end if;
end;
$koaptix_m904_owner_bootstrap_post$;

update koaptix_migration_904_allowed_writer allowed
set resolved_oid=pg_catalog.to_regprocedure(allowed.routine_identity);

-- Preserve the two official zero-argument helper interfaces without allowing
-- either pre-900 body to rebuild a serving view from legacy history. The
-- publisher-backed compatibility views are ordinary views and follow the
-- active publication pointer without a refresh mutation. These helpers verify
-- the active generation authority and require the installed view to have
-- exactly one public relation source: the canonical GLOBAL_LATEST published view.
create or replace function public.refresh_koaptix_latest_rank_board()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_surface oid:=pg_catalog.to_regclass('public.v_koaptix_latest_rank_board');
  v_publisher oid:=pg_catalog.to_regclass('public.v_koaptix_latest_global_rank_board_published');
  v_generation_id uuid;
  v_verification jsonb;
begin
  select publication.active_generation_id
    into strict v_generation_id
  from public.koaptix_latest_board_publication publication
  where publication.singleton_id;
  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_latest_rank_board() active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);
  if v_surface is null
     or v_publisher is null
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_surface) is distinct from 'v'::"char"
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_publisher) is distinct from 'v'::"char"
     or not exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        and dependency.refobjid=v_publisher
        and dependency.deptype='n'
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
     )
     or exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
       join pg_catalog.pg_class referenced_relation
         on referenced_relation.oid=dependency.refobjid
       join pg_catalog.pg_namespace referenced_namespace
         on referenced_namespace.oid=referenced_relation.relnamespace
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
         and referenced_namespace.nspname='public'
         and dependency.refobjid<>all(array[v_surface,v_publisher])
     ) then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_latest_rank_board() publisher binding drift';
  end if;
  return;
end;
$function$;

create or replace function public.refresh_koaptix_home_kpi()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_surface oid:=pg_catalog.to_regclass('public.v_koaptix_home_kpi');
  v_publisher oid:=pg_catalog.to_regclass('public.v_koaptix_latest_global_rank_board_published');
  v_generation_id uuid;
  v_verification jsonb;
begin
  select publication.active_generation_id
    into strict v_generation_id
  from public.koaptix_latest_board_publication publication
  where publication.singleton_id;
  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_home_kpi() active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);
  if v_surface is null
     or v_publisher is null
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_surface) is distinct from 'v'::"char"
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_publisher) is distinct from 'v'::"char"
     or not exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        and dependency.refobjid=v_publisher
        and dependency.deptype='n'
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
     )
     or exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
       join pg_catalog.pg_class referenced_relation
         on referenced_relation.oid=dependency.refobjid
       join pg_catalog.pg_namespace referenced_namespace
         on referenced_namespace.oid=referenced_relation.relnamespace
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
         and referenced_namespace.nspname='public'
         and dependency.refobjid<>all(array[v_surface,v_publisher])
     ) then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_home_kpi() publisher binding drift';
  end if;
  return;
end;
$function$;

-- Preserve the date-taking compatibility interface without allowing its
-- pre-900 direct-history bridge to delete or insert snapshot rows. A normal
-- success now means that the requested date is already the active sealed
-- canonical publication; the legacy JSON shape is retained without mutation.
create or replace function public.sync_rank_snapshot_from_history(p_run_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_generation_id uuid;
  v_source_authority_kind text;
  v_affected_rank_date date;
  v_snapshot_date date;
  v_previous_snapshot_date date;
  v_verification jsonb;
begin
  if p_run_date is null then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) requires a non-null run date';
  end if;

  select publication.active_generation_id,
         generation.source_authority_kind,
         generation.affected_rank_date,
         surface.snapshot_date,
         surface.previous_snapshot_date
    into v_generation_id,
         v_source_authority_kind,
         v_affected_rank_date,
         v_snapshot_date,
         v_previous_snapshot_date
  from public.koaptix_latest_board_publication publication
  join public.koaptix_latest_board_generation generation
    on generation.generation_id=publication.active_generation_id
  join public.koaptix_latest_board_generation_surface surface
    on surface.generation_id=generation.generation_id
   and surface.surface_code='GLOBAL_LATEST'
  where publication.singleton_id;

  if v_generation_id is null then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) canonical publisher state unavailable';
  end if;

  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);

  if v_source_authority_kind is distinct from 'SEALED_RANK_INPUT_MANIFEST'
     or v_affected_rank_date is distinct from p_run_date
     or v_snapshot_date is distinct from p_run_date then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) publisher date binding failed';
  end if;

  return jsonb_build_object(
    'target_table','public.koaptix_rank_snapshot',
    'inserted_rows',0,
    'previous_snapshot_date',v_previous_snapshot_date
  );
end;
$function$;

do $m904_publisher_helper_poststate$
begin
  if exists (
    select 1
    from (values
      (
        'public.refresh_koaptix_latest_rank_board()',
        'void',
        $latest_body$
declare
  v_surface oid:=pg_catalog.to_regclass('public.v_koaptix_latest_rank_board');
  v_publisher oid:=pg_catalog.to_regclass('public.v_koaptix_latest_global_rank_board_published');
  v_generation_id uuid;
  v_verification jsonb;
begin
  select publication.active_generation_id
    into strict v_generation_id
  from public.koaptix_latest_board_publication publication
  where publication.singleton_id;
  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_latest_rank_board() active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);
  if v_surface is null
     or v_publisher is null
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_surface) is distinct from 'v'::"char"
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_publisher) is distinct from 'v'::"char"
     or not exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        and dependency.refobjid=v_publisher
        and dependency.deptype='n'
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
     )
     or exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
       join pg_catalog.pg_class referenced_relation
         on referenced_relation.oid=dependency.refobjid
       join pg_catalog.pg_namespace referenced_namespace
         on referenced_namespace.oid=referenced_relation.relnamespace
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
         and referenced_namespace.nspname='public'
         and dependency.refobjid<>all(array[v_surface,v_publisher])
     ) then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_latest_rank_board() publisher binding drift';
  end if;
  return;
end;
$latest_body$
      ),
      (
        'public.refresh_koaptix_home_kpi()',
        'void',
        $home_body$
declare
  v_surface oid:=pg_catalog.to_regclass('public.v_koaptix_home_kpi');
  v_publisher oid:=pg_catalog.to_regclass('public.v_koaptix_latest_global_rank_board_published');
  v_generation_id uuid;
  v_verification jsonb;
begin
  select publication.active_generation_id
    into strict v_generation_id
  from public.koaptix_latest_board_publication publication
  where publication.singleton_id;
  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_home_kpi() active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);
  if v_surface is null
     or v_publisher is null
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_surface) is distinct from 'v'::"char"
     or (select relation_row.relkind from pg_catalog.pg_class relation_row where relation_row.oid=v_publisher) is distinct from 'v'::"char"
     or not exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
        and dependency.refobjid=v_publisher
        and dependency.deptype='n'
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
     )
     or exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       join pg_catalog.pg_depend dependency
         on dependency.classid='pg_catalog.pg_rewrite'::pg_catalog.regclass
        and dependency.objid=rewrite_rule.oid
        and dependency.refclassid='pg_catalog.pg_class'::pg_catalog.regclass
       join pg_catalog.pg_class referenced_relation
         on referenced_relation.oid=dependency.refobjid
       join pg_catalog.pg_namespace referenced_namespace
         on referenced_namespace.oid=referenced_relation.relnamespace
       where rewrite_rule.ev_class=v_surface
         and rewrite_rule.rulename='_RETURN'
         and referenced_namespace.nspname='public'
         and dependency.refobjid<>all(array[v_surface,v_publisher])
     ) then
    raise exception using
      errcode='P0001',
      message='refresh_koaptix_home_kpi() publisher binding drift';
  end if;
  return;
end;
$home_body$
      ),
      (
        'public.sync_rank_snapshot_from_history(date)',
        'jsonb',
        $sync_body$
declare
  v_generation_id uuid;
  v_source_authority_kind text;
  v_affected_rank_date date;
  v_snapshot_date date;
  v_previous_snapshot_date date;
  v_verification jsonb;
begin
  if p_run_date is null then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) requires a non-null run date';
  end if;

  select publication.active_generation_id,
         generation.source_authority_kind,
         generation.affected_rank_date,
         surface.snapshot_date,
         surface.previous_snapshot_date
    into v_generation_id,
         v_source_authority_kind,
         v_affected_rank_date,
         v_snapshot_date,
         v_previous_snapshot_date
  from public.koaptix_latest_board_publication publication
  join public.koaptix_latest_board_generation generation
    on generation.generation_id=publication.active_generation_id
  join public.koaptix_latest_board_generation_surface surface
    on surface.generation_id=generation.generation_id
   and surface.surface_code='GLOBAL_LATEST'
  where publication.singleton_id;

  if v_generation_id is null then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) canonical publisher state unavailable';
  end if;

  v_verification:=public.koaptix_verify_latest_board_generation(v_generation_id);
  if coalesce((v_verification->>'verified')::boolean,false) is not true
     or (v_verification->>'generation_id')::uuid is distinct from v_generation_id then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) active generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation_id);

  if v_source_authority_kind is distinct from 'SEALED_RANK_INPUT_MANIFEST'
     or v_affected_rank_date is distinct from p_run_date
     or v_snapshot_date is distinct from p_run_date then
    raise exception using
      errcode='P0001',
      message='sync_rank_snapshot_from_history(date) publisher date binding failed';
  end if;

  return jsonb_build_object(
    'target_table','public.koaptix_rank_snapshot',
    'inserted_rows',0,
    'previous_snapshot_date',v_previous_snapshot_date
  );
end;
$sync_body$
      )
    ) expected(routine_identity,result_type,prosrc)
    join koaptix_migration_904_writer_authority authority
      using (routine_identity)
    join koaptix_migration_904_routine_observation observation
      using (routine_identity)
    left join pg_catalog.pg_proc proc
      on proc.oid=authority.resolved_oid
    left join pg_catalog.pg_language language
      on language.oid=proc.prolang
    where proc.oid is null
       or pg_catalog.to_regprocedure(expected.routine_identity) is distinct from proc.oid
       or language.lanname<>'plpgsql'
       or proc.prokind<>'f'
       or proc.provolatile<>'v'
       or proc.proparallel<>'u'
       or proc.proisstrict
       or proc.proleakproof
       or not proc.prosecdef
       or proc.proretset
       or coalesce(proc.proconfig,array[]::text[])
            is distinct from array['search_path=public']::text[]
       or pg_catalog.pg_get_function_result(proc.oid)<>expected.result_type
       or pg_catalog.btrim(proc.prosrc)<>pg_catalog.btrim(expected.prosrc)
       or proc.proowner is distinct from observation.owner_oid
       or proc.proacl is distinct from observation.raw_acl
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: publisher-backed helper replacement poststate drift';
  end if;
end;
$m904_publisher_helper_poststate$;

-- KOAPTIX_M904_LOCAL_CONTRACT_V2_BEGIN
-- Bounded positive postconditions for exact M900-M904-controlled targets.
do $m904_local_contract_v2$
declare
  v_role text;
  v_table text;
  v_privilege text;
  v_signature text;
  v_expected_signature text;
  v_column record;
begin

  if exists (
    select 1
    from (values
      ('koaptix_rank_authority_owner'),
      ('koaptix_rank_publication_owner'),
      ('koaptix_rank_authority_reader'),
      ('koaptix_rank_manifest_sealer'),
      ('koaptix_rank_manifest_revoker'),
      ('koaptix_rank_bootstrap_seeder'),
      ('koaptix_rank_generation_builder'),
      ('koaptix_rank_generation_publisher'),
      ('koaptix_rank_publication_rollback')
    ) expected(role_name)
    left join pg_catalog.pg_roles role_row
      on role_row.rolname=expected.role_name
    where role_row.oid is null
       or role_row.rolcanlogin
       or role_row.rolsuper
       or role_row.rolcreatedb
       or role_row.rolcreaterole
       or role_row.rolinherit
       or role_row.rolreplication
       or role_row.rolbypassrls
  ) then
    raise exception using errcode='P0001',
      message='M904_LOCAL_CONTRACT_V2: CONTROLLED_ROLE_ATTRIBUTE_MISMATCH';
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
      message='904 definition deployment requires exact accepted post-M900 nine-edge recovery-role membership graph';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_protected_relation protected
    left join pg_catalog.pg_class relation_row
      on relation_row.oid=protected.resolved_oid
    where protected.resolved_oid is null
       or protected.expected_owner_oid is null
       or relation_row.oid is null
       or relation_row.relowner is distinct from protected.expected_owner_oid
  ) then
    raise exception using errcode='P0001',
      message='M904_LOCAL_CONTRACT_V2: CONTROLLED_RELATION_OWNER_MISMATCH';
  end if;


  foreach v_role in array array[
    'anon','authenticated','service_role',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    foreach v_table in array array[
      'public.complex_rank_history','public.koaptix_rank_snapshot',
      'public.koaptix_latest_board_read_model',
      'public.koaptix_rank_input_authority_manifest',
      'public.koaptix_rank_input_manifest_revocation',
      'public.koaptix_latest_board_generation',
      'public.koaptix_latest_board_generation_surface',
      'public.koaptix_latest_board_generation_universe',
      'public.koaptix_latest_board_generation_row',
      'public.koaptix_latest_board_generation_global_row',
      'public.koaptix_rank_publication_history_stage',
      'public.koaptix_rank_publication_snapshot_stage',
      'public.koaptix_latest_board_publication_event',
      'public.koaptix_latest_board_publication'
    ] loop
      foreach v_privilege in array array[
        'INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] loop
        if has_table_privilege(v_role,v_table,v_privilege) then
          raise exception 'final direct table writer remains: %, %, %',
            v_role,v_table,v_privilege;
        end if;
      end loop;
      for v_column in
        select a.attname from pg_catalog.pg_attribute a
        where a.attrelid=v_table::regclass and a.attnum>0 and not a.attisdropped
      loop
        foreach v_privilege in array array['INSERT','UPDATE','REFERENCES'] loop
          if has_column_privilege(v_role,v_table,v_column.attname,v_privilege) then
            raise exception 'final direct column writer remains: %, %, %, %',
              v_role,v_table,v_column.attname,v_privilege;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  if exists (
    select 1
    from (values
      ('public.complex_rank_history'),('public.koaptix_rank_snapshot'),
      ('public.koaptix_latest_board_read_model'),
      ('public.koaptix_rank_input_authority_manifest'),
      ('public.koaptix_rank_input_manifest_revocation'),
      ('public.koaptix_latest_board_generation'),
      ('public.koaptix_latest_board_generation_surface'),
      ('public.koaptix_latest_board_generation_universe'),
      ('public.koaptix_latest_board_generation_row'),
      ('public.koaptix_latest_board_generation_global_row'),
      ('public.koaptix_rank_publication_history_stage'),
      ('public.koaptix_rank_publication_snapshot_stage'),
      ('public.koaptix_latest_board_publication_event'),
      ('public.koaptix_latest_board_publication')
    ) target_relation(identity)
    join pg_catalog.pg_class relation_row
      on relation_row.oid=pg_catalog.to_regclass(target_relation.identity)
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper and role_row.oid<>relation_row.relowner
     and role_row.rolname not like 'pg_%'
     and role_row.rolname not in (
       'koaptix_rank_authority_owner','koaptix_rank_publication_owner'
     )
    cross join (values
      ('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')
    ) write_privilege(privilege_name)
    where pg_catalog.has_table_privilege(
      role_row.oid,relation_row.oid,write_privilege.privilege_name
    )
  ) then
    raise exception 'final protected relation has an unapproved effective writer';
  end if;

  if exists (
    select 1
    from (values
      ('public.complex_rank_history'),('public.koaptix_rank_snapshot'),
      ('public.koaptix_latest_board_read_model'),
      ('public.koaptix_rank_input_authority_manifest'),
      ('public.koaptix_rank_input_manifest_revocation'),
      ('public.koaptix_latest_board_generation'),
      ('public.koaptix_latest_board_generation_surface'),
      ('public.koaptix_latest_board_generation_universe'),
      ('public.koaptix_latest_board_generation_row'),
      ('public.koaptix_latest_board_generation_global_row'),
      ('public.koaptix_rank_publication_history_stage'),
      ('public.koaptix_rank_publication_snapshot_stage'),
      ('public.koaptix_latest_board_publication_event'),
      ('public.koaptix_latest_board_publication')
    ) target_relation(identity)
    join pg_catalog.pg_class relation_row
      on relation_row.oid=pg_catalog.to_regclass(target_relation.identity)
    join pg_catalog.pg_attribute column_row
      on column_row.attrelid=relation_row.oid
     and column_row.attnum>0 and not column_row.attisdropped
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper and role_row.oid<>relation_row.relowner
     and role_row.rolname not like 'pg_%'
     and role_row.rolname not in (
       'koaptix_rank_authority_owner','koaptix_rank_publication_owner'
     )
    cross join (values ('INSERT'),('UPDATE'),('REFERENCES'))
      write_privilege(privilege_name)
    where pg_catalog.has_column_privilege(
      role_row.oid,relation_row.oid,column_row.attname,
      write_privilege.privilege_name
    )
  ) then
    raise exception 'final protected relation has an unapproved effective column writer';
  end if;

  foreach v_role in array array[
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    v_expected_signature := case v_role
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
      if has_function_privilege(v_role,to_regprocedure(v_signature),'EXECUTE')
           is distinct from (v_signature=v_expected_signature) then
        raise exception 'single-entrypoint action-role matrix mismatch: %, %',
          v_role,v_signature;
      end if;
    end loop;
  end loop;

  -- CREATE OR REPLACE preserves the append routine and compatibility-helper OIDs.
  -- Every other Migration-900 routine remains byte-, owner-, structure- and
  -- ACL-identical to the pre-mutation observation.
  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    left join pg_catalog.pg_proc proc on proc.oid=authority.resolved_oid
    left join koaptix_migration_904_routine_observation observation
      using (routine_identity)
    where proc.oid is null
       or pg_catalog.to_regprocedure(authority.routine_identity) is distinct from authority.resolved_oid
       or (
         authority.routine_identity not in (
           'public.append_daily_rank_history(date)',
           'public.refresh_koaptix_home_kpi()',
           'public.refresh_koaptix_latest_rank_board()',
           'public.sync_rank_snapshot_from_history(date)'
         )
         and (
           proc.proowner is distinct from observation.owner_oid
           or proc.prokind is distinct from case observation.routine_kind when 'FUNCTION' then 'f'::"char" else 'p'::"char" end
           or pg_catalog.pg_get_function_identity_arguments(proc.oid) is distinct from observation.identity_arguments
           or proc.proacl is distinct from observation.raw_acl
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
              )),'hex')) is distinct from observation.canonical_definition_sha256
         )
       )
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: accepted Migration-900 routine changed during Migration 904';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_nonwriter_acl_baseline baseline
    left join pg_catalog.pg_proc proc on proc.oid=baseline.resolved_oid
    where proc.oid is null
       or proc.proowner is distinct from baseline.owner_oid
       or proc.proacl is distinct from baseline.raw_acl
  ) then
    raise exception 'accepted Migration-900 nonwriter ACL changed during Migration 904';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    cross join (values
      ('anon'),('authenticated'),('service_role'),
      ('koaptix_rank_authority_reader'),('koaptix_rank_manifest_sealer'),
      ('koaptix_rank_manifest_revoker'),('koaptix_rank_bootstrap_seeder'),
      ('koaptix_rank_generation_builder'),('koaptix_rank_generation_publisher'),
      ('koaptix_rank_publication_rollback')
    ) checked_role(role_name)
    join pg_catalog.pg_roles role_row on role_row.rolname=checked_role.role_name
    where authority.protected_writer
      and pg_catalog.has_function_privilege(
        role_row.oid,authority.resolved_oid,'EXECUTE'
      )
  ) then
    raise exception 'final executable Migration-900 protected writer remains';
  end if;

  if exists (
       select 1
       from koaptix_migration_904_allowed_writer allowed
       left join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
       left join pg_catalog.pg_language language on language.oid=proc.prolang
       left join pg_catalog.pg_roles expected_owner
         on expected_owner.rolname=allowed.expected_owner_role
       left join pg_catalog.pg_roles allowed_role
         on allowed_role.rolname=allowed.allowed_execute_role
       where proc.oid is null
          or pg_catalog.to_regprocedure(allowed.routine_identity) is distinct from allowed.resolved_oid
          or case proc.prokind when 'f' then 'FUNCTION' when 'p' then 'PROCEDURE' else 'UNSUPPORTED' end
             is distinct from allowed.routine_kind
           or (allowed.expected_owner_role is not null
               and proc.proowner is distinct from expected_owner.oid)
           or (allowed.allowed_execute_role is not null and allowed_role.oid is null)
           or (
             allowed.authority_source<>'MIGRATION_900_PROTECTED_WRITER'
             and (
               allowed.expected_definition_sha256 is null
               or language.lanname is distinct from allowed.expected_language
               or case proc.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' when 'v' then 'VOLATILE' end
                  is distinct from allowed.expected_volatility
               or case proc.proparallel when 's' then 'SAFE' when 'r' then 'RESTRICTED' when 'u' then 'UNSAFE' end
                  is distinct from allowed.expected_parallel
               or proc.proisstrict is distinct from allowed.expected_strict
               or proc.proleakproof is distinct from allowed.expected_leakproof
               or case when proc.prosecdef then 'SECURITY_DEFINER' else 'SECURITY_INVOKER' end
                  is distinct from allowed.expected_security_mode
               or coalesce(proc.proconfig,array[]::text[])
                  is distinct from allowed.expected_proconfig
               or pg_catalog.pg_get_function_result(proc.oid)
                  is distinct from allowed.expected_result_type
               or proc.proretset is distinct from allowed.expected_returns_set
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
                  )),'hex')) is distinct from allowed.expected_definition_sha256
             )
           )
      )
     or exists (
       select 1
       from koaptix_migration_904_writer_authority authority
       left join koaptix_migration_904_allowed_writer allowed
         on allowed.routine_identity=authority.routine_identity
        and allowed.authority_source='MIGRATION_900_PROTECTED_WRITER'
       where authority.protected_writer and allowed.resolved_oid is null
     )
     or exists (
       select 1
       from koaptix_migration_904_allowed_writer allowed
       left join koaptix_migration_904_writer_authority authority
         on authority.routine_identity=allowed.routine_identity
        and authority.protected_writer
       where allowed.authority_source='MIGRATION_900_PROTECTED_WRITER'
         and authority.resolved_oid is null
     ) then
    raise exception 'AUTHORITY_UNRESOLVED: exact final allowed-writer inventory drift';
  end if;


  if exists (
    select 1
    from pg_catalog.pg_proc proc
    left join pg_catalog.pg_language language on language.oid=proc.prolang
    where proc.oid=pg_catalog.to_regprocedure('public.append_daily_rank_history(date)')
      and (
        proc.proowner is distinct from pg_catalog.to_regrole('koaptix_rank_publication_owner')
        or proc.prokind<>'f'
        or pg_catalog.pg_get_function_identity_arguments(proc.oid)<>'p_run_date date'
        or language.lanname<>'plpgsql'
        or proc.provolatile<>'v' or proc.proparallel<>'u'
        or proc.proisstrict or proc.proleakproof or not proc.prosecdef
        or coalesce(proc.proconfig,array[]::text[])
           is distinct from array['search_path=pg_catalog, public']
        or pg_catalog.pg_get_function_result(proc.oid)<>'jsonb'
        or proc.proretset
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
           )),'hex'))<>'E74CDCF102B7D89A8DB22853A1B89A5F330DC8D66E5BCFA82158DC403F0CA026'
      )
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: post-904 append writer definition or structure drift';
  end if;


  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    cross join lateral pg_catalog.unnest(
      authority.declared_mutation_targets
    ) target(identity)
    left join koaptix_migration_904_protected_relation protected
      on protected.resolved_oid=pg_catalog.to_regclass(target.identity)
    where authority.protected_writer
      and protected.resolved_oid is null
  ) then
    raise exception using
      errcode='P0001',
      message='M904_LOCAL_CONTRACT_V2: DECLARED_RELATION_NOT_CANONICAL';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_writer_authority authority
    cross join lateral pg_catalog.unnest(
      authority.declared_protected_callees
    ) callee(identity)
    left join koaptix_migration_904_allowed_writer allowed
      on allowed.resolved_oid=pg_catalog.to_regprocedure(callee.identity)
    where authority.protected_writer
      and allowed.resolved_oid is null
  ) then
    raise exception using
      errcode='P0001',
      message='M904_LOCAL_CONTRACT_V2: DECLARED_CALLEE_NOT_CANONICAL';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_allowed_writer allowed
    join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
    left join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname=allowed.allowed_execute_role
    where coalesce(pg_catalog.array_ndims(
            coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M904_ACLEXPLODE_MULTIDIMENSIONAL_ACL_04';
  end if;
  if exists (
    select 1
    from koaptix_migration_904_allowed_writer allowed
    join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
    left join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname=allowed.allowed_execute_role
    cross join lateral pg_catalog.unnest(
      coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
    ) with ordinality acl_source(acl_item,acl_ordinal)
    cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
    where acl.privilege_type<>'EXECUTE'
       or not (
         acl.grantee=proc.proowner
         or (
           allowed_role.oid is not null
           and acl.grantee=allowed_role.oid
           and acl.grantor=proc.proowner
           and not acl.is_grantable
         )
       )
  ) then
    raise exception 'final writer closure contains an unapproved direct ACL entry';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_allowed_writer allowed
    join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
    join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname=allowed.allowed_execute_role
    where coalesce(pg_catalog.array_ndims(
            coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
          ),0)>1
  ) then
    raise exception using errcode='22023',message='M904_ACLEXPLODE_MULTIDIMENSIONAL_ACL_05';
  end if;
  if exists (
    select 1
    from koaptix_migration_904_allowed_writer allowed
    join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
    join pg_catalog.pg_roles allowed_role
      on allowed_role.rolname=allowed.allowed_execute_role
    where not exists (
      select 1
      from pg_catalog.unnest(
        coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
      ) with ordinality acl_source(acl_item,acl_ordinal)
      cross join lateral pg_catalog.aclexplode(array[acl_source.acl_item]::aclitem[]) acl
      where acl.privilege_type='EXECUTE'
        and acl.grantee=allowed_role.oid
        and acl.grantor=proc.proowner
        and not acl.is_grantable
    )
  ) then
    raise exception 'final writer closure is missing an exact action-role grant';
  end if;

  if exists (
    select 1
    from koaptix_migration_904_allowed_writer allowed
    join pg_catalog.pg_proc proc on proc.oid=allowed.resolved_oid
    join pg_catalog.pg_roles role_row
      on not role_row.rolsuper
     and role_row.oid<>proc.proowner
     and role_row.rolname is distinct from allowed.allowed_execute_role
    where pg_catalog.has_function_privilege(
      role_row.oid,allowed.resolved_oid,'EXECUTE'
    )
  ) then
    raise exception 'final writer closure contains an unapproved effective grantee';
  end if;
end;
$m904_local_contract_v2$;

commit;
