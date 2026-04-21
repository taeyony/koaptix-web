-- KOAPTIX SGG Batch 2 candidate audit
-- 목적:
-- 1) 현재 enabled 10개 SGG를 제외하고
-- 2) READY_FOR_SERVICE 인 SGG 중
-- 3) latest board row 수와 대표 rank 기준으로
-- 4) 서비스 노출 Batch 2 후보를 라벨까지 포함해 추출

with current_enabled_sgg as (
  select *
  from (
    values
      ('SGG_11710'),
      ('SGG_11650'),
      ('SGG_11680'),
      ('SGG_41135'),
      ('SGG_11440'),
      ('SGG_11560'),
      ('SGG_11590'),
      ('SGG_11500'),
      ('SGG_11290'),
      ('SGG_11230')
  ) as t(universe_code)
),
snapshot_counts as (
  select
    universe_code,
    max(snapshot_date) as latest_snapshot_date,
    count(*) as snapshot_row_count
  from koaptix_rank_snapshot
  where universe_code like 'SGG_%'
  group by universe_code
),
latest_board_counts as (
  select
    universe_code,
    count(*) as latest_board_row_count,
    min(rank_all) as best_rank,
    max(rank_all) as worst_rank
  from v_koaptix_latest_universe_rank_board_u
  where universe_code like 'SGG_%'
  group by universe_code
),
ready_sgg as (
  select
    s.universe_code,
    s.latest_snapshot_date,
    s.snapshot_row_count,
    b.latest_board_row_count,
    b.best_rank,
    b.worst_rank
  from snapshot_counts s
  join latest_board_counts b
    on s.universe_code = b.universe_code
  left join current_enabled_sgg e
    on s.universe_code = e.universe_code
  where e.universe_code is null
),
region_labels as (
  select
    'SGG_' || region_code as universe_code,
    full_name_ko,
    region_name_ko
  from region_dim
  where region_type = 'sigungu'
),
scored as (
  select
    r.universe_code,
    rl.full_name_ko,
    rl.region_name_ko,
    r.latest_snapshot_date,
    r.snapshot_row_count,
    r.latest_board_row_count,
    r.best_rank,
    r.worst_rank,
    case
      when r.latest_board_row_count >= 150 then 'A'
      when r.latest_board_row_count >= 80 then 'B'
      when r.latest_board_row_count >= 40 then 'C'
      else 'D'
    end as exposure_priority
  from ready_sgg r
  left join region_labels rl
    on r.universe_code = rl.universe_code
)
select
  universe_code,
  full_name_ko,
  region_name_ko,
  latest_snapshot_date,
  snapshot_row_count,
  latest_board_row_count,
  best_rank,
  worst_rank,
  exposure_priority
from scored
order by
  exposure_priority asc,
  latest_board_row_count desc,
  best_rank asc,
  universe_code asc;