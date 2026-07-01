CREATE VIEW public.v_koaptix_home_public_service_payload AS
WITH service_timeseries AS (
  SELECT
    t.snapshot_date,
    t.index_code,
    t.universe_code,
    t.index_name,
    t.base_date,
    t.base_value,
    t.index_value,
    t.prev_snapshot_date,
    t.prev_index_value,
    t.change_1m,
    t.change_pct_1m,
    t.base_market_cap_krw,
    t.total_market_cap_krw,
    t.prev_total_market_cap_krw,
    t.market_cap_change_1m,
    t.market_cap_change_pct_1m,
    t.component_complex_count,
    row_number() OVER (
      PARTITION BY t.index_code, t.universe_code, t.base_date
      ORDER BY t.snapshot_date DESC
    ) AS service_recency_rank
  FROM public.v_koaptix_index_timeseries AS t
  WHERE t.index_code = 'KOAPTIX_KOREA'
    AND t.universe_code = 'KOREA_ALL'
    AND t.base_date = DATE '2024-07-31'
),
latest_index AS (
  SELECT *
  FROM service_timeseries
  WHERE service_recency_rank = 1
),
chart AS (
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'snapshot_date', t.snapshot_date,
        'base_date', t.base_date,
        'base_value', t.base_value,
        'index_source_mode', 'public_service',
        'source_mode', 'public_service',
        'baseline_mode', 'public_service_2024_07_31',
        'public_exposure_status', 'blocked',
        'index_value', t.index_value,
        'prev_snapshot_date', t.prev_snapshot_date,
        'prev_index_value', t.prev_index_value,
        'change_1m', t.change_1m,
        'change_pct_1m', t.change_pct_1m,
        'total_market_cap_krw', t.total_market_cap_krw,
        'component_complex_count', t.component_complex_count
      )
      ORDER BY t.snapshot_date
    ) AS index_chart
  FROM service_timeseries AS t
),
rank_top50 AS (
  SELECT
    r.rank_all,
    r.tier_code,
    r.tier_label,
    r.complex_id,
    r.apt_name_ko,
    r.sigungu_name,
    r.legal_dong_name,
    r.address_road,
    r.address_jibun,
    r.build_year,
    r.market_cap_krw,
    r.market_cap_trillion_krw,
    r.market_cap_share_pct,
    r.previous_rank_all,
    r.rank_delta_1d,
    r.rank_movement,
    r.priced_household_ratio,
    r.coverage_status,
    r.latitude,
    r.longitude,
    r.recovery_52w
  FROM public.v_koaptix_latest_rank_board AS r
  WHERE r.universe_code = 'KOREA_ALL'
  ORDER BY r.rank_all
  LIMIT 50
),
top50 AS (
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'rank_all', t.rank_all,
        'tier_code', t.tier_code,
        'tier_label', t.tier_label,
        'complex_id', t.complex_id,
        'apt_name_ko', t.apt_name_ko,
        'sigungu_name', t.sigungu_name,
        'legal_dong_name', t.legal_dong_name,
        'address_road', t.address_road,
        'address_jibun', t.address_jibun,
        'build_year', t.build_year,
        'market_cap_krw', t.market_cap_krw,
        'market_cap_trillion_krw', t.market_cap_trillion_krw,
        'market_cap_share_pct', t.market_cap_share_pct,
        'previous_rank_all', t.previous_rank_all,
        'rank_delta_1d', t.rank_delta_1d,
        'rank_movement', t.rank_movement,
        'priced_household_ratio', t.priced_household_ratio,
        'coverage_status', t.coverage_status,
        'latitude', t.latitude,
        'longitude', t.longitude,
        'recovery_52w', t.recovery_52w
      )
      ORDER BY t.rank_all
    ) AS top50_items,
    count(*)::integer AS top50_count
  FROM rank_top50 AS t
),
rank_meta AS (
  SELECT count(*)::integer AS total_ranked_complexes
  FROM public.v_koaptix_latest_rank_board AS r
  WHERE r.universe_code = 'KOREA_ALL'
)
SELECT
  li.snapshot_date,
  li.index_code,
  li.universe_code,
  li.index_name,
  li.base_date,
  jsonb_build_object(
    'snapshot_date', li.snapshot_date,
    'index_code', li.index_code,
    'universe_code', li.universe_code,
    'index_name', li.index_name,
    'base_date', li.base_date,
    'base_value', li.base_value,
    'index_source_mode', 'public_service',
    'source_mode', 'public_service',
    'baseline_mode', 'public_service_2024_07_31',
    'public_exposure_status', 'blocked',
    'index_value', li.index_value,
    'prev_month_snapshot_date', li.prev_snapshot_date,
    'prev_month_index_value', li.prev_index_value,
    'change_1m', li.change_1m,
    'change_pct_1m', li.change_pct_1m,
    'movement_1m',
      CASE
        WHEN li.change_1m IS NULL THEN 'new'
        WHEN li.change_1m > 0 THEN 'up'
        WHEN li.change_1m < 0 THEN 'down'
        ELSE 'flat'
      END,
    'base_market_cap_krw', li.base_market_cap_krw,
    'total_market_cap_krw', li.total_market_cap_krw,
    'prev_month_total_market_cap_krw', li.prev_total_market_cap_krw,
    'market_cap_change_1m', li.market_cap_change_1m,
    'market_cap_change_pct_1m', li.market_cap_change_pct_1m,
    'component_complex_count', li.component_complex_count
  ) AS index_card,
  COALESCE(chart.index_chart, '[]'::jsonb) AS index_chart,
  COALESCE(top50.top50_items, '[]'::jsonb) AS top50,
  COALESCE(top50.top50_count, 0) AS top50_count,
  COALESCE(rank_meta.total_ranked_complexes, 0) AS total_ranked_complexes
FROM latest_index AS li
CROSS JOIN chart
CROSS JOIN top50
CROSS JOIN rank_meta;
