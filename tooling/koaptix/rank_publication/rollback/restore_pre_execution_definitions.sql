-- LOCAL CAPTURED FULL PRE-DATA DEFINITION ROLLBACK. NOT EXECUTED.
-- Valid only before any manifest seal/revocation, bootstrap seed, generation,
-- candidate stage, publication event or singleton pointer row exists. It requires
-- a separate exact DB-definition/ACL rollback approval. After any such execution,
 -- do not run this bundle: recover only with the captured five-view/three-ACL state or
-- an append-only pointer ROLLBACK event, and never restore broad legacy writers.

begin;

set local search_path = pg_catalog, public, pg_temp;

-- Close the zero-row precondition against concurrent authority/publication
-- writers before inspecting any rollback eligibility state.
lock table
  public.koaptix_rank_input_authority_manifest,
  public.koaptix_rank_input_manifest_revocation,
  public.koaptix_latest_board_generation,
  public.koaptix_latest_board_generation_surface,
  public.koaptix_latest_board_generation_universe,
  public.koaptix_latest_board_generation_row,
  public.koaptix_latest_board_generation_global_row,
  public.koaptix_rank_publication_history_stage,
  public.koaptix_rank_publication_snapshot_stage,
  public.koaptix_latest_board_publication_event,
  public.koaptix_latest_board_publication
in access exclusive mode;

do $preconditions$
begin
  if current_setting('koaptix.rollback.authorization_proof_exact',true)
       is distinct from 'SEPARATE_FULL_PRE_DATA_DEFINITION_ROLLBACK_APPROVAL' then
    raise exception 'exact full pre-data definition rollback approval is absent';
  end if;
  if current_user like 'koaptix_rank_%' then
    raise exception 'full definition rollback must run as the separately authorized admin principal';
  end if;
  if exists (select 1 from public.koaptix_rank_input_authority_manifest)
     or exists (select 1 from public.koaptix_rank_input_manifest_revocation)
     or exists (select 1 from public.koaptix_latest_board_generation)
     or exists (select 1 from public.koaptix_latest_board_generation_surface)
     or exists (select 1 from public.koaptix_latest_board_generation_universe)
     or exists (select 1 from public.koaptix_latest_board_generation_row)
     or exists (select 1 from public.koaptix_latest_board_generation_global_row)
     or exists (select 1 from public.koaptix_rank_publication_history_stage)
     or exists (select 1 from public.koaptix_rank_publication_snapshot_stage)
     or exists (select 1 from public.koaptix_latest_board_publication_event)
     or exists (select 1 from public.koaptix_latest_board_publication) then
    raise exception 'full definition rollback is prohibited after any authority or publication data exists';
  end if;
  if exists (
    select 1 from pg_catalog.pg_auth_members am
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
    raise exception 'revoke every exact activation membership before definition rollback';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_stat_activity a
    where a.pid<>pg_backend_pid()
      and a.datname=current_database()
      and a.backend_type='client backend'
  ) then
    raise exception 'full definition rollback requires zero other client backends in the current database';
  end if;
end;
$preconditions$;

-- Remove all five pointer-bound latest dependencies in dependent-first order.
create or replace view public.v_koaptix_complex_detail_sheet as
 WITH latest AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
        ), master AS (
         WITH area AS (
                 SELECT NULL::bigint AS complex_id,
                    NULL::integer AS household_count,
                    NULL::integer AS total_household_count
                  WHERE false
                )
         SELECT c.complex_id,
            c.apt_name_ko,
            NULL::text AS sigungu_name,
            c.legal_dong_name,
            NULL::text AS lawd_cd,
            NULL::text AS sgg_cd,
            NULL::text AS umd_cd,
            COALESCE(area.household_count, area.total_household_count, c.household_count, c.total_household_count) AS household_count,
            COALESCE(area.total_household_count, area.household_count, c.total_household_count, c.household_count) AS total_household_count,
            COALESCE(c.build_year, NULL::integer) AS build_year,
            COALESCE(NULL::integer, c.build_year) AS approval_year,
            NULL::integer AS building_count,
            NULL::integer AS parking_count,
            NULL::numeric AS recovery_52w
           FROM apt_complex c
             LEFT JOIN area ON area.complex_id = c.complex_id
        )
 SELECT h.complex_id,
    m.apt_name_ko,
    h.rank_all,
    h.market_cap_krw,
    round(h.market_cap_krw::numeric / 1000000000000.0, 4) AS market_cap_trillion_krw,
    m.sigungu_name,
    m.legal_dong_name,
    m.household_count,
    m.approval_year,
    m.building_count,
    m.parking_count,
    timezone('utc'::text, now()) AS updated_at
   FROM complex_rank_history h
     JOIN latest l ON l.snapshot_date = h.snapshot_date
     LEFT JOIN master m ON m.complex_id = h.complex_id;;
alter view public.v_koaptix_complex_detail_sheet owner to postgres;
revoke all on table public.v_koaptix_complex_detail_sheet from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_complex_detail_sheet to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_complex_detail_sheet to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_complex_detail_sheet to service_role;

