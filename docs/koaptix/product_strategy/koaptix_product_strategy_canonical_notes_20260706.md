# KOAPTIX Product Strategy Canonical Notes

Review marker: `P-KOAPTIX-PRODUCT-STRATEGY-CANONICAL-NOTES-DOCS-PATCH.0`

Status: `STRATEGY_NOTE_ONLY_NOT_IMPLEMENTED`

## One-Line Conclusion

KOAPTIX는 전국 권위 보드인 `KOAPTIX 1000 / KOREA_ALL`을 인위적으로 지역 균형화하지 않고, 지역 보드와 미랭킹 단지 발견은 별도 승인과 품질 게이트를 거쳐 추가하는 ranking-first 제품이다.

## Why This Note Exists

이 문서는 향후 CTO 검토, Codex 작업 지시, 제품 의사결정에서 반복적으로 헷갈릴 수 있는 KOAPTIX의 전략 원칙을 한곳에 고정하기 위한 문서다.

이 문서는 구현 승인서가 아니다. 이 lane에서는 코드, DB, API, registry, ranking methodology, source-of-truth, 배포를 변경하지 않는다.

## Current Completed Context

- KOAPTIX는 전국 아파트 capital-flow ranking terminal이다.
- 서비스는 ranking-first 제품이며, 검색은 보조 탐색 경로다.
- `KOAPTIX 500`은 대표 메인 보드이고, `KOAPTIX 1000`은 더 넓은 공개 랭킹 보드다.
- Soft Public Beta 공개 문구는 구현되어 production-visible 상태로 확인되었다.
- 지역 ranking/index와 Unranked Complex Discovery는 아직 구현되지 않았다.
- KOAPTIX Ranking과 KOAPTIX Index는 공개 문구와 제품 설명에서 섞지 않는다.
- rank source-of-truth chain은 `koaptix_rank_snapshot -> v_koaptix_universe_rank_history_dynamic -> v_koaptix_latest_universe_rank_board_u`다.
- `public.koaptix_latest_board_read_model`은 파생 serving cache이며 rank source of truth가 아니다.

## Canonical Strategic Principles

### 1. National Authority Board

`KOAPTIX 1000 / KOREA_ALL`은 전국 권위 보드다.

이 보드는 전국 아파트 자본 집중도를 보여준다. 자본 집중이 서울과 경기권에 있다면 보드도 자연스럽게 서울과 경기권으로 기울 수 있다. 이 편향은 제품 결함이 아니라 전국 자본 집중의 결과다.

따라서 `KOREA_ALL` 또는 `KOAPTIX 1000`을 인위적으로 지역 균형화하지 않는다. 전국 보드를 지역별 할당제로 보정하면 전국 랭킹에 대한 신뢰가 약해진다.

### 2. Regional Traffic Boards

지역 ranking/index 화면은 `KOREA_ALL`을 대체하는 것이 아니라 추가 traffic board다.

지역 보드는 전국 TOP1000을 필터링한 조각으로 취급하지 않는다. 각 지역 universe는 자기 universe 안에서 별도로 re-ranking되어야 한다. 예를 들어 특정 광역시, 도, SGG 보드는 해당 universe의 조건과 품질 게이트를 통과한 단지를 그 안에서 다시 순위화해야 한다.

Regional KOAPTIX Index는 개별 단지 순위가 아니라 지역 시장의 aggregate signal로 설명해야 한다. 개별 apartment ranking과 regional market index는 서로 다른 제품 표면이다.

주요 광역시와 도 단위 universe는 데이터 품질이 허용되는 범위에서 local ranking과 local index를 제공할 수 있다. 다만 이것은 `KOREA_ALL`의 대체물이 아니라 추가 표면이다.

### 3. SGG Long-Tail Boards

SGG universe는 long-tail local board다.

