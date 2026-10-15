"""Extend two reference histories using the exact approved, committed 111 trades.

Offline projection only: reuse the existing window, price verifier, household
guards and market-cap calculator. No database, credentials or network access.
The immutable parent is the already deployed Git asset, never a mutable output.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal
import copy
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/lib/koaptix/data/complex-history-reference-20261015.json"
INPUT = ROOT / "outputs/complex-history-full-recovery-20261015"
NEW_INPUT = ROOT / "outputs/source111-approved-clean-input-20261015.json"
HOUSEHOLDS = ROOT / "outputs/source111-household-proof-20261015.json"
TARGETS = {168421, 168423}
SCOPE = "85B57D4A103FAE857F268A51E70E5BAB1BF73B0365F31D5E290E1B9C0BE24D57"
PINS = {
    NEW_INPUT: "8879B82707863266575EEAB12331F25508A2940C346316849A2B34FF6287E329",
    HOUSEHOLDS: "CC9197D30F4E687288735CF25C6DF53B07285C86A6C543CA2E04DD09B270E1EE",
    INPUT / "metadata.json": "E33FDAF5867E9F71F8E368B7033A0742E10E71D49B76BC433DBA9F1DD9E24906",
    INPUT / "approved-current-trades.json": "0B0D487B90C439C4C7323B7C2FC40B45FC8AA1984E05ACA5F3081E856495EE6E",
    ROOT / "scripts/recover_public_complex_history_offline.py": "2942C330F9FD324C3CCF26AC7550DE41D84843C030891F45822265AD2FAF0703",
    ROOT / "scripts/verify_complex_history_sample_offline.py": "20C2C3F3E79707A85855C9CA5E5FDA47B41FDAC6ACB19CBB82123E852E2DB1BF",
    ROOT / "scripts/project_korea_all_calculations_readonly.py": "90AF6A71C690409B2FB8AC127A0999589A87E503491E8AEDC7BE76CC488D5A71",
    ROOT / "outputs/korea_all_household_guard_manifest_readonly_v3/groups.csv": "F9A331BD2D5B5A0095CE9450FD873D2F4544BB40A91AFD87E0B744E7D8D711D7",
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest().upper()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main():
    for path, expected in PINS.items():
        assert sha(path.read_bytes()) == expected, path.name
    parent_raw = subprocess.run(
        ["git", "show", "2f039438c3246bc78234e1f00884683af25b388a:src/lib/koaptix/data/complex-history-reference-20261015.json"],
        cwd=ROOT, check=True, capture_output=True,
    ).stdout
    assert sha(parent_raw) == "5CE42D84E585ED695165AA639B6783FCFA904F872D87A20E4426753A084FE58A"
    parent = json.loads(parent_raw)
    new = json.loads(NEW_INPUT.read_bytes())
    current = json.loads((INPUT / "approved-current-trades.json").read_bytes())
    live = json.loads(HOUSEHOLDS.read_bytes())
    receipt = json.loads((ROOT / "outputs/source111-execution-receipt-20261015.json").read_bytes())
    assert receipt["status"] == "PASS_COMMITTED_AND_SEPARATELY_READONLY_VERIFIED"
    assert receipt["approvedScopeDigest"] == new["approved_scope_digest"] == SCOPE
    assert receipt["verification"]["logical_mismatches"] == 0
    assert new["status"] == "EXACT_COMMITTED_APPROVED_SOURCE111_INPUT" and len(new["rows"]) == 111
    columns = ["trade_id", "trade_raw_id", "complex_id", "area_cluster_id", "contract_date", "price_krw"]
    assert new["columns"] == current["columns"] == columns
    assert len({r[0] for r in new["rows"]}) == len({r[1] for r in new["rows"]}) == 111
    assert all("2023-01-01" <= r[4] <= "2023-12-31" for r in new["rows"])
    recovery = load("extension_existing_recovery", ROOT / "scripts/recover_public_complex_history_offline.py")
    verifier = load("extension_existing_verifier", ROOT / "scripts/verify_complex_history_sample_offline.py")
    loader = load("extension_existing_loader", ROOT / "scripts/project_korea_all_calculations_readonly.py")
    producer = loader.load_market_writer_offline()
    assert sha(recovery.PRODUCER.read_bytes()) == recovery.PINS[recovery.PRODUCER]
    metadata = recovery.validate_metadata(json.loads((INPUT / "metadata.json").read_bytes()))
    holds = defaultdict(list)
    with recovery.GUARD_GROUPS.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["reconciliation_class"].startswith("HOLD_"):
                holds[int(row["complex_id"])].append(row["reconciliation_class"])
    for cid in TARGETS:
        assert recovery.household_exclusions(metadata[cid], holds) == []
        h = [[r["area_cluster_id"], r["household_count"], r["source_system"], r["source_version"]]
             for r in live["households"] if r["complex_id"] == cid]
        assert h == metadata[cid]["households"]
        master = next(r for r in live["masters"] if r["complex_id"] == cid)
        assert master["is_active"] and master["merged_into_complex_id"] is None
        assert master["total_household_count"] == metadata[cid]["master_households"]
        anchor = next(r for r in new["existing_public_anchors"] if r["complex_id"] == cid)
        assert anchor["generation_id"] == parent["source"]["generationId"]
        assert anchor["publication_version"] == parent["source"]["publicationVersion"]
        assert anchor["market_cap_krw"] == parent["series"][str(cid)][-1]
    dates = parent["dates"]

    def calculate(rows):
        pairs = defaultdict(list)
        for tid, raw_id, cid, cluster, day, price in rows:
            if cid in TARGETS:
                pairs[(cid, cluster)].append((day, tid, price, "exact-committed-input"))
        for values in pairs.values():
            values.sort()
        result = {str(cid): [] for cid in TARGETS}
        for day in dates:
            components = []
            for cid in TARGETS:
                for cluster, hh in metadata[cid]["current_households"].items():
                    trades = pairs[(cid, cluster)]
                    count, top3 = recovery.select_window(trades, [(t[0], t[1]) for t in trades], day)
                    price = int((sum((Decimal(t[2]) for t in top3), Decimal(0)) / Decimal(3))
                                .quantize(Decimal(1), rounding=verifier.ROUND_HALF_UP)) if len(top3) == 3 else None
                    verifier.verify_current_price({"snapshot_date": day, "trade_count": count,
                        "top3": [{"contract_date": t[0], "trade_id": t[1], "price_krw": t[2]} for t in top3], "current_price": price})
                    components.append(producer.ComponentRow(snapshot_date=date.fromisoformat(day),
                        complex_id=cid, area_cluster_id=cluster, apt_name_ko=metadata[cid]["apt_name_ko"],
                        area_cluster_label=str(cluster), household_count=hh, representative_price_krw=price,
                        cluster_market_cap_krw=price * hh if price is not None else None,
                        component_status="priced" if price is not None else "unpriced", calculation_version="v1",
                        coverage_note=None if price is not None else "missing_price_snapshot",
                        price_method="last3_avg_12m" if price is not None else None))
            market, eligible = producer.aggregate_market_caps(components, recovery.REQUIRED_RATIO, recovery.FULL_RATIO)
            eligible = {r.complex_id: r.is_rank_eligible for r in eligible}
            for row in market:
                admitted = row.coverage_status == "full" and eligible[row.complex_id] and (row.market_cap_krw or 0) > 0
                result[str(row.complex_id)].append(row.market_cap_krw if admitted else None)
        return result

    old = calculate(current["rows"])
    assert all(old[str(cid)] == parent["series"][str(cid)] for cid in TARGETS), "Existing source reproduction failed"
    added = [r for r in new["rows"] if r[2] in TARGETS]
    assert len(added) == 101
    extended = calculate(current["rows"] + added)
    package = copy.deepcopy(parent)
    changes = []
    for cid in sorted(TARGETS):
        key = str(cid)
        for index, (before, after) in enumerate(zip(old[key], extended[key])):
            if before == after:
                continue
            assert before is None and type(after) is int and after > 0
            changes.append({"complex_id": cid, "snapshot_date": dates[index], "market_cap_krw": after})
        assert extended[key][-1] == parent["series"][key][-1]
        package["series"][key] = extended[key]
    assert len(changes) == 14
    assert all(package["series"][key] == value for key, value in parent["series"].items() if int(key) not in TARGETS)
    proof = {"parentPackageSha256": sha(parent_raw), "committedInputSha256": PINS[NEW_INPUT],
             "householdProofSha256": PINS[HOUSEHOLDS], "approvalScopeDigest": SCOPE,
             "projectorSha256": sha(Path(__file__).read_bytes()), "changedComplexIds": sorted(TARGETS),
             "addedPoints": changes, "changedExistingPositivePoints": 0, "changedOtherComplexes": 0}
    source_key = "current-canonical-reconstruction:" + hashlib.sha256(json.dumps(proof, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    package["source"]["sourceKey"] = source_key
    package["source"]["sourceObservedAt"] = live["observed_at"]
    package["provenance"]["committedExtension"] = proof
    package["provenance"]["sourceFamilies"].append({"key": "approved-committed-source111-2023",
        "tradeCount": 111, "appliedToTwoPublicComplexes": 101, "membership": new["status"], "inputSha256": PINS[NEW_INPUT]})
    package["counts"]["positivePoints"] += len(changes)
    assert package["counts"] == {"complexes": 3158, "positivePoints": 28453}
    raw = (json.dumps(package, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf8")
    OUTPUT.write_bytes(raw)
    proof.update({"status": "VERIFIED_LOCAL_REFERENCE_EXTENSION", "sourceKey": source_key,
                  "packageSha256": sha(raw), "canonicalSha256": sha(raw[:-1]), "dbWritesByProjector": 0})
    (ROOT / "outputs/source111-chart-extension-20261015.json").write_bytes((json.dumps(proof, ensure_ascii=False, indent=2) + "\n").encode("utf8"))
    print(json.dumps(proof, ensure_ascii=True))


if __name__ == "__main__":
    main()