create or replace view public.v_koaptix_home_kpi as
 WITH latest_summary AS (
         SELECT koaptix_market_daily_summary.id,
            koaptix_market_daily_summary.run_date,
            koaptix_market_daily_summary.universe_code,
            koaptix_market_daily_summary.listed_complex_count,
            koaptix_market_daily_summary.total_market_cap,
            koaptix_market_daily_summary.top50_market_cap,
            koaptix_market_daily_summary.created_at,
            koaptix_market_daily_summary.updated_at
           FROM koaptix_market_daily_summary
          WHERE koaptix_market_daily_summary.universe_code = 'KOREA_ALL'::text
          ORDER BY koaptix_market_daily_summary.run_date DESC
         LIMIT 1
        ), latest_date AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
        ), master AS (
         WITH area AS (
                 SELECT NULL::bigint AS complex_id,
                    NULL::integer AS household_count,
                    NULL::integer AS total_household_count
                  WHERE false
                )
         SELECT c.complex_id,
            c.apt_name_ko,
            COALESCE(rm.sigungu_name, NULL::text) AS sigungu_name,
            COALESCE(rm.umd_nm, c.legal_dong_name) AS legal_dong_name,
            COALESCE(rm.lawd_cd, NULL::text) AS lawd_cd,
            COALESCE(rm.sgg_cd, NULL::text, "left"(COALESCE(rm.lawd_cd, NULL::text), 5)) AS sgg_cd,
            COALESCE(rm.umd_cd, NULL::text) AS umd_cd,
            COALESCE(area.total_household_count, area.household_count, c.household_count, c.total_household_count) AS household_count,
            COALESCE(area.total_household_count, area.household_count, c.total_household_count, c.household_count) AS total_household_count,
            COALESCE(c.build_year, NULL::integer) AS build_year,
            COALESCE(NULL::integer, c.build_year) AS approval_year,
            NULL::integer AS building_count,
            NULL::integer AS parking_count,
            NULL::numeric AS recovery_52w,
            c.address_road,
            c.address_jibun,
            c.latitude,
            c.longitude
           FROM apt_complex c
             LEFT JOIN area ON area.complex_id = c.complex_id
             LEFT JOIN koaptix_complex_region_map rm ON rm.complex_id = c.complex_id
        ), household_rollup AS (
         SELECT count(*)::integer AS listed_complex_count,
            COALESCE(sum(COALESCE(m.total_household_count, m.household_count, 0)), 0::bigint) AS tracked_household_count
           FROM complex_rank_history h_1
             JOIN latest_date d ON d.snapshot_date = h_1.snapshot_date
             LEFT JOIN master m ON m.complex_id = h_1.complex_id
        )
 SELECT s.run_date AS snapshot_date,
    s.universe_code,
    s.listed_complex_count,
    s.listed_complex_count AS listed_units,
    h.tracked_household_count,
    s.total_market_cap::bigint AS total_market_cap,
    round(s.total_market_cap / 1000000000000.0, 4) AS total_market_cap_trillion_krw,
    round(s.total_market_cap / 1000000000000.0, 1) AS market_cap_trillion_krw,
    s.top50_market_cap::bigint AS top50_market_cap,
    round(s.top50_market_cap / 1000000000000.0, 4) AS top50_market_cap_trillion_krw,
    timezone('utc'::text, now()) AS updated_at
   FROM latest_summary s
     CROSS JOIN household_rollup h;;
alter view public.v_koaptix_home_kpi owner to postgres;
revoke all on table public.v_koaptix_home_kpi from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_kpi to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_kpi to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_kpi to service_role;

