-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 904: membership-bound canonical compute/seal/revoke and publisher binding after 901/902/903.
-- No function in this file is invoked by migration execution.

begin;

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

alter function public.koaptix_compute_rank_input_authority(date)
  owner to koaptix_rank_publication_owner;
revoke all on function public.koaptix_compute_rank_input_authority(date)
  from public,anon,authenticated,service_role,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_compute_rank_input_authority(date)
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner,
     koaptix_rank_authority_reader;

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

alter function public.koaptix_seal_rank_input_manifest(jsonb)
  owner to koaptix_rank_authority_owner;
revoke all on function public.koaptix_seal_rank_input_manifest(jsonb)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_seal_rank_input_manifest(jsonb)
  to koaptix_rank_manifest_sealer;

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

alter function public.koaptix_revoke_rank_input_manifest(jsonb)
  owner to koaptix_rank_authority_owner;
revoke all on function public.koaptix_revoke_rank_input_manifest(jsonb)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_sealer,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_revoke_rank_input_manifest(jsonb)
  to koaptix_rank_manifest_revoker;

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

alter function public.append_daily_rank_history(date)
  owner to koaptix_rank_publication_owner;
revoke all on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role,koaptix_rank_authority_reader,
       koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
       koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
       koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

-- This compatibility function becomes an owner-internal implementation detail.
-- The compatibility helper receives no action-role EXECUTE. The integrated
-- Transaction-A entrypoint alone is granted to koaptix_rank_generation_builder.

-- Legacy-helper revocations are intentionally not implicit in this migration.
-- They are defined in 202607310900_rank_recovery_roles_and_acl.sql and require
-- their own reviewed ROLE_GRANT_DEFINITION deployment approval first.

do $final_assertions$
declare
  v_role text;
  v_table text;
  v_privilege text;
  v_signature text;
  v_expected_signature text;
  v_column record;
begin
  if not exists (
       select 1 from information_schema.columns
       where table_schema='pg_catalog' and table_name='pg_auth_members'
         and column_name='inherit_option'
     ) or not exists (
       select 1 from information_schema.columns
       where table_schema='pg_catalog' and table_name='pg_auth_members'
         and column_name='set_option'
     ) then
    raise exception 'per-membership INHERIT/SET options are required';
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
    ) or member_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'definition deployment requires zero inbound and outbound recovery-role membership';
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

  if exists (
    with recursive funcs as (
      select p.oid,p.proname,p.prosecdef,
             lower(pg_get_functiondef(p.oid)) as body
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname not in ('pg_catalog','information_schema')
        and n.nspname not like 'pg_toast%' and p.prokind in ('f','p')
    ), direct_or_dynamic_rank_writers as (
      select f.oid from funcs f
      where (
        f.body ~ '(insert[[:space:]]+into|merge[[:space:]]+into|update|delete[[:space:]]+from|truncate|execute)'
        and f.body ~ '(complex_rank_history|koaptix_rank_snapshot|koaptix_latest_board_read_model|koaptix_rank_input_authority_manifest|koaptix_rank_input_manifest_revocation|koaptix_rank_publication|koaptix_latest_board_generation)'
      ) or (
        f.prosecdef and f.body ~ '\mexecute\M'
        and f.body ~ '(rank|snapshot|latest_board|market_pipeline)'
      )
    ), writer_closure(oid) as (
      select oid from direct_or_dynamic_rank_writers
      union
      select caller.oid from funcs caller
      join funcs callee on caller.body ~ (
        '(^|[^a-z0-9_])'||lower(callee.proname)||'[[:space:]]*\('
      )
      join writer_closure prior on prior.oid=callee.oid
    )
    select 1 from writer_closure w
    where has_function_privilege('anon',w.oid,'EXECUTE')
       or has_function_privilege('authenticated',w.oid,'EXECUTE')
       or has_function_privilege('service_role',w.oid,'EXECUTE')
       or (has_function_privilege('koaptix_rank_authority_reader',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_compute_rank_input_authority(date)'))
       or (has_function_privilege('koaptix_rank_manifest_sealer',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_seal_rank_input_manifest(jsonb)'))
       or (has_function_privilege('koaptix_rank_manifest_revoker',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_revoke_rank_input_manifest(jsonb)'))
       or (has_function_privilege('koaptix_rank_bootstrap_seeder',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_seed_latest_board_compatibility_generation(jsonb)'))
       or (has_function_privilege('koaptix_rank_generation_builder',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_build_rank_publication_generation(jsonb)'))
       or (has_function_privilege('koaptix_rank_generation_publisher',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_publish_latest_board_generation(jsonb)'))
       or (has_function_privilege('koaptix_rank_publication_rollback',w.oid,'EXECUTE')
           and w.oid<>to_regprocedure('public.koaptix_rollback_latest_board_publication(jsonb)'))
  ) then
    raise exception 'final unenumerated executable rank writer remains';
  end if;
end;
$final_assertions$;

commit;