SGG 보드는 검색 트래픽, 지역 비교, 우리 동네 발견 경험을 돕는다. 하지만 SGG 노출은 registry와 governance로 통제되어야 한다. SGG 보드는 `universe_code` contract를 따르고, 각 universe 안에서 re-ranking되어야 한다.

SGG 보드는 snapshot/latest-board readiness gate를 우회하지 않는다. membership만으로 보드가 public-ready라고 추론하지 않는다.

### 4. Unranked Complex Discovery

Unranked Complex Discovery는 미래의 search trust layer이며 rank expansion이 아니다.

검색 노출과 랭킹 포함은 분리한다. TOP1000 밖에 있는 단지를 랭킹에 억지로 포함하지 않는다. 대표 가격, 세대수, estimated market cap, eligibility, data-quality 기준을 낮춰 더 많은 단지를 랭킹에 넣지 않는다.

향후 governed audit이 안전한 공개 분류를 확인한 경우에만, known but unranked complex는 다음과 같은 식으로 표시할 수 있다.

> 확인된 단지이나 현재 랭킹 산정 대상 아님

source-only 또는 unverified complex는 public exposure 전에 별도 review가 필요하다.

## Discovery State Model

### Ranked Complex

KOAPTIX rank, estimated market cap, detail surface를 제공할 수 있는 상태다. 랭킹 source-of-truth chain과 품질 조건을 통과해야 한다.

### Known But Unranked Complex

canonical/public source evidence는 있으나 KOAPTIX ranking 조건을 만족하지 못한 상태다. 이 상태는 검색 신뢰 계층에서 다룰 수 있지만, 랭킹 포함과 동일하지 않다.

### Source-Only / Unverified Complex

source record는 있으나 canonical matching 또는 public confidence가 부족한 상태다. public exposure 전에 검토가 필요하다.

## What This Note Does Not Approve

이 문서는 다음을 승인하지 않는다.

- 지역 ranking/index 구현
- Unranked Complex Discovery 구현
- DB 연결, SQL, DDL, DML, data write
- helper, materializer, refresh, import 실행
- API route, `src/lib/koaptix`, package, env, migration, registry 변경
- rank methodology 변경
- source-of-truth chain 변경
- commit, push, deploy

모든 구현, DB 작업, 공개 노출, registry 변경은 별도 lane과 별도 승인이 필요하다.

## Future Audit Lanes

### `P-KOAPTIX-REGIONAL-RANKING-INDEX-COVERAGE-AUDIT.0`

목적: `KOREA_ALL`을 변경하거나 데이터 게이트를 약화하지 않고, 광역시/도 및 SGG ranking/index surface를 어디까지 안전하게 제공할 수 있는지 감사한다.

### `P-KOAPTIX-UNRANKED-COMPLEX-DISCOVERY-COVERAGE-AUDIT.0`

목적: TOP1000 또는 ranking-visible 밖의 단지를 `apt_complex`, trade source, canonical mapping, public source evidence 기반으로 discovery candidate로 분류할 수 있는지 감사한다.

## Do-Not-Run / Do-Not-Implement List

- `KOREA_ALL / KOAPTIX 1000`을 지역 균형화하지 않는다.
- ranking inclusion standard를 낮추지 않는다.
- search discovery를 rank eligibility로 취급하지 않는다.
- source-only/unverified complex를 review 없이 공개하지 않는다.
- `public.koaptix_latest_board_read_model`을 rank source of truth로 사용하지 않는다.
- `koaptix_rank_snapshot` 기반 source-of-truth chain을 우회하지 않는다.
- membership만으로 board readiness를 추론하지 않는다.
- sealed wrapper를 되살리지 않는다.
- strategy note를 코드 변경으로 해석하지 않는다.

## Resume Point

다음 작업자는 이 문서를 구현 지시가 아니라 전략 기준선으로 읽어야 한다. 제품 확장은 `KOREA_ALL` 전국 권위 보드를 보존한 상태에서 additive universe, governed registry, readiness gate, source-of-truth chain을 지키며 별도 audit lane으로 진행한다.