create or replace view public.v_koaptix_latest_universe_rank_board as
 WITH latest_snapshot AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
        ), prev_snapshot AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
          WHERE complex_rank_history.snapshot_date < (( SELECT latest_snapshot.snapshot_date
                   FROM latest_snapshot))
        ), base_current AS (
         SELECT b.snapshot_date,
            m.universe_code,
            m.universe_name,
            m.universe_level,
            b.complex_id,
            b.apt_name_ko,
            b.address_road,
            b.address_jibun,
            COALESCE(m.umd_nm, b.legal_dong_name) AS legal_dong_name,
            b.build_year,
            COALESCE(m.sgg_cd, b.sigungu_code) AS sigungu_code,
            COALESCE(m.sigungu_name, b.sigungu_name) AS sigungu_name,
            b.market_cap_krw,
            b.total_household_count,
            b.household_count,
            b.priced_household_count,
            b.priced_household_ratio,
            b.total_cluster_count,
            b.priced_cluster_count,
            b.coverage_status,
            b.is_rank_eligible,
            b.eligibility_status,
            b.latitude,
            b.longitude,
            b.recovery_52w
           FROM v_koaptix_latest_rank_board b
             JOIN latest_snapshot ls ON ls.snapshot_date = b.snapshot_date
             JOIN v_koaptix_universe_membership m ON m.complex_id = b.complex_id
          WHERE b.universe_code = 'KOREA_ALL'::text
        ), ranked_current AS (
         SELECT bc.snapshot_date,
            bc.universe_code,
            bc.universe_name,
            bc.universe_level,
            bc.complex_id,
            bc.apt_name_ko,
            bc.address_road,
            bc.address_jibun,
            bc.legal_dong_name,
            bc.build_year,
            bc.sigungu_code,
            bc.sigungu_name,
            bc.market_cap_krw,
            bc.total_household_count,
            bc.household_count,
            bc.priced_household_count,
            bc.priced_household_ratio,
            bc.total_cluster_count,
            bc.priced_cluster_count,
            bc.coverage_status,
            bc.is_rank_eligible,
            bc.eligibility_status,
            bc.latitude,
            bc.longitude,
            bc.recovery_52w,
            rank() OVER (PARTITION BY bc.universe_code ORDER BY bc.market_cap_krw DESC NULLS LAST, bc.complex_id)::integer AS rank_all,
            sum(bc.market_cap_krw::numeric) OVER (PARTITION BY bc.universe_code) AS universe_total_market_cap
           FROM base_current bc
        ), prev_base AS (
         SELECT m.universe_code,
            h.complex_id,
            h.market_cap_krw
           FROM complex_rank_history h
             JOIN prev_snapshot ps ON ps.snapshot_date = h.snapshot_date
             JOIN v_koaptix_universe_membership m ON m.complex_id = h.complex_id
        ), prev_rank AS (
         SELECT pb.universe_code,
            pb.complex_id,
            rank() OVER (PARTITION BY pb.universe_code ORDER BY pb.market_cap_krw DESC NULLS LAST, pb.complex_id)::integer AS previous_rank_all
           FROM prev_base pb
        )
 SELECT rc.snapshot_date,
    rc.universe_code,
    rc.complex_id,
    rc.apt_name_ko,
    rc.address_road,
    rc.address_jibun,
    rc.legal_dong_name,
    rc.build_year,
    rc.sigungu_code,
    rc.sigungu_name,
    rc.rank_all,
        CASE
            WHEN rc.rank_all <= 10 THEN 'T1'::text
            WHEN rc.rank_all <= 50 THEN 'T2'::text
            WHEN rc.rank_all <= 100 THEN 'T3'::text
            WHEN rc.rank_all <= 500 THEN 'T4'::text
            ELSE 'T5'::text
        END AS tier_code,
        CASE
            WHEN rc.rank_all <= 10 THEN 'Top 10'::text
            WHEN rc.rank_all <= 50 THEN 'Top 50'::text
            WHEN rc.rank_all <= 100 THEN 'Top 100'::text
            WHEN rc.rank_all <= 500 THEN 'Top 500'::text
            ELSE 'Top 1000+'::text
        END AS tier_label,
        CASE
            WHEN rc.rank_all <= 10 THEN 1
            WHEN rc.rank_all <= 50 THEN 2
            WHEN rc.rank_all <= 100 THEN 3
            WHEN rc.rank_all <= 500 THEN 4
            ELSE 5
        END AS tier_sort,
    rc.market_cap_krw,
    round(rc.market_cap_krw::numeric / 1000000000000.0, 4) AS market_cap_trillion_krw,
        CASE
            WHEN rc.universe_total_market_cap > 0::numeric THEN round(rc.market_cap_krw::numeric / rc.universe_total_market_cap, 8)
            ELSE NULL::numeric
        END AS market_cap_share,
        CASE
            WHEN rc.universe_total_market_cap > 0::numeric THEN round(rc.market_cap_krw::numeric / rc.universe_total_market_cap * 100::numeric, 4)
            ELSE NULL::numeric
        END AS market_cap_share_pct,
    pr.previous_rank_all,
        CASE
            WHEN pr.previous_rank_all IS NULL THEN NULL::integer
            ELSE pr.previous_rank_all - rc.rank_all
        END AS rank_delta_1d,
        CASE
            WHEN pr.previous_rank_all IS NULL THEN 'NEW'::text
            WHEN pr.previous_rank_all > rc.rank_all THEN 'UP'::text
            WHEN pr.previous_rank_all < rc.rank_all THEN 'DOWN'::text
            ELSE 'SAME'::text
        END AS rank_movement,
    rc.rank_all <= 1000 AS is_top1000,
    rc.total_household_count,
    rc.household_count,
    rc.priced_household_count,
    rc.priced_household_ratio,
    rc.total_cluster_count,
    rc.priced_cluster_count,
    rc.coverage_status,
    rc.is_rank_eligible,
    rc.eligibility_status,
    rc.latitude,
    rc.longitude,
    rc.recovery_52w,
    rc.universe_name,
    rc.universe_level
   FROM ranked_current rc
     LEFT JOIN prev_rank pr ON pr.universe_code = rc.universe_code AND pr.complex_id = rc.complex_id;;
alter view public.v_koaptix_latest_universe_rank_board owner to postgres;
revoke all on table public.v_koaptix_latest_universe_rank_board from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board to service_role;

