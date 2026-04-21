-- KOAPTIX macro readiness alignment audit
-- 목적:
-- 1) 전체 macro universe의 snapshot / latest board / dynamic row 존재 여부를 한 번에 본다.
-- 2) 서비스 registry visible과 실제 readiness가 어긋나는 macro를 찾는다.

with macro_registry as (
  select *
  from (
    values
      ('KOREA_ALL'),
      ('SEOUL_ALL'),
      ('BUSAN_ALL'),
      ('DAEGU_ALL'),
      ('INCHEON_ALL'),
      ('GWANGJU_ALL'),
      ('DAEJEON_ALL'),
      ('ULSAN_ALL'),
      ('SEJONG_ALL'),
      ('GYEONGGI_ALL'),
      ('GANGWON_ALL'),
      ('CHUNGBUK_ALL'),
      ('CHUNGNAM_ALL'),
      ('JEONBUK_ALL'),
      ('JEONNAM_ALL'),
      ('GYEONGBUK_ALL'),
      ('GYEONGNAM_ALL'),
      ('JEJU_ALL')
  ) as t(universe_code)
),
snapshot_counts as (
  select
    universe_code,
    max(snapshot_date) as latest_snapshot_date,
    count(*) as snapshot_rows
  from koaptix_rank_snapshot
  where universe_code like '%_ALL'
  group by universe_code
),
latest_board_counts as (
  select
    universe_code,
    count(*) as latest_board_rows,
    min(rank_all) as best_rank,
    max(rank_all) as worst_rank
  from v_koaptix_latest_universe_rank_board_u
  where universe_code like '%_ALL'
  group by universe_code
),
dynamic_counts as (
  select
    universe_code,
    count(*) as dynamic_rows
  from v_koaptix_universe_rank_history_dynamic
  where universe_code like '%_ALL'
  group by universe_code
)
select
  r.universe_code,
  s.latest_snapshot_date,
  coalesce(s.snapshot_rows, 0) as snapshot_rows,
  coalesce(b.latest_board_rows, 0) as latest_board_rows,
  coalesce(d.dynamic_rows, 0) as dynamic_rows,
  b.best_rank,
  b.worst_rank,
  case
    when coalesce(s.snapshot_rows, 0) > 0
     and coalesce(b.latest_board_rows, 0) > 0
     and coalesce(d.dynamic_rows, 0) > 0
      then 'READY_FOR_EXPOSURE'
    when coalesce(s.snapshot_rows, 0) > 0
     and coalesce(b.latest_board_rows, 0) = 0
      then 'SNAPSHOT_ONLY'
    when coalesce(s.snapshot_rows, 0) = 0
     and coalesce(d.dynamic_rows, 0) > 0
      then 'DYNAMIC_ONLY_CHECK'
    when coalesce(s.snapshot_rows, 0) = 0
     and coalesce(b.latest_board_rows, 0) = 0
     and coalesce(d.dynamic_rows, 0) = 0
      then 'NOT_READY'
    else 'CHECK_REQUIRED'
  end as readiness_status
from macro_registry r
left join snapshot_counts s on r.universe_code = s.universe_code
left join latest_board_counts b on r.universe_code = b.universe_code
left join dynamic_counts d on r.universe_code = d.universe_code
order by r.universe_code;