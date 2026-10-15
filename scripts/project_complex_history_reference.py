"""Project the verified local review to a small server-only reference candidate.

No calculation, database, network, credential, or publication action occurs here.
Input identities bind this projection to the reviewed 2026-10-15 cohort.
"""
from __future__ import annotations

import calendar
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs/complex-history-full-recovery-20261015"
OUTPUT = ROOT / "src/lib/koaptix/data/complex-history-reference-20261015.json"
PINS = {
    "chart-review.json": "1E63D34C2A3B049F9C714FC1BC4A6E02BB778D00CCF2470299FC33E7828E0071",
    "recovery-audit.json": "E89D405D6F1F95BC3FB8966E3E381E5A47937BBA2D967C935E7D32C23B28B309",
    "metadata.json": "E33FDAF5867E9F71F8E368B7033A0742E10E71D49B76BC433DBA9F1DD9E24906",
    "trades-2024.json": "F4F567AD07E3AF7D9AA3C90DD3AAE1AB8CD8A16C8B321889234E4200F9D3DA7F",
    "trades-2025.json": "C54CC17B7B729A82A7D003A4EA22A4A097DCAFDDEA3D0F6E280DFA507A92207D",
}
SOURCE_KEY = "current-canonical-reconstruction:9e448c800d33df7f165abc76c27d1d120ebfae8441adea99894903e616b53d69"
GENERATION = "733d03e6-e029-449b-a748-26c4b032df05"
SOURCE_NOTE = "현재 확인된 세대수와 가용 거래를 기준으로 재계산한 참고 이력이며, 당시 공표값이나 전국의 완전한 과거 이력이 아닙니다."