create or replace view public.v_koaptix_latest_rank_board as
 WITH latest AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
        ), prev_date AS (
         SELECT max(complex_rank_history.snapshot_date) AS snapshot_date
           FROM complex_rank_history
          WHERE complex_rank_history.snapshot_date < (( SELECT latest.snapshot_date
                   FROM latest))
        ), prev_rank AS (
         SELECT h_1.complex_id,
            h_1.rank_all
           FROM complex_rank_history h_1
             JOIN prev_date p_1 ON p_1.snapshot_date = h_1.snapshot_date
        ), total_market AS (
         SELECT COALESCE(sum(h_1.market_cap_krw), 0::numeric) AS total_market_cap
           FROM complex_rank_history h_1
             JOIN latest l_1 ON l_1.snapshot_date = h_1.snapshot_date
        ), master AS (
         WITH area AS (
                 SELECT NULL::bigint AS complex_id,
                    NULL::integer AS household_count,
                    NULL::integer AS total_household_count
                  WHERE false
                )
         SELECT c.complex_id,
            c.apt_name_ko,
            COALESCE(rm.sigungu_name, NULL::text) AS sigungu_name,
            COALESCE(rm.umd_nm, c.legal_dong_name) AS legal_dong_name,
            COALESCE(rm.lawd_cd, NULL::text) AS lawd_cd,
            COALESCE(rm.sgg_cd, NULL::text, "left"(COALESCE(rm.lawd_cd, NULL::text), 5)) AS sgg_cd,
            COALESCE(rm.umd_cd, NULL::text) AS umd_cd,
            COALESCE(area.total_household_count, area.household_count, c.household_count, c.total_household_count) AS household_count,
            COALESCE(area.total_household_count, area.household_count, c.total_household_count, c.household_count) AS total_household_count,
            COALESCE(c.build_year, NULL::integer) AS build_year,
            COALESCE(NULL::integer, c.build_year) AS approval_year,
            NULL::integer AS building_count,
            NULL::integer AS parking_count,
            NULL::numeric AS recovery_52w,
            c.address_road,
            c.address_jibun,
            c.latitude,
            c.longitude
           FROM apt_complex c
             LEFT JOIN area ON area.complex_id = c.complex_id
             LEFT JOIN koaptix_complex_region_map rm ON rm.complex_id = c.complex_id
        )
 SELECT h.snapshot_date,
    'KOREA_ALL'::text AS universe_code,
    h.complex_id,
    m.apt_name_ko,
    m.address_road,
    m.address_jibun,
    m.legal_dong_name,
    COALESCE(m.build_year, m.approval_year) AS build_year,
    COALESCE(m.sgg_cd, "left"(m.lawd_cd, 5)) AS sigungu_code,
    m.sigungu_name,
    h.rank_all,
        CASE
            WHEN h.rank_all <= 10 THEN 'T1'::text
            WHEN h.rank_all <= 50 THEN 'T2'::text
            WHEN h.rank_all <= 100 THEN 'T3'::text
            WHEN h.rank_all <= 500 THEN 'T4'::text
            ELSE 'T5'::text
        END AS tier_code,
        CASE
            WHEN h.rank_all <= 10 THEN 'Top 10'::text
            WHEN h.rank_all <= 50 THEN 'Top 50'::text
            WHEN h.rank_all <= 100 THEN 'Top 100'::text
            WHEN h.rank_all <= 500 THEN 'Top 500'::text
            ELSE 'Top 1000+'::text
        END AS tier_label,
        CASE
            WHEN h.rank_all <= 10 THEN 1
            WHEN h.rank_all <= 50 THEN 2
            WHEN h.rank_all <= 100 THEN 3
            WHEN h.rank_all <= 500 THEN 4
            ELSE 5
        END AS tier_sort,
    h.market_cap_krw,
    round(h.market_cap_krw::numeric / 1000000000000.0, 4) AS market_cap_trillion_krw,
        CASE
            WHEN t.total_market_cap > 0::numeric THEN round(h.market_cap_krw::numeric / t.total_market_cap, 8)
            ELSE NULL::numeric
        END AS market_cap_share,
        CASE
            WHEN t.total_market_cap > 0::numeric THEN round(h.market_cap_krw::numeric / t.total_market_cap * 100::numeric, 4)
            ELSE NULL::numeric
        END AS market_cap_share_pct,
    p.rank_all AS previous_rank_all,
        CASE
            WHEN p.rank_all IS NULL THEN NULL::integer
            ELSE p.rank_all - h.rank_all
        END AS rank_delta_1d,
        CASE
            WHEN p.rank_all IS NULL THEN 'NEW'::text
            WHEN p.rank_all > h.rank_all THEN 'UP'::text
            WHEN p.rank_all < h.rank_all THEN 'DOWN'::text
            ELSE 'SAME'::text
        END AS rank_movement,
    h.rank_all <= 1000 AS is_top1000,
    COALESCE(m.total_household_count, m.household_count) AS total_household_count,
    COALESCE(m.household_count, m.total_household_count) AS household_count,
        CASE
            WHEN h.market_cap_krw IS NOT NULL THEN COALESCE(m.household_count, m.total_household_count, 0)
            ELSE 0
        END AS priced_household_count,
        CASE
            WHEN COALESCE(m.total_household_count, m.household_count, 0) > 0 AND h.market_cap_krw IS NOT NULL THEN round(COALESCE(m.household_count, m.total_household_count, 0)::numeric / NULLIF(COALESCE(m.total_household_count, m.household_count, 0)::numeric, 0::numeric), 4)
            ELSE NULL::numeric
        END AS priced_household_ratio,
    COALESCE(m.building_count, 1) AS total_cluster_count,
        CASE
            WHEN h.market_cap_krw IS NOT NULL THEN COALESCE(m.building_count, 1)
            ELSE 0
        END AS priced_cluster_count,
        CASE
            WHEN h.market_cap_krw IS NOT NULL AND COALESCE(m.total_household_count, m.household_count, 0) > 0 THEN 'FULL'::text
            WHEN h.market_cap_krw IS NOT NULL THEN 'PARTIAL'::text
            ELSE 'NONE'::text
        END AS coverage_status,
    h.market_cap_krw IS NOT NULL AND COALESCE(m.total_household_count, m.household_count, 0) > 0 AS is_rank_eligible,
        CASE
            WHEN h.market_cap_krw IS NULL THEN 'NO_MARKET_CAP'::text
            WHEN COALESCE(m.total_household_count, m.household_count, 0) <= 0 THEN 'NO_HOUSEHOLD'::text
            ELSE 'ELIGIBLE'::text
        END AS eligibility_status,
    m.latitude,
    m.longitude,
    m.recovery_52w::text AS recovery_52w
   FROM complex_rank_history h
     JOIN latest l ON l.snapshot_date = h.snapshot_date
     LEFT JOIN master m ON m.complex_id = h.complex_id
     LEFT JOIN prev_rank p ON p.complex_id = h.complex_id
     CROSS JOIN total_market t;;
alter view public.v_koaptix_latest_rank_board owner to postgres;
revoke all on table public.v_koaptix_latest_rank_board from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_rank_board to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_rank_board to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_rank_board to service_role;

create or replace view public.v_koaptix_latest_universe_rank_board_u as
 SELECT rm.snapshot_date,
    rm.universe_code,
    rm.universe_name,
    rm.universe_scope,
    rm.complex_id,
    rm.apt_name_ko,
    COALESCE(NULLIF(rm.sigungu_name, ''::text), rd.region_name_ko, ''::text) AS sigungu_name,
    rm.legal_dong_name,
    rm.build_year,
    rm.household_count,
    rm.total_household_count,
    rm.recovery_52w,
    rm.rank_all,
    rm.previous_rank_all,
    rm.rank_delta_w,
    rm.rank_movement,
    rm.market_cap_krw,
    rm.market_cap_trillion_krw,
    rm.market_cap_share,
    rm.market_cap_share_pct,
    rm.tier_code,
    rm.tier_label,
    rm.tier_sort,
    rm.is_top1000
   FROM koaptix_latest_board_read_model rm
     LEFT JOIN apt_complex c ON c.complex_id = rm.complex_id
     LEFT JOIN region_dim rd ON rd.region_id = c.region_id AND rd.region_type = 'sigungu'::text;;
