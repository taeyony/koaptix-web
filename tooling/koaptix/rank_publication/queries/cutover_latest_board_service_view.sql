-- Guarded definition/ACL cutover only. This file is never run by a tracked
-- application or producer. Execution requires a separate exact approval after
-- the no-store application has been deployed on every instance and observed for
-- at least 991 seconds. It performs no source-row, generation, event, or pointer DML.

begin isolation level serializable;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $cutover_preconditions$
declare
  v_application_deployed_at timestamptz;
  v_application_deployment_id text;
  v_application_instance_count integer;
  v_no_store_evidence_sha256 text;
  v_generation public.koaptix_latest_board_generation%rowtype;
  v_service public.koaptix_latest_board_generation_surface%rowtype;
  v_global public.koaptix_latest_board_generation_surface%rowtype;
  v_generation_verification jsonb;
  v_pre_count bigint;
  v_pre_digest text;
begin
  if current_setting('transaction_isolation') <> 'serializable' then
    raise exception 'latest-board cutover requires SERIALIZABLE';
  end if;

  if current_setting('koaptix.cutover.authorization_proof_exact',true)
       is distinct from 'SEPARATE_GUARDED_FIVE_LATEST_VIEW_AND_READER_ACL_CUTOVER_APPROVAL' then
    raise exception 'exact latest-board view/ACL cutover approval is absent';
  end if;

  v_application_deployment_id:=
    nullif(btrim(current_setting('koaptix.cutover.application_deployment_id',true)),'');
  v_no_store_evidence_sha256:=upper(
    coalesce(current_setting('koaptix.cutover.no_store_evidence_sha256',true),'')
  );
  begin
    v_application_instance_count:=
      nullif(current_setting('koaptix.cutover.application_instance_count',true),'')::integer;
  exception when others then
    raise exception 'koaptix.cutover.application_instance_count must be an exact integer';
  end;
  if v_application_deployment_id is null
     or v_application_instance_count is null
     or v_application_instance_count<1
     or v_no_store_evidence_sha256!~'^[0-9A-F]{64}$' then
    raise exception 'complete all-instance deployment/no-store evidence is absent';
  end if;

  begin
    v_application_deployed_at :=
      nullif(current_setting('koaptix.cutover.application_deployed_at',true),'')::timestamptz;
  exception when others then
    raise exception 'koaptix.cutover.application_deployed_at must be an exact timestamptz';
  end;
  if v_application_deployed_at is null
     or clock_timestamp() < v_application_deployed_at + interval '991 seconds' then
    raise exception 'the required 991-second passive application observation has not elapsed';
  end if;

  select g.*
    into strict v_generation
  from public.koaptix_latest_board_publication p
  join public.koaptix_latest_board_generation g
    on g.generation_id=p.active_generation_id
  where p.singleton_id
  for share of p,g;

  if v_generation.required_surface_codes
       <> array['GLOBAL_LATEST','UNIVERSE_SERVICE']::text[]
     or v_generation.surface_count<>2 then
    raise exception 'the active generation does not contain exactly the two typed surfaces';
  end if;

  select s.* into strict v_global
  from public.koaptix_latest_board_generation_surface s
  where s.generation_id=v_generation.generation_id
    and s.surface_code='GLOBAL_LATEST';
  select s.* into strict v_service
  from public.koaptix_latest_board_generation_surface s
  where s.generation_id=v_generation.generation_id
    and s.surface_code='UNIVERSE_SERVICE';

  v_generation_verification:=
    public.koaptix_verify_latest_board_generation(v_generation.generation_id);
  if coalesce((v_generation_verification->>'verified')::boolean,false) is not true
     or (v_generation_verification->>'generation_id')::uuid
          is distinct from v_generation.generation_id then
    raise exception 'complete active-generation verification failed';
  end if;
  perform public.koaptix_assert_generation_authority(v_generation.generation_id);

  if (select count(*) from public.koaptix_latest_board_generation_surface s
      where s.generation_id=v_generation.generation_id)<>2
     or (select count(*) from public.koaptix_latest_board_generation_global_row r
         where r.generation_id=v_generation.generation_id)<>v_global.row_count
     or (select count(*) from public.koaptix_latest_board_generation_row r
         where r.generation_id=v_generation.generation_id)<>v_service.row_count
     or (select count(*) from public.koaptix_latest_board_generation_universe u
         where u.generation_id=v_generation.generation_id)<>v_service.universe_count
     or public.koaptix_global_rows_digest(v_generation.generation_id)
          is distinct from v_global.full_row_digest_sha256
     or public.koaptix_service_rows_digest(v_generation.generation_id)
          is distinct from v_service.full_row_digest_sha256
     or public.koaptix_service_date_vector_digest(v_generation.generation_id)
          is distinct from v_service.date_vector_sha256
     or v_global.row_count+v_service.row_count
          <>v_generation.total_component_row_count then
    raise exception 'active typed component count or digest verification failed';
  end if;

  if v_generation.source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE' then
    if v_generation.source_authority_key<>'BOOTSTRAP_COMPATIBILITY_BUNDLE_V1'
       or v_generation.combined_surface_manifest_sha256
            <>'F2C78A29E43EAAD77AF815AB2723B3ED5202D70384E7145DDF01BCFC2041DE63'
       or v_global.snapshot_date<>date '2026-07-31'
       or v_global.row_count<>13497
       or v_global.full_row_digest_sha256
            <>'C560F484EA049B56A6251A34FB4C4E39047E24CB2610A0824DADFE114EC92908'
       or v_service.universe_count<>225
       or v_service.row_count<>40484
       or v_service.date_vector_sha256
            <>'6E7BA473DDCC0C25F3F46FFEE443BA41CC9D2435F448531189F843AB28FA82F7'
       or v_service.full_row_digest_sha256
            <>'FB31BF64DF0000EABDD3827581D6B40FEC2D22EE64582C4B1AB28FE6A26D8008' then
      raise exception 'bootstrap active generation differs from the exact V1 control';
    end if;
  elsif v_generation.source_authority_kind='SEALED_RANK_INPUT_MANIFEST' then
    if not exists (
      select 1
      from public.koaptix_rank_input_authority_manifest m
      where m.run_id=v_generation.input_manifest_run_id
        and m.run_id=v_generation.source_authority_key
        and m.snapshot_date=v_generation.affected_rank_date
        and not exists (
          select 1 from public.koaptix_rank_input_manifest_revocation r
          where r.manifest_run_id=m.run_id
        )
    ) then
      raise exception 'active canonical generation manifest is absent or revoked';
    end if;
  else
    raise exception 'unknown active generation authority';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_depend d
    join pg_catalog.pg_rewrite rw
      on d.classid='pg_catalog.pg_rewrite'::regclass and rw.oid=d.objid
    where d.refclassid='pg_catalog.pg_class'::regclass
      and d.refobjid=to_regclass('public.v_koaptix_latest_universe_rank_board_u_v2')
      and rw.ev_class<>d.refobjid
  ) then
    raise exception 'v2 has a dependent view and cannot be isolated by this cutover';
  end if;

  -- Capture full pre-cutover stable-row controls inside this SERIALIZABLE
  -- transaction. Transaction-local GUCs bridge the two DO blocks without a
  -- temporary relation and make any non-authorized row delta fail closed.
  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.snapshot_date,x.rank_all,x.complex_id
           ),''),'UTF8')),'hex'))
    into v_pre_count,v_pre_digest
  from public.v_koaptix_latest_rank_board x;
  perform set_config('koaptix.cutover.pre_latest_rank_count',v_pre_count::text,true);
  perform set_config('koaptix.cutover.pre_latest_rank_digest',v_pre_digest,true);

  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.universe_code,x.rank_all,x.complex_id
           ),''),'UTF8')),'hex'))
    into v_pre_count,v_pre_digest
  from public.v_koaptix_latest_universe_rank_board x
  where x.universe_code<>'JEONBUK_ALL';
  perform set_config('koaptix.cutover.pre_non_jeonbuk_count',v_pre_count::text,true);
  perform set_config('koaptix.cutover.pre_non_jeonbuk_digest',v_pre_digest,true);

  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.snapshot_date,x.universe_code
           ),''),'UTF8')),'hex'))
    into v_pre_count,v_pre_digest
  from (
    select snapshot_date,universe_code,listed_complex_count,listed_units,
      tracked_household_count,total_market_cap,total_market_cap_trillion_krw,
      market_cap_trillion_krw,top50_market_cap,top50_market_cap_trillion_krw
    from public.v_koaptix_home_kpi
  ) x;
  perform set_config('koaptix.cutover.pre_home_kpi_count',v_pre_count::text,true);
  perform set_config('koaptix.cutover.pre_home_kpi_digest',v_pre_digest,true);

  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.complex_id
           ),''),'UTF8')),'hex'))
    into v_pre_count,v_pre_digest
  from (
    select complex_id,apt_name_ko,rank_all,market_cap_krw,
      market_cap_trillion_krw,sigungu_name,legal_dong_name,household_count,
      approval_year,building_count,parking_count
    from public.v_koaptix_complex_detail_sheet
  ) x;
  perform set_config('koaptix.cutover.pre_detail_count',v_pre_count::text,true);
  perform set_config('koaptix.cutover.pre_detail_digest',v_pre_digest,true);