def checked_input(name: str) -> dict:
    raw = (INPUT / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest().upper() == PINS[name], name
    return json.loads(raw)


def main() -> None:
    review = checked_input("chart-review.json")
    audit = checked_input("recovery-audit.json")
    metadata = checked_input("metadata.json")
    dates = ["2024-01-01"] + [
        f"{year}-{month:02d}-{calendar.monthrange(year, month)[1]}"
        for year in (2024, 2025, 2026)
        for month in range(1, 13 if year < 2026 else 9)
    ]
    assert review["status"] == "LOCAL_REVIEW_ONLY"
    assert review["dates"] == dates and len(dates) == 33
    assert audit["sourceKey"] == SOURCE_KEY
    assert audit["anchor_comparison"] == {"exact": 3296, "different": 0}
    assert metadata["publication"] == [{"generation_id": GENERATION, "publication_version": 2}]
    anchors = {row["complex_id"]: row for row in metadata["complexes"]}
    audited = {row["complex_id"]: row for row in audit["complexes"]}
    series = {}
    positive_points = 0
    for key, candidate in sorted(review["series"].items(), key=lambda item: int(item[0])):
        if candidate["blockedReasons"]:
            continue
        rows = candidate["rows"]
        assert str(int(key)) == key and len(rows) == len(dates)
        values = []
        for date, row in zip(dates, rows):
            assert set(row) == {"snapshot_date", "complex_id", "market_cap_krw", "rank_all", "sourceKey"}, "Unexpected per-point source/segment boundary"
            assert row["snapshot_date"] == date and row["complex_id"] == int(key)
            assert row["rank_all"] is None and row["sourceKey"] == SOURCE_KEY
            cap = row["market_cap_krw"]
            assert cap is None or type(cap) is int and 0 < cap <= 9007199254740991
            values.append(cap)
        if not any(value is not None for value in values):
            continue
        anchor, proof = anchors[int(key)], audited[int(key)]
        assert proof["static_exclusion_reasons"] == []
        assert proof["anchor_matches_current_publication"] is True
        assert proof["admissible_points"] == sum(value is not None for value in values)
        assert anchor["published_date"] == dates[-1]
        assert values[-1] is not None and values[-1] == anchor["national_cap"]
        series[key] = values
        positive_points += proof["admissible_points"]
    assert len(series) == 3158 and positive_points == 28439

    # Bind the prior-source review to the exact captured ID set; this is an
    # identity/coverage receipt, not a claim of complete historical coverage.
    prior_ids = []
    for name in ("trades-2024.json", "trades-2025.json"):
        source = checked_input(name)
        assert source["columns"] == ["trade_id", "trade_raw_id", "complex_id", "area_cluster_id", "contract_date", "price_krw"]
        prior_ids.extend(row[0] for row in source["rows"] if "2024-01-01" <= row[4] < "2025-09-01")
    assert len(prior_ids) == len(set(prior_ids)) == 11625
    id_bytes = json.dumps(sorted(prior_ids), separators=(",", ":")).encode("ascii")
    prior_identity = {
        "count": len(prior_ids),
        "unique_trade_ids": len(set(prior_ids)),
        "sha256": hashlib.sha256(id_bytes).hexdigest().upper(),
        "serialization": "Ascending unique trade_id integers as compact ASCII JSON array, no trailing newline",
        "contract_dates": {"start_inclusive": "2024-01-01", "end_exclusive": "2025-09-01"},
        "input_sha256": {name: PINS[name] for name in ("trades-2024.json", "trades-2025.json")},
        "national_period_completeness_proven": False,
    }
    package = {
        "schemaVersion": 1,
        "status": "LOCAL_REFERENCE_CANDIDATE_NOT_DEPLOYMENT_APPROVAL",
        "source": {
            "sourceKey": SOURCE_KEY,
            "sourceObservedAt": review["sourceObservedAt"],
            "sourceNote": SOURCE_NOTE,
            "expectedPointCount": len(dates),
            "snapshotDate": dates[-1],
            "generationId": GENERATION,
            "publicationVersion": 2,
        },
        "provenance": {
            "reviewSha256": PINS["chart-review.json"],
            "auditSha256": PINS["recovery-audit.json"],
            "metadataSha256": PINS["metadata.json"],
            "sourceFamilies": [
                {"key": "accepted-legacy-2023", "tradeCount": 6225, "membership": "EXACT_ACCEPTED_LEGACY_PAYLOAD_MEMBERSHIP_VERIFIED", "inputSha256": "DC38B3807E6ED4A71D6A6FE27ABB02B5573E68E9CF025DF5C46FC568E4ECA472"},
                {"key": "prior-captured-2024-to-2025-08", "tradeCount": 11625, "tradeIdSetSha256": prior_identity["sha256"], "nationalPeriodCompletenessProven": False},
                {"key": "accepted-current-2025-09-to-2026-08", "tradeCount": 245386, "membership": "EXACT_ACCEPTED_CURRENT_COHORT_MEMBERSHIP_VERIFIED", "inputSha256": "0B0D487B90C439C4C7323B7C2FC40B45FC8AA1984E05ACA5F3081E856495EE6E"},
            ],
            "historicalPublication": False,
            "nationalHistoricalCompletenessProven": False,
        },
        "counts": {"complexes": len(series), "positivePoints": positive_points},
        "dates": dates,
        "series": series,
    }
    raw = (json.dumps(package, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(raw)
    receipt_path = INPUT / "prior-source-coverage-review.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    assert receipt["status"] == "READ_ONLY_SOURCE_IDENTITIES_MATCH_PERIOD_COMPLETENESS_NOT_PROVEN"
    assert sum(row["rows"] for row in receipt["prior_price_date_identity"]) == len(prior_ids)
    receipt["verified_trade_id_set"] = prior_identity
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT.relative_to(ROOT)), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest().upper(), "canonical_sha256": hashlib.sha256(raw[:-1]).hexdigest().upper(), "complexes": len(series), "positive_points": positive_points, "prior_id_set": prior_identity["sha256"]}))


if __name__ == "__main__":
    main()