alter view public.v_koaptix_latest_universe_rank_board_u owner to postgres;
revoke all on table public.v_koaptix_latest_universe_rank_board_u from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u to service_role;

-- Restore the exact three ACLs isolated by the guarded cutover; their definitions
-- were not replaced by 905/cutover.
alter view public.v_koaptix_home_public_service_payload owner to postgres;
revoke all on table public.v_koaptix_home_public_service_payload from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_public_service_payload to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_public_service_payload to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_public_service_payload to service_role;

alter view public.v_koaptix_home_latest_payload owner to postgres;
revoke all on table public.v_koaptix_home_latest_payload from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_latest_payload to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_latest_payload to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_home_latest_payload to service_role;

alter view public.v_koaptix_latest_universe_rank_board_u_v2 owner to postgres;
revoke all on table public.v_koaptix_latest_universe_rank_board_u_v2 from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u_v2 to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u_v2 to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_latest_universe_rank_board_u_v2 to service_role;

-- Restore membership views in reverse replacement order.
create or replace view public.v_koaptix_universe_membership as
 WITH base AS (
         SELECT r.complex_id,
            NULLIF(r.lawd_cd, ''::text) AS lawd_cd,
            NULLIF(r.sgg_cd, ''::text) AS sgg_cd,
            NULLIF(r.sigungu_name, ''::text) AS sigungu_name,
            NULLIF(r.umd_nm, ''::text) AS umd_nm,
            "left"(NULLIF(r.lawd_cd, ''::text), 2) AS sido_prefix,
            COALESCE(NULLIF(r.sgg_cd, ''::text), "left"(NULLIF(r.lawd_cd, ''::text), 5)) AS normalized_sgg_cd
           FROM v_koaptix_complex_region_resolved r
        ), metro AS (
         SELECT base.complex_id,
                CASE base.sido_prefix
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '27'::text THEN 'DAEGU_ALL'::text
                    WHEN '28'::text THEN 'INCHEON_ALL'::text
                    WHEN '29'::text THEN 'GWANGJU_ALL'::text
                    WHEN '30'::text THEN 'DAEJEON_ALL'::text
                    WHEN '31'::text THEN 'ULSAN_ALL'::text
                    WHEN '36'::text THEN 'SEJONG_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    WHEN '42'::text THEN 'GANGWON_ALL'::text
                    WHEN '43'::text THEN 'CHUNGBUK_ALL'::text
                    WHEN '44'::text THEN 'CHUNGNAM_ALL'::text
                    WHEN '45'::text THEN 'JEONBUK_ALL'::text
                    WHEN '46'::text THEN 'JEONNAM_ALL'::text
                    WHEN '47'::text THEN 'GYEONGBUK_ALL'::text
                    WHEN '48'::text THEN 'GYEONGNAM_ALL'::text
                    WHEN '50'::text THEN 'JEJU_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE base.sido_prefix
                    WHEN '11'::text THEN '서울 전체'::text
                    WHEN '26'::text THEN '부산 전체'::text
                    WHEN '27'::text THEN '대구 전체'::text
                    WHEN '28'::text THEN '인천 전체'::text
                    WHEN '29'::text THEN '광주 전체'::text
                    WHEN '30'::text THEN '대전 전체'::text
                    WHEN '31'::text THEN '울산 전체'::text
                    WHEN '36'::text THEN '세종 전체'::text
                    WHEN '41'::text THEN '경기 전체'::text
                    WHEN '42'::text THEN '강원 전체'::text
                    WHEN '43'::text THEN '충북 전체'::text
                    WHEN '44'::text THEN '충남 전체'::text
                    WHEN '45'::text THEN '전북 전체'::text
                    WHEN '46'::text THEN '전남 전체'::text
                    WHEN '47'::text THEN '경북 전체'::text
                    WHEN '48'::text THEN '경남 전체'::text
                    WHEN '50'::text THEN '제주 전체'::text
                    ELSE NULL::text
                END AS universe_name,
            1 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.sido_prefix IS NOT NULL
        ), sgg AS (
         SELECT base.complex_id,
            'SGG_'::text || base.normalized_sgg_cd AS universe_code,
            COALESCE(base.sigungu_name, '시군구 미상'::text) AS universe_name,
            2 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.normalized_sgg_cd IS NOT NULL
        ), all_rows AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '대한민국 전체'::text AS universe_name,
            0 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
        UNION ALL
         SELECT metro.complex_id,
            metro.universe_code,
            metro.universe_name,
            metro.universe_level,
            metro.lawd_cd,
            metro.sgg_cd,
            metro.sigungu_name,
            metro.umd_nm
           FROM metro
          WHERE metro.universe_code IS NOT NULL
        UNION ALL
         SELECT sgg.complex_id,
            sgg.universe_code,
            sgg.universe_name,
            sgg.universe_level,
            sgg.lawd_cd,
            sgg.sgg_cd,
            sgg.sigungu_name,
            sgg.umd_nm
           FROM sgg
        )
 SELECT DISTINCT ON (complex_id, universe_code) complex_id,
    universe_code,
    universe_name,
    universe_level,
    lawd_cd,
    sgg_cd,
    sigungu_name,
    umd_nm
   FROM all_rows
  ORDER BY complex_id, universe_code;;