end;
$cutover_preconditions$;

create or replace view public.v_koaptix_latest_universe_rank_board_u as
select
  p.snapshot_date,
  p.universe_code,
  p.universe_name,
  p.universe_scope,
  p.complex_id,
  p.apt_name_ko,
  p.sigungu_name,
  p.legal_dong_name,
  p.build_year,
  p.household_count,
  p.total_household_count,
  p.recovery_52w,
  p.rank_all,
  p.previous_rank_all,
  p.rank_delta_w,
  p.rank_movement,
  p.market_cap_krw,
  p.market_cap_trillion_krw,
  p.market_cap_share,
  p.market_cap_share_pct,
  p.tier_code,
  p.tier_label,
  p.tier_sort,
  p.is_top1000
from public.v_koaptix_latest_board_read_model_published p;

create or replace view public.v_koaptix_latest_rank_board as
select
  p.snapshot_date,
  p.universe_code,
  p.complex_id,
  p.apt_name_ko,
  p.address_road,
  p.address_jibun,
  p.legal_dong_name,
  p.build_year,
  p.sigungu_code,
  p.sigungu_name,
  p.rank_all,
  p.tier_code,
  p.tier_label,
  p.tier_sort,
  p.market_cap_krw,
  p.market_cap_trillion_krw,
  p.market_cap_share,
  p.market_cap_share_pct,
  p.previous_rank_all,
  p.rank_delta_1d,
  p.rank_movement,
  p.is_top1000,
  p.total_household_count,
  p.household_count,
  p.priced_household_count,
  p.priced_household_ratio,
  p.total_cluster_count,
  p.priced_cluster_count,
  p.coverage_status,
  p.is_rank_eligible,
  p.eligibility_status,
  p.latitude,
  p.longitude,
  p.recovery_52w
