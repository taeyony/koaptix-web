-- PROSPECTIVE EXPLICIT RECONSTRUCTION. LOCAL CANDIDATE ONLY.
-- One read-only statement; no application UDF and no current-D official output input.
-- PostgreSQL prepared parameters: $1 target date, $2 fixed generated_at timestamptz,
-- $3 fixed execution_run_id text, $4 fixed stage created_at timestamptz.
-- Only the PUBLISHED_NEW_STATE branch consumes this projection. Verified no-change
-- and no-input days produce a separate reference and no fabricated target-D rows.
WITH input AS MATERIALIZED (
  SELECT $1::date AS d, $2::timestamptz AS generated_at,
         $3::text AS execution_run_id, $4::timestamptz AS created_at
), authority AS MATERIALIZED (
  with m as (
    select * from public.apt_market_cap_snapshot where snapshot_date=(SELECT d FROM input)
  ), e as (
    select * from public.complex_eligibility_snapshot where snapshot_date=(SELECT d FROM input)
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
    'snapshot_date',(SELECT d FROM input),
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
  from digests
), market_d AS MATERIALIZED (
  SELECT m.* FROM public.apt_market_cap_snapshot m
  CROSS JOIN input i WHERE m.snapshot_date=i.d
), eligibility_d AS MATERIALIZED (
  SELECT e.* FROM public.complex_eligibility_snapshot e
  CROSS JOIN input i WHERE e.snapshot_date=i.d
), qualified AS MATERIALIZED (
  SELECT m.*,e.is_rank_eligible,e.eligibility_status
  FROM market_d m JOIN eligibility_d e USING(snapshot_date,complex_id)
  JOIN public.apt_complex c USING(complex_id)
  WHERE m.market_cap_krw>0 AND m.coverage_status='full'
    AND e.is_rank_eligible IS TRUE AND e.eligibility_status='eligible'
    AND c.is_active IS TRUE AND c.master_status='active'
    AND c.merged_into_complex_id IS NULL
), members AS MATERIALIZED (
  SELECT q.complex_id,u.universe_code,u.universe_name,u.universe_scope
  FROM qualified q JOIN public.v_koaptix_universe_membership_u u USING(complex_id)
), canonical_metadata AS MATERIALIZED (
  SELECT q.complex_id,c.apt_name_ko,c.address_road,c.address_jibun,
         coalesce(rm.umd_nm,c.legal_dong_name) AS legal_dong_name,
         c.build_year,coalesce(rm.sgg_cd,left(rm.lawd_cd,5)) AS sigungu_code,
         rm.sigungu_name AS global_sigungu_name,
         coalesce(nullif(rm.sigungu_name,''),rd.region_name_ko,'') AS service_sigungu_name,
         coalesce(c.household_count,c.total_household_count) AS household_count,
         c.latitude,c.longitude
  FROM qualified q JOIN public.apt_complex c USING(complex_id)
  LEFT JOIN public.koaptix_complex_region_map rm USING(complex_id)
  LEFT JOIN public.region_dim rd ON rd.region_id=c.region_id AND rd.region_type='sigungu'
), global_previous_date AS MATERIALIZED (
  SELECT max(h.snapshot_date) AS previous_date
  FROM public.complex_rank_history h CROSS JOIN input i WHERE h.snapshot_date<i.d
), global_previous AS MATERIALIZED (
  SELECT h.complex_id,h.rank_all
  FROM public.complex_rank_history h
  JOIN global_previous_date p ON h.snapshot_date=p.previous_date
), global_ranked AS MATERIALIZED (
  SELECT q.*,row_number() OVER(ORDER BY q.market_cap_krw DESC,q.complex_id ASC)::integer AS rank_all,
         sum(q.market_cap_krw::numeric) OVER() AS universe_total_market_cap_krw
  FROM qualified q
), common_global AS MATERIALIZED (
  SELECT r.*,p.previous_date,pr.rank_all AS previous_rank_all,
         pr.rank_all-r.rank_all AS rank_delta,
         CASE WHEN pr.rank_all IS NULL THEN 'NEW'
              WHEN pr.rank_all>r.rank_all THEN 'UP'
              WHEN pr.rank_all<r.rank_all THEN 'DOWN' ELSE 'SAME' END AS rank_movement,
         round(r.market_cap_krw::numeric/1000000000000.0,4) AS market_cap_trillion_krw,
         round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0),8) AS market_cap_share,
         round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0)*100::numeric,4) AS market_cap_share_pct
  FROM global_ranked r CROSS JOIN global_previous_date p
  LEFT JOIN global_previous pr USING(complex_id)
), universe_previous_dates AS MATERIALIZED (
  SELECT u.universe_code,
         CASE WHEN u.universe_code='KOREA_ALL' THEN (SELECT previous_date FROM global_previous_date)
              ELSE (SELECT max(s.snapshot_date) FROM public.koaptix_rank_snapshot s
                    CROSS JOIN input i WHERE s.universe_code=u.universe_code AND s.snapshot_date<i.d)
         END AS previous_date
  FROM (SELECT DISTINCT universe_code FROM members) u
), service_ranked AS MATERIALIZED (
  SELECT q.*,m.universe_code,m.universe_name,m.universe_scope,
         row_number() OVER(PARTITION BY m.universe_code
                           ORDER BY q.market_cap_krw DESC,q.complex_id ASC)::integer AS rank_all,
         sum(q.market_cap_krw::numeric) OVER(PARTITION BY m.universe_code) AS universe_total_market_cap_krw
  FROM qualified q JOIN members m USING(complex_id)
), service_previous AS MATERIALIZED (
  SELECT p.universe_code,p.previous_date,s.complex_id,s.rank_all
  FROM universe_previous_dates p
  JOIN public.koaptix_rank_snapshot s
    ON s.universe_code=p.universe_code AND s.snapshot_date=p.previous_date
  WHERE p.universe_code<>'KOREA_ALL'
), service_values AS MATERIALIZED (
  SELECT r.*,p.previous_date,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.previous_rank_all ELSE pr.rank_all END AS previous_rank_all,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.rank_delta ELSE pr.rank_all-r.rank_all END AS rank_delta_w,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.rank_movement
              WHEN pr.rank_all IS NULL THEN 'NEW' WHEN pr.rank_all>r.rank_all THEN 'UP'
              WHEN pr.rank_all<r.rank_all THEN 'DOWN' ELSE 'SAME' END AS rank_movement,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_trillion_krw
              ELSE round(r.market_cap_krw::numeric/1000000000000.0,4) END AS market_cap_trillion_krw,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_share
              ELSE round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0),8) END AS market_cap_share,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_share_pct
              ELSE round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0)*100::numeric,4) END AS market_cap_share_pct
  FROM service_ranked r JOIN universe_previous_dates p USING(universe_code)
  JOIN common_global g USING(complex_id)
  LEFT JOIN service_previous pr ON pr.universe_code=r.universe_code AND pr.complex_id=r.complex_id
), global_rows AS MATERIALIZED (
  SELECT g.snapshot_date,'KOREA_ALL'::text AS universe_code,g.complex_id,
         m.apt_name_ko,m.address_road,m.address_jibun,m.legal_dong_name,m.build_year,
         m.sigungu_code,m.global_sigungu_name AS sigungu_name,g.rank_all,
         NULL::text AS tier_code,NULL::text AS tier_label,NULL::integer AS tier_sort,
         g.market_cap_krw,g.market_cap_trillion_krw,g.market_cap_share,g.market_cap_share_pct,
         g.previous_rank_all,g.rank_delta AS rank_delta_1d,g.rank_movement,
         g.rank_all<=1000 AS is_top1000,g.total_household_count,m.household_count,
         g.priced_household_count,g.priced_household_ratio,g.total_cluster_count,g.priced_cluster_count,
         g.coverage_status,g.is_rank_eligible,g.eligibility_status,m.latitude,m.longitude,
         NULL::text AS recovery_52w
  FROM common_global g JOIN canonical_metadata m USING(complex_id)
), service_rows AS MATERIALIZED (
  SELECT s.snapshot_date,s.universe_code,s.universe_name,s.universe_scope,s.complex_id,
         m.apt_name_ko,m.service_sigungu_name AS sigungu_name,m.legal_dong_name,m.build_year,
         m.household_count,s.total_household_count,NULL::text AS recovery_52w,
         s.rank_all,s.previous_rank_all,s.rank_delta_w,s.rank_movement,s.market_cap_krw,
         s.market_cap_trillion_krw,s.market_cap_share,s.market_cap_share_pct,
         NULL::text AS tier_code,NULL::text AS tier_label,NULL::integer AS tier_sort,
         s.rank_all<=1000 AS is_top1000,s.previous_date AS source_previous_snapshot_date,
         to_char(i.generated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS generated_at,i.execution_run_id AS refresh_run_id
  FROM service_values s JOIN canonical_metadata m USING(complex_id) CROSS JOIN input i
), history_stage_rows AS MATERIALIZED (
  SELECT snapshot_date,complex_id,market_cap_krw,rank_all,market_cap_krw AS total_market_cap
  FROM common_global
), snapshot_stage_rows AS MATERIALIZED (
  SELECT s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
         s.market_cap_share::numeric(12,8) AS market_cap_share,s.previous_rank_all,
         s.rank_delta_w AS rank_delta_1d,s.is_top1000,
         'market_cap_desc'::text AS rank_method,'v1'::text AS calculation_version,
         to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
  FROM service_rows s CROSS JOIN input i
), checks AS MATERIALIZED (
  SELECT
    (SELECT d IS NOT NULL AND generated_at IS NOT NULL AND created_at IS NOT NULL
       AND execution_run_id IS NOT NULL AND btrim(execution_run_id)<>'' FROM input)
    AND (SELECT count(*)>0 FROM qualified)
    AND NOT EXISTS(SELECT complex_id FROM market_d GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS(SELECT complex_id FROM eligibility_d GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS((SELECT complex_id FROM market_d EXCEPT SELECT complex_id FROM eligibility_d)
                   UNION ALL
                   (SELECT complex_id FROM eligibility_d EXCEPT SELECT complex_id FROM market_d))
    AND NOT EXISTS(SELECT complex_id FROM canonical_metadata GROUP BY complex_id HAVING count(*)<>1)
    AND (SELECT count(*) FROM canonical_metadata)=(SELECT count(*) FROM qualified)
    AND NOT EXISTS(SELECT complex_id,universe_code FROM members
                   GROUP BY complex_id,universe_code HAVING count(*)<>1)
    AND (SELECT count(*) FROM members WHERE universe_code='KOREA_ALL')=(SELECT count(*) FROM qualified)
    AND NOT EXISTS(SELECT complex_id FROM global_previous GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS(SELECT universe_code,complex_id FROM service_previous
                   GROUP BY universe_code,complex_id HAVING count(*)<>1)
    AND NOT EXISTS(
      SELECT 1 FROM qualified q LEFT JOIN public.v_koaptix_rank_membership_authority_u a USING(complex_id)
      WHERE a.resolution_status IS DISTINCT FROM 'RESOLVED')
    AND NOT EXISTS(
      SELECT 1 FROM qualified
      WHERE total_household_count IS NULL OR priced_household_count IS NULL
         OR priced_household_ratio IS NULL OR total_cluster_count IS NULL OR priced_cluster_count IS NULL
         OR total_household_count<0 OR priced_household_count<0 OR priced_household_count>total_household_count
         OR total_cluster_count<0 OR priced_cluster_count<0 OR priced_cluster_count>total_cluster_count
         OR priced_household_ratio<0 OR priced_household_ratio>1
         OR priced_household_ratio::text IN ('NaN','Infinity','-Infinity'))
    AND NOT EXISTS(
      SELECT 1 FROM market_d WHERE calculation_version IS NULL OR btrim(calculation_version)=''
        OR coverage_status IS NULL OR btrim(coverage_status)='')
    AND NOT EXISTS(
      SELECT 1 FROM eligibility_d WHERE rule_version IS NULL OR btrim(rule_version)=''
        OR eligibility_status IS NULL OR btrim(eligibility_status)=''
        OR is_rank_eligible IS NULL OR manual_override IS NULL)
    AS valid
), fail_closed AS MATERIALIZED (
  SELECT 1 / CASE WHEN valid IS TRUE THEN 1 ELSE 0 END AS assertion FROM checks
)
SELECT jsonb_build_object(
  'target_rank_date',i.d,
  'global_previous_snapshot_date',(SELECT previous_date FROM global_previous_date),
  'input_authority',(SELECT * FROM authority),
  'global_rows',(SELECT jsonb_agg(to_jsonb(g) ORDER BY g.snapshot_date,g.rank_all,g.complex_id) FROM global_rows g),
  'service_rows',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.snapshot_date,s.universe_code COLLATE "C",s.rank_all,s.complex_id) FROM service_rows s),
  'history_stage_rows',(SELECT jsonb_agg(to_jsonb(h) ORDER BY h.snapshot_date,h.rank_all,h.complex_id) FROM history_stage_rows h),
  'snapshot_stage_rows',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.snapshot_date,t.universe_code COLLATE "C",t.rank_all,t.complex_id) FROM snapshot_stage_rows t)
) AS projection
FROM input i CROSS JOIN fail_closed f
WHERE f.assertion=1;