alter view public.v_koaptix_universe_membership owner to postgres;
revoke all on table public.v_koaptix_universe_membership from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to service_role;

create or replace view public.v_koaptix_universe_membership_u as
 WITH base AS (
         SELECT v_koaptix_complex_region_resolved_u.complex_id,
            v_koaptix_complex_region_resolved_u.lawd_cd,
            v_koaptix_complex_region_resolved_u.sgg_cd,
            v_koaptix_complex_region_resolved_u.sigungu_name,
            v_koaptix_complex_region_resolved_u.legal_dong_name
           FROM v_koaptix_complex_region_resolved_u
        ), membership AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '전국'::text AS universe_name,
            'NATION'::text AS universe_scope
           FROM base
        UNION ALL
         SELECT base.complex_id,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN '서울'::text
                    WHEN '26'::text THEN '부산'::text
                    WHEN '41'::text THEN '경기'::text
                    ELSE NULL::text
                END AS universe_name,
            'PROVINCE'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2) = ANY (ARRAY['11'::text, '26'::text, '41'::text])
        UNION ALL
         SELECT base.complex_id,
            'SGG_'::text || "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) AS universe_code,
            COALESCE(base.sigungu_name, "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5)) AS universe_name,
            'SGG'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) <> ''::text
        )
 SELECT DISTINCT complex_id,
    universe_code,
    universe_name,
    universe_scope
   FROM membership
  WHERE universe_code IS NOT NULL;;
alter view public.v_koaptix_universe_membership_u owner to postgres;
revoke all on table public.v_koaptix_universe_membership_u from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to service_role;

drop view public.v_koaptix_rank_membership_authority_u;

-- Restore exact captured compatibility helper body, owner and current EXECUTE ACL.
CREATE OR REPLACE FUNCTION public.append_daily_rank_history(p_run_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_history_exists boolean;
  v_previous_snapshot_date date;
  v_deleted_rows integer := 0;
  v_inserted_rows integer := 0;
  v_trade_complex_count integer := 0;
  v_carried_complex_count integer := 0;
begin
  select to_regclass('public.complex_rank_history') is not null into v_history_exists;
  if not v_history_exists then
    raise exception 'public.complex_rank_history table not found';
  end if;

  select max(snapshot_date)
    into v_previous_snapshot_date
  from public.complex_rank_history
  where snapshot_date < p_run_date;

  select count(*)
    into v_trade_complex_count
  from (
    select distinct s.complex_id
    from public.staging_market_raw s
    where s.complex_id is not null
      and s.deal_amount_krw is not null
      and coalesce(s.household_count, 0) > 0
      and s.trade_date <= p_run_date
  ) t;

  if v_trade_complex_count = 0 and v_previous_snapshot_date is null then
    raise exception 'No matched staged trade rows and no previous snapshot found for %', p_run_date;
  end if;

  delete from public.complex_rank_history
  where snapshot_date = p_run_date;
  get diagnostics v_deleted_rows = row_count;

  with latest_trade as (
    select distinct on (s.complex_id)
      s.complex_id,
      (s.deal_amount_krw * coalesce(s.household_count, 0))::numeric(20, 0) as market_cap_krw
    from public.staging_market_raw s
    where s.complex_id is not null
      and s.deal_amount_krw is not null
      and coalesce(s.household_count, 0) > 0
      and s.trade_date <= p_run_date
    order by s.complex_id, s.trade_date desc, s.ingested_at desc, s.deal_amount_krw desc
  ),
  previous_snapshot as (
    select
      h.complex_id,
      h.market_cap_krw
    from public.complex_rank_history h
    where h.snapshot_date = v_previous_snapshot_date
  ),
  resolved as (
    select
      coalesce(t.complex_id, p.complex_id) as complex_id,
      coalesce(t.market_cap_krw, p.market_cap_krw) as market_cap_krw
    from previous_snapshot p
    full outer join latest_trade t
      on t.complex_id = p.complex_id
    where coalesce(t.market_cap_krw, p.market_cap_krw) is not null
  ),
  ranked as (
    select
      p_run_date as snapshot_date,
      r.complex_id,
      r.market_cap_krw,
      dense_rank() over (
        order by r.market_cap_krw desc, r.complex_id asc
      ) as rank_all
    from resolved r
  )
  insert into public.complex_rank_history (
    snapshot_date,
    complex_id,
    market_cap_krw,
    total_market_cap, -- 🚨 여기에 total_market_cap 기둥을 추가했습니다!!
    rank_all
  )
  select
    snapshot_date,
    complex_id,
    market_cap_krw,
    market_cap_krw,   -- 🚨 빈칸에 market_cap_krw 돈을 똑같이 복사해서 채워줍니다!!
    rank_all
  from ranked
  order by rank_all asc;

  get diagnostics v_inserted_rows = row_count;

  if v_previous_snapshot_date is not null then
    select count(*)
      into v_carried_complex_count
    from public.complex_rank_history h
    where h.snapshot_date = p_run_date
      and not exists (
        select 1
        from public.staging_market_raw s
        where s.complex_id = h.complex_id
          and s.deal_amount_krw is not null
          and coalesce(s.household_count, 0) > 0
          and s.trade_date <= p_run_date
      );
  else
    v_carried_complex_count := 0;
  end if;

  return jsonb_build_object(
    'previous_snapshot_date', v_previous_snapshot_date,
    'trade_complex_count', v_trade_complex_count,
    'carried_complex_count', v_carried_complex_count,
    'deleted_rows', v_deleted_rows,
    'inserted_rows', v_inserted_rows
  );
end;
$function$
;
alter function public.append_daily_rank_history(date)
  owner to postgres;
revoke all on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role,
       koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.append_daily_rank_history(date) to service_role;

-- Remove new views before their source tables.
drop view public.v_koaptix_home_public_service_payload_published;
drop view public.v_koaptix_latest_global_rank_board_published;
drop view public.v_koaptix_latest_board_read_model_published;
drop view public.v_koaptix_latest_board_publication_currentness;
drop view public.v_koaptix_latest_board_publication_summary;

-- Policies are exact new objects and must not survive the rollback.
drop policy koaptix_rank_publication_owner_select on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_insert on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_select_apt_complex on public.apt_complex;
drop policy koaptix_rank_publication_owner_select_market_cap on public.apt_market_cap_snapshot;
drop policy koaptix_rank_publication_owner_select_eligibility on public.complex_eligibility_snapshot;
drop policy koaptix_rank_publication_owner_select_region_dim on public.region_dim;

-- Tables remove their attached row/constraint triggers. Order follows FKs.
drop table public.koaptix_latest_board_publication;
drop table public.koaptix_latest_board_publication_event;
drop table public.koaptix_latest_board_generation_global_row;
drop table public.koaptix_latest_board_generation_row;
drop table public.koaptix_latest_board_generation_universe;
drop table public.koaptix_rank_publication_snapshot_stage;
drop table public.koaptix_rank_publication_history_stage;
drop table public.koaptix_latest_board_generation_surface;
drop table public.koaptix_latest_board_generation;

drop function public.koaptix_seed_latest_board_compatibility_generation(jsonb);
drop function public.koaptix_build_rank_publication_generation(jsonb);
drop function public.koaptix_publish_latest_board_generation(jsonb);
drop function public.koaptix_rollback_latest_board_publication(jsonb);
drop function public.koaptix_guard_latest_board_publication_pointer();
drop function public.koaptix_require_publication_event_pointer_commit();
drop function public.koaptix_reject_latest_board_immutable_mutation();
drop function public.koaptix_assert_latest_board_action_packet_header(jsonb,text[],text,text);
drop function public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean);
drop function public.koaptix_assert_generation_authority(uuid);
drop function public.koaptix_assert_rank_input_authority(text,date,jsonb);
drop function public.koaptix_verify_latest_board_generation(uuid);
drop function public.koaptix_combined_surface_manifest_digest(uuid);
drop function public.koaptix_surface_component_manifest_digest(uuid,text);
drop function public.koaptix_generation_surface_components_json(uuid);
drop function public.koaptix_jsonb_array_has_exact_object_keys(jsonb,text[]);
drop function public.koaptix_compact_jsonb_object(jsonb);
drop function public.koaptix_service_date_vector_digest(uuid);
drop function public.koaptix_global_rows_digest(uuid);
drop function public.koaptix_service_rows_digest(uuid,text);
drop function public.koaptix_compact_jsonb_array(jsonb);
drop function public.koaptix_jsonb_has_exact_keys(jsonb,text[]);

