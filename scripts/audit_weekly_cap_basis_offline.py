"""Targeted diagnostic using accepted local inputs and the existing calculators.

No DB, network, environment, publication, or reference-package mutation.
Current household reconstruction is not evidence of the historical publication.
"""
from collections import defaultdict
from dataclasses import asdict
from datetime import date
from decimal import Decimal
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs/ranking-ux-20261016"
INPUT = ROOT / "outputs/complex-history-full-recovery-20261015"
TARGETS = {5084, 5037, 5010, 4699, 4360, 4251, 172841, 140196}


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main():
    recovery_path = ROOT / "scripts/recover_public_complex_history_offline.py"
    assert sha(recovery_path) == "2942C330F9FD324C3CCF26AC7550DE41D84843C030891F45822265AD2FAF0703"
    recovery = load("ranking_existing_recovery", recovery_path)
    for path, expected in recovery.PINS.items():
        assert sha(path) == expected, path.name
    audit = read(INPUT / "recovery-audit.json")
    assert sha(INPUT / "metadata.json") == "E33FDAF5867E9F71F8E368B7033A0742E10E71D49B76BC433DBA9F1DD9E24906"
    metadata = recovery.validate_metadata(read(INPUT / "metadata.json"))
    captured, pairs, seen_ids, seen_raw = {}, defaultdict(list), set(), set()
    # Only 2025/2026 can enter these two rolling 12-month windows. The already
    # consumed 2023 reconnection does not need to be replayed or loaded.
    for year in (2025, 2026):
        path = INPUT / f"trades-{year}.json"
        assert sha(path) == audit["input_identities"][str(path.relative_to(ROOT))]["sha256"]
        payload = read(path)
        recovery.append_trade_input(payload, metadata, pairs, seen_ids, seen_raw, "current_canonical")
        captured.update((row[0], tuple(row)) for row in payload["rows"])
    current, legacy = INPUT / "approved-current-trades.json", INPUT / "approved-legacy-trades.json"
    assert sha(current) == recovery.ACCEPTED_CURRENT_SHA256 and sha(legacy) == recovery.LEGACY_SHA256
    recovery.replace_current_input(read(current), captured, metadata, pairs)
    recovery.append_trade_input(read(legacy), metadata, pairs, seen_ids, seen_raw, "accepted_legacy")
    holds = defaultdict(list)
    with recovery.GUARD_GROUPS.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["reconciliation_class"].startswith("HOLD_"):
                holds[int(row["complex_id"])].append(row["reconciliation_class"])
    verifier = load("ranking_existing_verifier", recovery.VERIFIER)
    loader = load("ranking_existing_calculator", recovery.LOADER)
    producer = loader.load_market_writer_offline()
    totals = {row["complex_id"]: row for row in read(OUT / "published-totals.json")["rows"]}
    results = []
    for cid in sorted(TARGETS):
        row = metadata[cid]
        excluded = recovery.household_exclusions(row, holds)
        snapshots = []
        for day in ("2026-08-24", "2026-08-31"):
            components = []
            for cluster, hh in row["current_households"].items():
                trades = sorted(pairs.get((cid, cluster), []), key=lambda t: (t[0], t[1]))
                count, top3 = recovery.select_window(trades, [(t[0], t[1]) for t in trades], day)
                price = int((sum((Decimal(t[2]) for t in top3), Decimal(0)) / Decimal(3)).quantize(Decimal(1), rounding=verifier.ROUND_HALF_UP)) if len(top3) == 3 else None
                verifier.verify_current_price({"snapshot_date": day, "trade_count": count, "current_price": price,
                    "top3": [{"trade_id": t[1], "contract_date": t[0], "price_krw": t[2]} for t in top3]})
                components.append(producer.ComponentRow(snapshot_date=date.fromisoformat(day), complex_id=cid, area_cluster_id=cluster,
                    apt_name_ko=row["apt_name_ko"], area_cluster_label=str(cluster), household_count=hh, representative_price_krw=price,
                    cluster_market_cap_krw=price * hh if price is not None else None, component_status="priced" if price is not None else "unpriced",
                    calculation_version="v1", coverage_note=None if price is not None else "missing_price_snapshot", price_method="last3_avg_12m" if price is not None else None))
            caps, eligibility = producer.aggregate_market_caps(components, recovery.REQUIRED_RATIO, recovery.FULL_RATIO)
            assert len(caps) == len(eligibility) == 1
            snapshots.append({"date": day, "cap": asdict(caps[0]), "eligible": eligibility[0].is_rank_eligible})
        results.append({"complex_id": cid, "name": row["apt_name_ko"], "household_holds": excluded, "published": totals[cid],
            "reference_reconstruction": snapshots, "matches_current_public_total": snapshots[1]["cap"]["market_cap_krw"] == totals[cid]["current_cap"],
            "matches_previous_public_total": snapshots[0]["cap"]["market_cap_krw"] == totals[cid]["previous_cap"]})
    output = {"status": "OFFLINE_DIAGNOSTIC_NOT_HISTORICAL_PUBLICATION_PROOF", "source": "existing_accepted_history_inputs_and_calculators",
        "current_households_reused_for_both_dates": True, "db_writes": 0, "publication_changes": 0, "results": results}
    (OUT / "weekly-basis-audit.json").write_text(json.dumps(output, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps({"audited": len(results), "current_matches": sum(r["matches_current_public_total"] for r in results),
        "previous_matches": sum(r["matches_previous_public_total"] for r in results), "household_holds": sum(bool(r["household_holds"]) for r in results), "db_writes": 0}))


if __name__ == "__main__":
    main()
