-- 목적:
-- BUSAN cold timeout의 근본 원인이 legacy 재의존 read path임을 제거하고,
-- snapshot 기반 universe read path로 정렬한 확정 view 정의 백업.
--
-- 결과:
-- BUSAN dynamic 50  : 약 11.54s -> 약 86ms
-- BUSAN latest 20   : 약 6.03s  -> 약 0.85s
--
-- 기준선:
-- koaptix_rank_snapshot
-- -> v_koaptix_universe_rank_history_dynamic
-- -> v_koaptix_latest_universe_rank_board_u
--
-- 주의:
-- dependent view 확인 후 exact replacement
-- DROP ... CASCADE는 마지막 수단
-- saved_label: 2026-04-09_busan_timeout_fix_final

-- v_koaptix_universe_rank_history_dynamic
create or replace view public.v_koaptix_universe_rank_history_dynamic as
<여기에 실제 정의 전문 전체>

-- v_koaptix_latest_universe_rank_board_u
create or replace view public.v_koaptix_latest_universe_rank_board_u as
<여기에 실제 정의 전문 전체>

-- v_koaptix_universe_market_cap_history_u
create or replace view public.v_koaptix_universe_market_cap_history_u as
<여기에 실제 정의 전문 전체>