from public.v_koaptix_latest_global_rank_board_published p;

create or replace view public.v_koaptix_home_kpi as
select
  p.snapshot_date,
  'KOREA_ALL'::text as universe_code,
  count(*)::integer as listed_complex_count,
  count(*)::integer as listed_units,
  coalesce(sum(coalesce(p.total_household_count,p.household_count,0)),0)::bigint
    as tracked_household_count,
  coalesce(sum(p.market_cap_krw),0)::bigint as total_market_cap,
  round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,4)
    as total_market_cap_trillion_krw,
  round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,1)
    as market_cap_trillion_krw,
  coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::bigint
    as top50_market_cap,
  round(
    coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::numeric
      /1000000000000.0,
    4
  ) as top50_market_cap_trillion_krw,
  max(p.published_at) at time zone 'UTC' as updated_at
from public.v_koaptix_latest_global_rank_board_published p
group by p.snapshot_date;

create or replace view public.v_koaptix_complex_detail_sheet as
select
  p.complex_id,
  p.apt_name_ko,
  p.rank_all,
  p.market_cap_krw,
  p.market_cap_trillion_krw,
  p.sigungu_name,
  p.legal_dong_name,
  coalesce(p.household_count,p.total_household_count) as household_count,
  p.build_year as approval_year,
  null::integer as building_count,
  null::integer as parking_count,
  p.published_at at time zone 'UTC' as updated_at
from public.v_koaptix_latest_global_rank_board_published p;

create or replace view public.v_koaptix_latest_universe_rank_board as
with member_rows as materialized (
  select
    g.*,
    m.universe_code as member_universe_code,
    m.universe_name,
    m.universe_level,
    m.umd_nm as member_umd_nm,
    m.sgg_cd as member_sgg_cd,
    m.sigungu_name as member_sigungu_name
  from public.v_koaptix_latest_global_rank_board_published g
  join public.v_koaptix_universe_membership m on m.complex_id=g.complex_id
), ranked as (
  select
    b.*,
    row_number() over (
      partition by b.member_universe_code
      order by b.market_cap_krw desc,b.complex_id asc
    )::integer as member_rank_all,
    case
      when b.previous_rank_all is null then null::integer
      else row_number() over (
        partition by b.member_universe_code
        order by b.previous_rank_all asc nulls last,b.complex_id asc
      )::integer
    end as member_previous_rank_all,
    sum(b.market_cap_krw::numeric) over (
      partition by b.member_universe_code
    ) as member_total_market_cap
  from member_rows b
)
select
  r.snapshot_date,
  r.member_universe_code as universe_code,
  r.complex_id,
  r.apt_name_ko,
  r.address_road,
  r.address_jibun,
  coalesce(r.member_umd_nm,r.legal_dong_name) as legal_dong_name,
  r.build_year,
  coalesce(r.member_sgg_cd,r.sigungu_code) as sigungu_code,
  coalesce(r.member_sigungu_name,r.sigungu_name) as sigungu_name,
  r.member_rank_all as rank_all,
  case
    when r.member_rank_all<=10 then 'T1'::text
    when r.member_rank_all<=50 then 'T2'::text
    when r.member_rank_all<=100 then 'T3'::text
    when r.member_rank_all<=500 then 'T4'::text
    else 'T5'::text
  end as tier_code,
  case
    when r.member_rank_all<=10 then 'Top 10'::text
    when r.member_rank_all<=50 then 'Top 50'::text
    when r.member_rank_all<=100 then 'Top 100'::text
    when r.member_rank_all<=500 then 'Top 500'::text
    else 'Top 1000+'::text
  end as tier_label,
  case
    when r.member_rank_all<=10 then 1
    when r.member_rank_all<=50 then 2
    when r.member_rank_all<=100 then 3
    when r.member_rank_all<=500 then 4
    else 5
  end as tier_sort,
  r.market_cap_krw,
  round(r.market_cap_krw::numeric/1000000000000.0,4)
    as market_cap_trillion_krw,
  round(r.market_cap_krw::numeric/nullif(r.member_total_market_cap,0),8)
    as market_cap_share,
  round(r.market_cap_krw::numeric/nullif(r.member_total_market_cap,0)*100,4)
    as market_cap_share_pct,
  r.member_previous_rank_all as previous_rank_all,
  case
    when r.member_previous_rank_all is null then null::integer
    else r.member_previous_rank_all-r.member_rank_all
  end as rank_delta_1d,
  case
    when r.member_previous_rank_all is null then 'NEW'::text
    when r.member_previous_rank_all>r.member_rank_all then 'UP'::text
    when r.member_previous_rank_all<r.member_rank_all then 'DOWN'::text
    else 'SAME'::text
  end as rank_movement,
  r.member_rank_all<=1000 as is_top1000,
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
  r.recovery_52w,
  r.universe_name,
  r.universe_level