drop view public.v_koaptix_canonical_rank_input_u;
drop table public.koaptix_rank_input_manifest_revocation;
drop table public.koaptix_rank_input_authority_manifest;
drop function public.koaptix_revoke_rank_input_manifest(jsonb);
drop function public.koaptix_seal_rank_input_manifest(jsonb);
drop function public.koaptix_compute_rank_input_authority(date);
drop function public.koaptix_reject_rank_input_manifest_mutation();
drop function public.koaptix_text_array_is_distinct_nonblank(text[]);

-- Remove every narrow owner grant on pre-existing relations and schema.
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
revoke usage on schema public from koaptix_rank_authority_owner,
  koaptix_rank_publication_owner,koaptix_rank_authority_reader,
  koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
  koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
  koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

-- Restore the complete captured application-role table ACLs, including SELECT,
-- REFERENCES and TRIGGER. Fresh catalog evidence has zero explicit column ACLs.
revoke all on table public.complex_rank_history from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to service_role;

revoke all on table public.koaptix_rank_snapshot from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to service_role;

revoke all on table public.koaptix_latest_board_read_model from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to service_role;

-- Restore all six captured legacy helper EXECUTE edges exactly to service_role.
grant execute on function public.sync_rank_snapshot_from_history(date) to service_role;
grant execute on function public.refresh_koaptix_latest_rank_board() to service_role;
grant execute on function public.run_daily_market_pipeline(date) to service_role;
grant execute on function public.run_daily_market_pipeline_legacy(date) to service_role;
grant execute on function public.run_koaptix_safe_finalize(date) to service_role;

drop role koaptix_rank_authority_reader;
drop role koaptix_rank_manifest_sealer;
drop role koaptix_rank_manifest_revoker;
drop role koaptix_rank_bootstrap_seeder;
drop role koaptix_rank_generation_builder;
drop role koaptix_rank_generation_publisher;
drop role koaptix_rank_publication_rollback;
drop role koaptix_rank_authority_owner;
drop role koaptix_rank_publication_owner;

do $postconditions$
declare
  v_name text;
  v_expected_hash text;
  v_actual_hash text;
  v_owner text;
  v_actual_acl text[];
  v_expected_relation_acl text[];
  v_expected_function_acl text[]:=array[
    'postgres:EXECUTE:t','service_role:EXECUTE:f'
  ]::text[];
