-- KOAPTIX universe readiness audit
-- 목적:
-- 1) DB에 존재하는 전국 macro + SGG universe를 한 번에 점검
-- 2) snapshot / latest board row 실존 기준 readiness 판정
-- 3) 이후 registry visible 단계로 올릴 후보를 뽑기

with snapshot_counts as (
  select
    universe_code,
    max(snapshot_date) as latest_snapshot_date,
    count(*) as snapshot_row_count
  from koaptix_rank_snapshot
  group by universe_code
),
latest_board_counts as (
  select
    universe_code,
    count(*) as latest_board_row_count,
    min(rank_all) as best_rank,
    max(rank_all) as worst_rank
  from v_koaptix_latest_universe_rank_board_u
  group by universe_code
),
universe_pool as (
  select universe_code from snapshot_counts
  union
  select universe_code from latest_board_counts
),
classified as (
  select
    p.universe_code,
    case
      when p.universe_code = 'KOREA_ALL' then 'macro'
      when p.universe_code like '%_ALL' then 'macro'
      when p.universe_code like 'SGG_%' then 'sgg'
      else 'other'
    end as universe_type,
    s.latest_snapshot_date,
    coalesce(s.snapshot_row_count, 0) as snapshot_row_count,
    coalesce(b.latest_board_row_count, 0) as latest_board_row_count,
    b.best_rank,
    b.worst_rank
  from universe_pool p
  left join snapshot_counts s
    on p.universe_code = s.universe_code
  left join latest_board_counts b
    on p.universe_code = b.universe_code
)
select
  universe_code,
  universe_type,
  latest_snapshot_date,
  snapshot_row_count,
  latest_board_row_count,
  best_rank,
  worst_rank,
  case
    when snapshot_row_count > 0 and latest_board_row_count > 0 then 'READY_FOR_SERVICE'
    when snapshot_row_count > 0 and latest_board_row_count = 0 then 'SNAPSHOT_ONLY'
    when snapshot_row_count = 0 and latest_board_row_count > 0 then 'BOARD_ONLY_CHECK'
    else 'NOT_READY'
  end as readiness_status
from classified
where universe_type in ('macro', 'sgg')
order by
  case universe_type
    when 'macro' then 1
    when 'sgg' then 2
    else 3
  end,
  universe_code;