from ranked r;

alter view public.v_koaptix_latest_universe_rank_board_u owner to postgres;
alter view public.v_koaptix_latest_rank_board owner to postgres;
alter view public.v_koaptix_home_kpi owner to postgres;
alter view public.v_koaptix_complex_detail_sheet owner to postgres;
alter view public.v_koaptix_latest_universe_rank_board owner to postgres;

revoke all on table public.v_koaptix_latest_universe_rank_board_u
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_latest_rank_board
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_home_kpi
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_complex_detail_sheet
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_latest_universe_rank_board
  from public,anon,authenticated,service_role;

grant select,insert,update,delete,truncate,references,trigger
  on table public.v_koaptix_latest_universe_rank_board_u
  to anon,authenticated,service_role;
grant select,insert,update,delete,truncate,references,trigger
  on table public.v_koaptix_latest_rank_board
  to anon,authenticated,service_role;
grant select,insert,update,delete,truncate,references,trigger
  on table public.v_koaptix_home_kpi
  to anon,authenticated,service_role;
grant select,insert,update,delete,truncate,references,trigger
  on table public.v_koaptix_complex_detail_sheet
  to anon,authenticated,service_role;
grant select,insert,update,delete,truncate,references,trigger
  on table public.v_koaptix_latest_universe_rank_board
  to anon,authenticated,service_role;

-- These three independent/identity-less sources remain defined for the captured
-- rollback window, but are unreachable by every application principal.
revoke all on table public.v_koaptix_home_latest_payload
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_home_public_service_payload
  from public,anon,authenticated,service_role;
revoke all on table public.v_koaptix_latest_universe_rank_board_u_v2
  from public,anon,authenticated,service_role;

do $cutover_postconditions$
declare
  v_name text;
  v_role text;
  v_privilege text;
  v_actual text[];
  v_expected text[];
  v_actual_types text[];
  v_expected_types text[];
  v_actual_acl text[];
  v_expected_reader_acl text[];
  v_expected_owner_acl text[];
  v_owner text;
  v_rule_count bigint;
  v_instead_of_trigger_count bigint;
  v_mismatch_count bigint;
  v_pre_count bigint;
  v_post_count bigint;
  v_pre_digest text;
  v_post_digest text;
