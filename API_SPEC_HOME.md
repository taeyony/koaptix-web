# KOAPTIX Home API Spec

## Endpoint
`GET /api/home`

Next.js App Router의 Route Handler입니다.

## Query Parameters
- `topN` (optional, integer, default `50`, min `1`, max `50`)
- `chartPoints` (optional, integer, default `12`, min `3`, max `36`)

## Response 200
```json
{
  "ok": true,
  "data": {
    "indexCard": {
      "snapshot_date": "2025-01-31",
      "index_code": "KOAPTIX_SEOUL",
      "universe_code": "SEOUL_ALL",
      "index_name": "KOAPTIX 서울",
      "base_date": "2024-07-31",
      "base_value": 1000,
      "index_value": 1084.2331,
      "prev_month_snapshot_date": "2024-12-31",
      "prev_month_index_value": 1072.5223,
      "change_1m": 11.7108,
      "change_pct_1m": 1.0919,
      "movement_1m": "up",
      "base_market_cap_krw": 432100000000000,
      "total_market_cap_krw": 468767984455483,
      "prev_month_total_market_cap_krw": 463718123000000,
      "market_cap_change_1m": 5049861455483,
      "market_cap_change_pct_1m": 1.0889,
      "component_complex_count": 501
    },
    "chart": [
      {
        "snapshot_date": "2024-07-31",
        "index_value": 1000,
        "change_1m": null,
        "change_pct_1m": null,
        "total_market_cap_krw": 432100000000000,
        "component_complex_count": 479
      }
    ],
    "topRanks": [
      {
        "rank_all": 1,
        "tier_code": "S",
        "tier_label": "S-tier",
        "complex_id": 4216,
        "apt_name_ko": "반포자이",
        "sigungu_name": "서초구",
        "legal_dong_name": "반포동",
        "address_road": "신반포로 219",
        "address_jibun": "반포동 20-43",
        "market_cap_krw": 15746987666765,
        "market_cap_trillion_krw": 15.7469,
        "market_cap_share_pct": 3.3592,
        "previous_rank_all": 1,
        "rank_delta_1d": 0,
        "rank_movement": "same",
        "priced_household_ratio": 0.82,
        "coverage_status": "good"
      }
    ],
    "topN": 50,
    "chartPoints": 12,
    "top50Count": 50,
    "totalRankedComplexes": 501,
    "fetchedAt": "2026-03-19T12:34:56.000Z"
  }
}
```

## Response 400
```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "topN must be between 1 and 50"
  }
}
```

## Response 500
```json
{
  "ok": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to load KOAPTIX home payload"
  }
}
```

## Cache
권장 응답 헤더:
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`

## Notes
- 이 API는 `v_koaptix_home_seoul_latest_payload` 한 줄을 읽어 응답을 만듭니다.
- `topN`, `chartPoints`는 서버에서 slice 처리합니다.
- 브라우저에서는 Supabase service role을 직접 쓰지 않습니다.