begin
  if exists (
    select 1
    from unnest(array[
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
      'public.koaptix_latest_board_publication',
      'public.v_koaptix_canonical_rank_input_u',
      'public.v_koaptix_rank_membership_authority_u',
      'public.v_koaptix_home_public_service_payload_published',
      'public.v_koaptix_latest_global_rank_board_published',
      'public.v_koaptix_latest_board_read_model_published',
      'public.v_koaptix_latest_board_publication_currentness',
      'public.v_koaptix_latest_board_publication_summary'
    ]::text[]) object_name
    where to_regclass(object_name) is not null
  ) then
    raise exception 'a 900-905 relation or view survived full definition rollback';
  end if;

  if exists (
    select 1
    from unnest(array[
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
      'public.koaptix_rollback_latest_board_publication(jsonb)',
      'public.koaptix_revoke_rank_input_manifest(jsonb)',
      'public.koaptix_seal_rank_input_manifest(jsonb)',
      'public.koaptix_compute_rank_input_authority(date)',
      'public.koaptix_reject_rank_input_manifest_mutation()',
      'public.koaptix_text_array_is_distinct_nonblank(text[])'
    ]::text[]) procedure_name
    where to_regprocedure(procedure_name) is not null
  ) then
    raise exception 'a 900-905 function survived full definition rollback';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_roles r
    where r.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'a recovery role survived full definition rollback';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policy p
    join pg_catalog.pg_class c on c.oid=p.polrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and p.polname in (
        'koaptix_rank_publication_owner_select',
        'koaptix_rank_publication_owner_insert',
        'koaptix_rank_publication_owner_select_apt_complex',
        'koaptix_rank_publication_owner_select_market_cap',
        'koaptix_rank_publication_owner_select_eligibility',
        'koaptix_rank_publication_owner_select_region_dim'
      )
  ) then
    raise exception 'a stage-4 source policy survived full definition rollback';
  end if;

  for v_name,v_expected_hash in
    select * from (values
      ('v_koaptix_universe_membership_u','CCFBA1DF62A399473564CAB07880BD2213E581EB92CBB67954169A57124E874A'),
      ('v_koaptix_universe_membership','BDEA1F0654D26ABA4AA3763B7DC6C839E05700475C87E95B72F46D7AB935D1F0'),
      ('v_koaptix_latest_universe_rank_board_u','890A1669F4B049576D8C9274C7D70DB45AAD4DEE246AD8306604A5656DC778E1'),
      ('v_koaptix_latest_rank_board','0674271BC860667F038C43DF31B7FB7BC8F2A5A284497446BEB1686B25EB0745'),
      ('v_koaptix_home_kpi','B5785549DC82804B8273C5925B4B9EF23F247E4878774BC117B3B2912AEFB619'),
      ('v_koaptix_complex_detail_sheet','FBCF1362C790E8DC77E81476857CDDD73F87D8A18A954E4A76437B18174CDC9A'),
      ('v_koaptix_latest_universe_rank_board','A614C06109C136C5FFEF1346A90A9CB0A804C18DC39CDB115811B3824682BCCF')
    ) expected(view_name,definition_sha256)
  loop
    select upper(encode(sha256(convert_to(
             pg_get_viewdef(to_regclass('public.'||v_name),true),'UTF8'
           )),'hex'))
      into v_actual_hash;
    if v_actual_hash is distinct from v_expected_hash then
      raise exception 'captured definition hash mismatch for public.%',v_name;
    end if;
  end loop;

  select array_agg(
           format('%s:%s:%s',r.role_name,p.privilege_name,r.grantable)
           order by r.role_name,p.privilege_name
         )
    into v_expected_relation_acl
  from (values
    ('anon',false),('authenticated',false),('postgres',true),('service_role',false)
  ) r(role_name,grantable)
  cross join unnest(array[
    'DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'
  ]::text[]) p(privilege_name);

  foreach v_name in array array[
    'complex_rank_history','koaptix_rank_snapshot','koaptix_latest_board_read_model',
    'v_koaptix_latest_universe_rank_board_u','v_koaptix_latest_rank_board',
    'v_koaptix_home_kpi','v_koaptix_complex_detail_sheet',
    'v_koaptix_latest_universe_rank_board','v_koaptix_home_latest_payload',
    'v_koaptix_home_public_service_payload',
    'v_koaptix_latest_universe_rank_board_u_v2'
  ] loop
    select r.rolname,
           array_agg(
             format('%s:%s:%s',coalesce(g.rolname,'PUBLIC'),upper(e.privilege_type),e.is_grantable)
             order by coalesce(g.rolname,'PUBLIC'),upper(e.privilege_type)
           )
      into v_owner,v_actual_acl
    from pg_catalog.pg_class c
    join pg_catalog.pg_roles r on r.oid=c.relowner
    cross join lateral pg_catalog.aclexplode(
      coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))
    ) e
    left join pg_catalog.pg_roles g on g.oid=e.grantee
    where c.oid=to_regclass('public.'||v_name)
    group by r.rolname;
    if v_owner is distinct from 'postgres'
       or v_actual_acl is distinct from v_expected_relation_acl then
      raise exception 'captured owner/ACL mismatch for public.%',v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'append_daily_rank_history(date)',
    'sync_rank_snapshot_from_history(date)',
    'refresh_koaptix_latest_rank_board()',
    'run_daily_market_pipeline(date)',
    'run_daily_market_pipeline_legacy(date)',
    'run_koaptix_safe_finalize(date)'
  ] loop
    select array_agg(
             format('%s:%s:%s',coalesce(g.rolname,'PUBLIC'),upper(e.privilege_type),e.is_grantable)
             order by coalesce(g.rolname,'PUBLIC'),upper(e.privilege_type)
           )
      into v_actual_acl
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))
    ) e
    left join pg_catalog.pg_roles g on g.oid=e.grantee
    where p.oid=to_regprocedure('public.'||v_name);
    if v_actual_acl is distinct from v_expected_function_acl then
      raise exception 'captured helper ACL mismatch for public.%',v_name;
    end if;
  end loop;
end;
$postconditions$;

commit;