begin
  select array_agg(
           format('%s:%s:%s',r.role_name,p.privilege_name,r.grantable)
           order by r.role_name,p.privilege_name
         )
    into v_expected_reader_acl
  from (values
    ('anon',false),
    ('authenticated',false),
    ('postgres',true),
    ('service_role',false)
  ) r(role_name,grantable)
  cross join unnest(array[
    'DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'
  ]::text[]) p(privilege_name);

  select array_agg(
           format('%s:%s:%s','postgres',p.privilege_name,true)
           order by p.privilege_name
         )
    into v_expected_owner_acl
  from unnest(array[
    'DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'
  ]::text[]) p(privilege_name);

  for v_name,v_expected,v_expected_types in
    select * from (values
      ('v_koaptix_latest_universe_rank_board_u',array[
        'snapshot_date','universe_code','universe_name','universe_scope','complex_id',
        'apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count',
        'total_household_count','recovery_52w','rank_all','previous_rank_all',
        'rank_delta_w','rank_movement','market_cap_krw','market_cap_trillion_krw',
        'market_cap_share','market_cap_share_pct','tier_code','tier_label','tier_sort',
        'is_top1000']::text[],array[
        'date','text','text','text','int8','text','text','text','int4','int4',
        'int4','text','int4','int4','int4','text','int8','numeric','numeric',
        'numeric','text','text','int4','bool']::text[]),
      ('v_koaptix_latest_rank_board',array[
        'snapshot_date','universe_code','complex_id','apt_name_ko','address_road',
        'address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name',
        'rank_all','tier_code','tier_label','tier_sort','market_cap_krw',
        'market_cap_trillion_krw','market_cap_share','market_cap_share_pct',
        'previous_rank_all','rank_delta_1d','rank_movement','is_top1000',
        'total_household_count','household_count','priced_household_count',
        'priced_household_ratio','total_cluster_count','priced_cluster_count',
        'coverage_status','is_rank_eligible','eligibility_status','latitude','longitude',
        'recovery_52w']::text[],array[
        'date','text','int8','text','text','text','text','int4','text','text',
        'int4','text','text','int4','int8','numeric','numeric','numeric','int4',
        'int4','text','bool','int4','int4','int4','numeric','int4','int4','text',
        'bool','text','numeric','numeric','text']::text[]),
      ('v_koaptix_home_kpi',array[
        'snapshot_date','universe_code','listed_complex_count','listed_units',
        'tracked_household_count','total_market_cap','total_market_cap_trillion_krw',
        'market_cap_trillion_krw','top50_market_cap',
        'top50_market_cap_trillion_krw','updated_at']::text[],array[
        'date','text','int4','int4','int8','int8','numeric','numeric','int8',
        'numeric','timestamp']::text[]),
      ('v_koaptix_complex_detail_sheet',array[
        'complex_id','apt_name_ko','rank_all','market_cap_krw',
        'market_cap_trillion_krw','sigungu_name','legal_dong_name','household_count',
        'approval_year','building_count','parking_count','updated_at']::text[],array[
        'int8','text','int4','int8','numeric','text','text','int4','int4','int4',
        'int4','timestamp']::text[]),
      ('v_koaptix_latest_universe_rank_board',array[
        'snapshot_date','universe_code','complex_id','apt_name_ko','address_road',
        'address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name',
        'rank_all','tier_code','tier_label','tier_sort','market_cap_krw',
        'market_cap_trillion_krw','market_cap_share','market_cap_share_pct',
        'previous_rank_all','rank_delta_1d','rank_movement','is_top1000',
        'total_household_count','household_count','priced_household_count',
        'priced_household_ratio','total_cluster_count','priced_cluster_count',
        'coverage_status','is_rank_eligible','eligibility_status','latitude','longitude',
        'recovery_52w','universe_name','universe_level']::text[],array[
        'date','text','int8','text','text','text','text','int4','text','text',
        'int4','text','text','int4','int8','numeric','numeric','numeric','int4',
        'int4','text','bool','int4','int4','int4','numeric','int4','int4','text',
        'bool','text','numeric','numeric','text','text','int4']::text[])
    ) expected(view_name,column_names,column_types)
  loop
    select array_agg(a.attname order by a.attnum),
           array_agg(t.typname order by a.attnum)
      into v_actual,v_actual_types
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_type t on t.oid=a.atttypid
    where a.attrelid=to_regclass('public.'||v_name)
      and a.attnum>0 and not a.attisdropped;
    if v_actual is distinct from v_expected then
      raise exception 'cutover signature mismatch for public.%',v_name;
    end if;
    if v_actual_types is distinct from v_expected_types then
      raise exception 'cutover type signature mismatch for public.%',v_name;
    end if;
    select r.rolname
      into v_owner
    from pg_catalog.pg_class c
    join pg_catalog.pg_roles r on r.oid=c.relowner
    where c.oid=to_regclass('public.'||v_name);
    if v_owner is distinct from 'postgres' then
      raise exception 'cutover owner mismatch for public.%',v_name;
    end if;
    select array_agg(
             format('%s:%s:%s',coalesce(r.rolname,'PUBLIC'),upper(e.privilege_type),e.is_grantable)
             order by coalesce(r.rolname,'PUBLIC'),upper(e.privilege_type)
           )
      into v_actual_acl
    from pg_catalog.pg_class c
    cross join lateral pg_catalog.aclexplode(
      coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
    ) e
    left join pg_catalog.pg_roles r on r.oid=e.grantee
    where c.oid=to_regclass('public.'||v_name);
    if v_actual_acl is distinct from v_expected_reader_acl then
      raise exception 'cutover exact ACL mismatch for public.%',v_name;
    end if;
    select count(*)
      into v_rule_count
    from pg_catalog.pg_rewrite rw
    where rw.ev_class=to_regclass('public.'||v_name)
      and rw.rulename<>'_RETURN';
    if v_rule_count<>0 then
      raise exception 'cutover view public.% has a write rule',v_name;
    end if;
    select count(*)
      into v_instead_of_trigger_count
    from pg_catalog.pg_trigger t
    where t.tgrelid=to_regclass('public.'||v_name)
      and not t.tgisinternal
      and (t.tgtype & 64)<>0;
    if v_instead_of_trigger_count<>0 then
      raise exception 'cutover view public.% has an INSTEAD OF trigger',v_name;
    end if;
    if (select v.is_updatable from information_schema.views v
        where v.table_schema='public' and v.table_name=v_name) is distinct from 'NO' then
      raise exception 'cutover view public.% unexpectedly became updatable',v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'v_koaptix_home_latest_payload',
    'v_koaptix_home_public_service_payload',
    'v_koaptix_latest_universe_rank_board_u_v2'
  ] loop
    select r.rolname
      into v_owner
    from pg_catalog.pg_class c
    join pg_catalog.pg_roles r on r.oid=c.relowner
    where c.oid=to_regclass('public.'||v_name);
    if v_owner is distinct from 'postgres' then
      raise exception 'isolated source owner mismatch for public.%',v_name;
    end if;
    select array_agg(
             format('%s:%s:%s',coalesce(r.rolname,'PUBLIC'),upper(e.privilege_type),e.is_grantable)
             order by coalesce(r.rolname,'PUBLIC'),upper(e.privilege_type)
           )
      into v_actual_acl
    from pg_catalog.pg_class c
    cross join lateral pg_catalog.aclexplode(
      coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
    ) e
    left join pg_catalog.pg_roles r on r.oid=e.grantee
    where c.oid=to_regclass('public.'||v_name);
    if v_actual_acl is distinct from v_expected_owner_acl then
      raise exception 'isolated source exact owner-only ACL mismatch for public.%',v_name;
    end if;
    foreach v_role in array array[
      'anon','authenticated','service_role',
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    ] loop
      foreach v_privilege in array array[
        'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] loop
        if has_table_privilege(
             v_role,format('%I.%I','public',v_name),v_privilege
           ) then
          raise exception 'isolated source public.% privilege % remains reachable by %',
            v_name,v_privilege,v_role;
        end if;
      end loop;
    end loop;
  end loop;

  select count(*) into v_mismatch_count
  from (
    (select * from public.v_koaptix_latest_universe_rank_board_u
     except
     select p.snapshot_date,p.universe_code,p.universe_name,p.universe_scope,
       p.complex_id,p.apt_name_ko,p.sigungu_name,p.legal_dong_name,p.build_year,
       p.household_count,p.total_household_count,p.recovery_52w,p.rank_all,
       p.previous_rank_all,p.rank_delta_w,p.rank_movement,p.market_cap_krw,
       p.market_cap_trillion_krw,p.market_cap_share,p.market_cap_share_pct,
       p.tier_code,p.tier_label,p.tier_sort,p.is_top1000
     from public.v_koaptix_latest_board_read_model_published p)
    union all
    (select p.snapshot_date,p.universe_code,p.universe_name,p.universe_scope,
       p.complex_id,p.apt_name_ko,p.sigungu_name,p.legal_dong_name,p.build_year,
       p.household_count,p.total_household_count,p.recovery_52w,p.rank_all,
       p.previous_rank_all,p.rank_delta_w,p.rank_movement,p.market_cap_krw,
       p.market_cap_trillion_krw,p.market_cap_share,p.market_cap_share_pct,
       p.tier_code,p.tier_label,p.tier_sort,p.is_top1000
     from public.v_koaptix_latest_board_read_model_published p
     except
     select * from public.v_koaptix_latest_universe_rank_board_u)
  ) mismatch;
  if v_mismatch_count<>0 then
    raise exception 'UNIVERSE_SERVICE compatibility view has nonzero row mismatch';
  end if;

  select count(*) into v_mismatch_count
  from (
    (select * from public.v_koaptix_latest_rank_board
     except
     select p.snapshot_date,p.universe_code,p.complex_id,p.apt_name_ko,
       p.address_road,p.address_jibun,p.legal_dong_name,p.build_year,
       p.sigungu_code,p.sigungu_name,p.rank_all,p.tier_code,p.tier_label,
       p.tier_sort,p.market_cap_krw,p.market_cap_trillion_krw,p.market_cap_share,
       p.market_cap_share_pct,p.previous_rank_all,p.rank_delta_1d,
       p.rank_movement,p.is_top1000,p.total_household_count,p.household_count,
       p.priced_household_count,p.priced_household_ratio,p.total_cluster_count,
       p.priced_cluster_count,p.coverage_status,p.is_rank_eligible,
       p.eligibility_status,p.latitude,p.longitude,p.recovery_52w
     from public.v_koaptix_latest_global_rank_board_published p)
    union all
    (select p.snapshot_date,p.universe_code,p.complex_id,p.apt_name_ko,
       p.address_road,p.address_jibun,p.legal_dong_name,p.build_year,
       p.sigungu_code,p.sigungu_name,p.rank_all,p.tier_code,p.tier_label,
       p.tier_sort,p.market_cap_krw,p.market_cap_trillion_krw,p.market_cap_share,
       p.market_cap_share_pct,p.previous_rank_all,p.rank_delta_1d,
       p.rank_movement,p.is_top1000,p.total_household_count,p.household_count,
       p.priced_household_count,p.priced_household_ratio,p.total_cluster_count,
       p.priced_cluster_count,p.coverage_status,p.is_rank_eligible,
       p.eligibility_status,p.latitude,p.longitude,p.recovery_52w
     from public.v_koaptix_latest_global_rank_board_published p
     except
     select * from public.v_koaptix_latest_rank_board)
  ) mismatch;
  if v_mismatch_count<>0 then
    raise exception 'GLOBAL_LATEST rank compatibility view has nonzero row mismatch';
  end if;

  select count(*) into v_mismatch_count
  from (
    (select * from public.v_koaptix_home_kpi
     except
     select p.snapshot_date,'KOREA_ALL'::text,count(*)::integer,count(*)::integer,
       coalesce(sum(coalesce(p.total_household_count,p.household_count,0)),0)::bigint,
       coalesce(sum(p.market_cap_krw),0)::bigint,
       round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,4),
       round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,1),
       coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::bigint,
       round(coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::numeric
         /1000000000000.0,4),
       max(p.published_at) at time zone 'UTC'
     from public.v_koaptix_latest_global_rank_board_published p
     group by p.snapshot_date)
    union all
    (select p.snapshot_date,'KOREA_ALL'::text,count(*)::integer,count(*)::integer,
       coalesce(sum(coalesce(p.total_household_count,p.household_count,0)),0)::bigint,
       coalesce(sum(p.market_cap_krw),0)::bigint,
       round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,4),
       round(coalesce(sum(p.market_cap_krw),0)::numeric/1000000000000.0,1),
       coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::bigint,
       round(coalesce(sum(p.market_cap_krw) filter (where p.rank_all<=50),0)::numeric
         /1000000000000.0,4),
       max(p.published_at) at time zone 'UTC'
     from public.v_koaptix_latest_global_rank_board_published p
     group by p.snapshot_date
     except select * from public.v_koaptix_home_kpi)
  ) mismatch;
  if v_mismatch_count<>0 then
    raise exception 'Home KPI has nonzero GLOBAL_LATEST equivalence mismatch';
  end if;

  select count(*) into v_mismatch_count
  from (
    (select * from public.v_koaptix_complex_detail_sheet
     except
     select p.complex_id,p.apt_name_ko,p.rank_all,p.market_cap_krw,
       p.market_cap_trillion_krw,p.sigungu_name,p.legal_dong_name,
       coalesce(p.household_count,p.total_household_count),p.build_year,
       null::integer,null::integer,p.published_at at time zone 'UTC'
     from public.v_koaptix_latest_global_rank_board_published p)
    union all
    (select p.complex_id,p.apt_name_ko,p.rank_all,p.market_cap_krw,
       p.market_cap_trillion_krw,p.sigungu_name,p.legal_dong_name,
       coalesce(p.household_count,p.total_household_count),p.build_year,
       null::integer,null::integer,p.published_at at time zone 'UTC'
     from public.v_koaptix_latest_global_rank_board_published p
     except select * from public.v_koaptix_complex_detail_sheet)
  ) mismatch;
  if v_mismatch_count<>0 then
    raise exception 'complex detail has nonzero GLOBAL_LATEST equivalence mismatch';
  end if;

  -- Independently recompute the dynamic membership board from the active
  -- GLOBAL_LATEST rows plus canonical membership. Never compare this surface to
  -- the independently dated UNIVERSE_SERVICE component: bootstrap divergence and
  -- unaffected future service dates are deliberate parts of the typed contract.
  select count(*) into v_mismatch_count
  from (
    with expected_ranked as materialized (
      select
        g.snapshot_date,
        m.universe_code,
        g.complex_id,
        g.market_cap_krw,
        row_number() over (
          partition by m.universe_code
          order by g.market_cap_krw desc,g.complex_id asc
        )::integer as rank_all,
        sum(g.market_cap_krw::numeric) over (
          partition by m.universe_code
        ) as total_market_cap
      from public.v_koaptix_latest_global_rank_board_published g
      join public.v_koaptix_universe_membership m
        on m.complex_id=g.complex_id
    ), expected_projection as materialized (
      select
        snapshot_date,
        universe_code,
        complex_id,
        rank_all,
        market_cap_krw,
        round(market_cap_krw::numeric/1000000000000.0,4)
          as market_cap_trillion_krw,
        round(market_cap_krw::numeric/nullif(total_market_cap,0),8)
          as market_cap_share,
        round(market_cap_krw::numeric/nullif(total_market_cap,0)*100,4)
          as market_cap_share_pct,
        rank_all<=1000 as is_top1000
      from expected_ranked
    )
    (select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
       market_cap_trillion_krw,market_cap_share,market_cap_share_pct,is_top1000
     from public.v_koaptix_latest_universe_rank_board
     except
     select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
       market_cap_trillion_krw,market_cap_share,market_cap_share_pct,is_top1000
     from expected_projection)
    union all
    (select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
       market_cap_trillion_krw,market_cap_share,market_cap_share_pct,is_top1000
     from expected_projection
     except
     select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
       market_cap_trillion_krw,market_cap_share,market_cap_share_pct,is_top1000
     from public.v_koaptix_latest_universe_rank_board)
  ) mismatch;
  if v_mismatch_count<>0 then
    raise exception 'GLOBAL_LATEST canonical-membership rank/value/share equivalence failed';
  end if;

  if exists (
    select 1
    from public.v_koaptix_universe_membership m
    where m.universe_code='JEONBUK_ALL'
      and not exists (
        select 1
        from public.v_koaptix_rank_membership_authority_u a
        where a.complex_id=m.complex_id
          and a.resolution_status='RESOLVED'
          and left(a.resolved_sgg_cd,2) in ('45','52')
      )
  ) or exists (
    select 1
    from public.v_koaptix_rank_membership_authority_u a
    where a.resolution_status='RESOLVED'
      and left(a.resolved_sgg_cd,2) in ('45','52')
      and not exists (
        select 1 from public.v_koaptix_universe_membership m
        where m.complex_id=a.complex_id and m.universe_code='JEONBUK_ALL'
      )
  ) or exists (
    select 1
    from public.v_koaptix_universe_membership m
    group by m.complex_id,m.universe_code
    having count(*)<>1
  ) then
    raise exception 'JEONBUK 45/52 or membership deduplication guard failed';
  end if;

  v_pre_count:=current_setting('koaptix.cutover.pre_latest_rank_count')::bigint;
  v_pre_digest:=current_setting('koaptix.cutover.pre_latest_rank_digest');
  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.snapshot_date,x.rank_all,x.complex_id
           ),''),'UTF8')),'hex'))
    into v_post_count,v_post_digest
  from public.v_koaptix_latest_rank_board x;
  if v_post_count is distinct from v_pre_count
     or v_post_digest is distinct from v_pre_digest then
    raise exception 'latest rank stable-row pre/post equivalence failed';
  end if;

  v_pre_count:=current_setting('koaptix.cutover.pre_non_jeonbuk_count')::bigint;
  v_pre_digest:=current_setting('koaptix.cutover.pre_non_jeonbuk_digest');
  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.universe_code,x.rank_all,x.complex_id
           ),''),'UTF8')),'hex'))
    into v_post_count,v_post_digest
  from public.v_koaptix_latest_universe_rank_board x
  where x.universe_code<>'JEONBUK_ALL';
  if v_post_count is distinct from v_pre_count
     or v_post_digest is distinct from v_pre_digest then
    raise exception 'non-JEONBUK full-row pre/post equivalence failed';
  end if;

  v_pre_count:=current_setting('koaptix.cutover.pre_home_kpi_count')::bigint;
  v_pre_digest:=current_setting('koaptix.cutover.pre_home_kpi_digest');
  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.snapshot_date,x.universe_code
           ),''),'UTF8')),'hex'))
    into v_post_count,v_post_digest
  from (
    select snapshot_date,universe_code,listed_complex_count,listed_units,
      tracked_household_count,total_market_cap,total_market_cap_trillion_krw,
      market_cap_trillion_krw,top50_market_cap,top50_market_cap_trillion_krw
    from public.v_koaptix_home_kpi
  ) x;
  if v_post_count is distinct from v_pre_count
     or v_post_digest is distinct from v_pre_digest then
    raise exception 'Home KPI stable-field pre/post equivalence failed';
  end if;

  v_pre_count:=current_setting('koaptix.cutover.pre_detail_count')::bigint;
  v_pre_digest:=current_setting('koaptix.cutover.pre_detail_digest');
  select count(*),upper(encode(sha256(convert_to(
           coalesce(string_agg(
             public.koaptix_compact_jsonb_object(to_jsonb(x))||E'\n',''
             order by x.complex_id
           ),''),'UTF8')),'hex'))
    into v_post_count,v_post_digest
  from (
    select complex_id,apt_name_ko,rank_all,market_cap_krw,
      market_cap_trillion_krw,sigungu_name,legal_dong_name,household_count,
      approval_year,building_count,parking_count
    from public.v_koaptix_complex_detail_sheet
  ) x;
  if v_post_count is distinct from v_pre_count
     or v_post_digest is distinct from v_pre_digest then
    raise exception 'complex-detail stable-field pre/post equivalence failed';
  end if;

  if exists (
       select 1
       from public.koaptix_latest_board_publication p
       join public.koaptix_latest_board_generation g
         on g.generation_id=p.active_generation_id
       where p.singleton_id
         and g.source_authority_kind='BOOTSTRAP_COMPATIBILITY_BUNDLE'
     )
     and not exists (
       select 1
       from public.v_koaptix_home_kpi k
       where k.snapshot_date=date '2026-07-31'
         and k.universe_code='KOREA_ALL'
         and k.listed_complex_count=13497
         and k.listed_units=13497
         and k.tracked_household_count=7598332
         and k.total_market_cap=4669864089045496
         and k.top50_market_cap=508267349666575
     ) then
    raise exception 'bootstrap KPI exact fresh control failed';
  end if;

  foreach v_role in array array['anon','authenticated','service_role'] loop
    if not has_table_privilege(v_role,'public.v_koaptix_latest_universe_rank_board_u','SELECT')
       or not has_table_privilege(v_role,'public.v_koaptix_latest_rank_board','SELECT')
       or not has_table_privilege(v_role,'public.v_koaptix_home_kpi','SELECT')
       or not has_table_privilege(v_role,'public.v_koaptix_complex_detail_sheet','SELECT')
       or not has_table_privilege(v_role,'public.v_koaptix_latest_universe_rank_board','SELECT') then
      raise exception 'required compatibility SELECT is absent for %',v_role;
    end if;
  end loop;
end;
$cutover_postconditions$;

commit;
