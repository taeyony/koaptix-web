"""Recalculate a local reference from the exact approved committed source set.

Reuse the existing window selector, price verifier and market-cap calculator.
No database/network/credential access or publication action. The deployed parent
is immutable; all changed historical values belong to a new reference vintage.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime
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
OUT = ROOT / "outputs/history-full-reconnection-20261015"
INPUT = ROOT / "outputs/complex-history-full-recovery-20261015"
PACKAGE = ROOT / "src/lib/koaptix/data/complex-history-reference-20261015.json"
PARENT_COMMIT = "1d56dcb1e921ee2b822c2dfb37e4408853d81808"
PARENT_SHA = "0A924A9B8DA9A4D5666299853D39EE1BCED04BBEE4CB0EE89D040B07FE5B3647"
SCOPE = "77BEBF1C5AFC6E46379CB003C9FCB0A61B6FC60941677A82F73B81E96FB18EAD"


def sha(raw):
    return hashlib.sha256(raw).hexdigest().upper()


def read(path):
    return json.loads(path.read_bytes())


def save(name, value):
    path = OUT / name
    path.write_bytes((json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str) + "\n").encode("utf-8"))
    return sha(path.read_bytes())


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main():
    scope = read(OUT / "execution-scope.json")
    assert scope["scope_digest"] == SCOPE
    core = {k: v for k, v in scope.items() if k != "scope_digest"}
    assert sha(json.dumps(core, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()) == SCOPE
    receipt = read(OUT / "execution-receipt.json")
    assert receipt["approvedScopeDigest"] == SCOPE and receipt["executionAuthority"] == "CONSUMED"
    assert receipt["status"] in ("DB_PASS_CURRENT_PUBLICATION_PRESERVED_LOCAL_RECALC_PENDING", "PASS_COMMITTED_VERIFIED_AND_LOCAL_REFERENCE_RECALCULATED")
    assert receipt["attemptedWriteCalls"] == 16 and receipt["verifiedCommittedCleanRows"] == receipt["verifiedCommittedMatchRows"] == 55383
    assert all(r["status"] == "PASS_COMMITTED_AND_SEPARATELY_READONLY_VERIFIED" for r in receipt["batches"])
    before_db, after_db = read(OUT / "db-before-execution.json"), read(OUT / "db-after-execution.json")
    assert after_db["clean_rows"] - before_db["clean_rows"] == after_db["match_rows"] - before_db["match_rows"] == 55383
    assert before_db["national_public_identity_sha256"] == after_db["national_public_identity_sha256"]
    parent_raw = subprocess.run(["git", "show", PARENT_COMMIT + ":src/lib/koaptix/data/complex-history-reference-20261015.json"],
                                cwd=ROOT, capture_output=True, check=True).stdout
    assert sha(parent_raw) == PARENT_SHA
    parent = json.loads(parent_raw)
    archive = OUT / "parent-reference.json"
    if archive.exists():
        assert archive.read_bytes() == parent_raw
    else:
        archive.write_bytes(parent_raw)
    recovery = load("full_reference_existing_recovery", ROOT / "scripts/recover_public_complex_history_offline.py")
    assert sha(Path(recovery.__file__).read_bytes()) == "2942C330F9FD324C3CCF26AC7550DE41D84843C030891F45822265AD2FAF0703"
    for path, expected in recovery.PINS.items():
        assert sha(path.read_bytes()) == expected, path.name
    audit = read(INPUT / "recovery-audit.json")
    assert sha((INPUT / "recovery-audit.json").read_bytes()) == "E89D405D6F1F95BC3FB8966E3E381E5A47937BBA2D967C935E7D32C23B28B309"
    assert sha((INPUT / "metadata.json").read_bytes()) == "E33FDAF5867E9F71F8E368B7033A0742E10E71D49B76BC433DBA9F1DD9E24906"
    metadata = recovery.validate_metadata(read(INPUT / "metadata.json"))
    pairs, seen_ids, seen_raw, captured = defaultdict(list), set(), set(), {}
    for year in range(2023, 2027):
        path = INPUT / f"trades-{year}.json"
        assert sha(path.read_bytes()) == audit["input_identities"][str(path.relative_to(ROOT))]["sha256"]
        payload = read(path)
        recovery.append_trade_input(payload, metadata, pairs, seen_ids, seen_raw, "current_canonical")
        captured.update((r[0], tuple(r)) for r in payload["rows"] or [])
    current, legacy = read(INPUT / "approved-current-trades.json"), read(INPUT / "approved-legacy-trades.json")
    assert sha((INPUT / "approved-current-trades.json").read_bytes()) == recovery.ACCEPTED_CURRENT_SHA256
    assert sha((INPUT / "approved-legacy-trades.json").read_bytes()) == recovery.LEGACY_SHA256
    recovery.replace_current_input(current, captured, metadata, pairs)
    recovery.append_trade_input(legacy, metadata, pairs, seen_ids, seen_raw, "accepted_legacy")
    old_extension = ROOT / "outputs/source111-approved-clean-input-20261015.json"
    assert sha(old_extension.read_bytes()) == "8879B82707863266575EEAB12331F25508A2940C346316849A2B34FF6287E329"
    for tid, rid, cid, cluster, day, price in read(old_extension)["rows"]:
        assert tid not in seen_ids and rid not in seen_raw
        seen_ids.add(tid); seen_raw.add(rid)
        pairs[(cid, cluster)].append((day, tid, price, "approved_committed_source111"))

    new_rows, new_ids, new_raw, match_ids, identities, observed = [], set(), set(), set(), {}, []
    for batch in scope["batches"]:
        path = OUT / f"committed-input-{batch['number']:02d}.json"
        data = read(path)
        assert data["status"] == "EXACT_COMMITTED_APPROVED_FULL_HISTORY_RECONNECTION_INPUT" and data["approved_scope_digest"] == SCOPE
        assert data["columns"] == ["trade_id", "trade_raw_id", "complex_id", "area_cluster_id", "contract_date", "price_krw", "trade_match_id"]
        assert data["captured_rows"] == data["exact_logical_rows"] == data["unique_clean_ids"] == len(data["rows"]) == batch["insert_clean_rows"]
        identities[path.name] = sha(path.read_bytes())
        observed.append(data["observed_at"])
        for tid, rid, cid, cluster, day, price, mid in data["rows"]:
            assert all(type(x) is int and x > 0 for x in (tid, rid, cid, cluster, price, mid))
            assert tid not in seen_ids and tid not in new_ids
            assert rid not in seen_raw and rid not in new_raw and mid not in match_ids
            assert "2023-01-01" <= day <= "2023-12-31" and str(cid) in parent["series"]
            new_ids.add(tid); new_raw.add(rid); match_ids.add(mid)
            new_rows.append([tid, rid, cid, cluster, day, price])
    assert len(new_rows) == len(new_ids) == len(new_raw) == len(match_ids) == 55383
    proposed = read(OUT / "proposed-reconnection-payload.json")
    assert sha((OUT / "proposed-reconnection-payload.json").read_bytes()) == scope["payload_sha256"]
    expected = {r["source"]["trade_raw_id"]: r["source"] for r in proposed["rows"]}
    assert set(expected) == new_raw
    for tid, rid, cid, cluster, day, price in new_rows:
        r = expected[rid]
        assert (cid, cluster, day, price) == (r["candidate_complex_id"], r["candidate_area_cluster_id"], r["contract_date"], r["price_krw"])
    targets = {r[2] for r in new_rows}
    assert len(targets) == 2457
    holds = defaultdict(list)
    with recovery.GUARD_GROUPS.open(encoding="utf-8-sig", newline="") as handle:
        for r in csv.DictReader(handle):
            if r["reconciliation_class"].startswith("HOLD_"):
                holds[int(r["complex_id"])].append(r["reconciliation_class"])
    assert all(recovery.household_exclusions(metadata[cid], holds) == [] for cid in targets)
    for rows in pairs.values():
        rows.sort(key=lambda r: (r[0], r[1]))
    verifier = load("full_reference_existing_price_verifier", recovery.VERIFIER)
    loader = load("full_reference_existing_calculator_loader", recovery.LOADER)
    producer = loader.load_market_writer_offline()
    affected_indexes = [i for i, day in enumerate(parent["dates"]) if recovery.window_floor(day) < "2023-12-31"]
    assert len(affected_indexes) == 12

    def calculate(by_pair):
        keys = {pair: [(r[0], r[1]) for r in rows] for pair, rows in by_pair.items()}
        result = {cid: [] for cid in targets}
        for index in affected_indexes:
            day = parent["dates"][index]
            components = []
            for cid in targets:
                for cluster, hh in metadata[cid]["current_households"].items():
                    values = by_pair.get((cid, cluster), [])
                    count, top3 = recovery.select_window(values, keys.get((cid, cluster), []), day)
                    price = int((sum((Decimal(t[2]) for t in top3), Decimal(0)) / Decimal(3))
                              .quantize(Decimal(1), rounding=verifier.ROUND_HALF_UP)) if len(top3) == 3 else None
                    verifier.verify_current_price({"snapshot_date": day, "trade_count": count,
                        "top3": [{"trade_id": t[1], "contract_date": t[0], "price_krw": t[2]} for t in top3], "current_price": price})
                    components.append(producer.ComponentRow(snapshot_date=date.fromisoformat(day), complex_id=cid,
                        area_cluster_id=cluster, apt_name_ko=metadata[cid]["apt_name_ko"], area_cluster_label=str(cluster),
                        household_count=hh, representative_price_krw=price, cluster_market_cap_krw=price * hh if price is not None else None,
                        component_status="priced" if price is not None else "unpriced", calculation_version="v1",
                        coverage_note=None if price is not None else "missing_price_snapshot", price_method="last3_avg_12m" if price is not None else None))
            market, eligibility = producer.aggregate_market_caps(components, recovery.REQUIRED_RATIO, recovery.FULL_RATIO)
            eligible = {r.complex_id: r.is_rank_eligible for r in eligibility}
            for row in market:
                valid = row.coverage_status == "full" and eligible[row.complex_id] and (row.market_cap_krw or 0) > 0
                if metadata[row.complex_id]["approval_date"] and day < metadata[row.complex_id]["approval_date"][:10]:
                    valid = False
                result[row.complex_id].append(row.market_cap_krw if valid else None)
        return result

    before = calculate(pairs)
    for cid in targets:
        assert before[cid] == [parent["series"][str(cid)][i] for i in affected_indexes], f"Parent reproduction failed: {cid}"
    for tid, rid, cid, cluster, day, price in new_rows:
        pairs[(cid, cluster)].append((day, tid, price, "approved_committed_full_history"))
    for values in pairs.values():
        values.sort(key=lambda r: (r[0], r[1]))
    after = calculate(pairs)
    package, changes, changed_ids = copy.deepcopy(parent), [], []
    for cid in sorted(targets):
        key = str(cid)
        changed = False
        for j, index in enumerate(affected_indexes):
            old, new = parent["series"][key][index], after[cid][j]
            assert old is None or new is not None, "A verified point became missing"
            if old != new:
                changes.append({"complex_id": cid, "snapshot_date": parent["dates"][index], "before": old, "after": new,
                                "kind": "FILLED_MISSING_POINT" if old is None else "RECALCULATED_REFERENCE_VALUE"})
                changed = True
            package["series"][key][index] = new
        if changed:
            changed_ids.append(cid)
    assert all(package["series"][key] == values for key, values in parent["series"].items() if int(key) not in targets)
    assert all(package["series"][key][12:] == values[12:] for key, values in parent["series"].items())
    assert all(package["series"][key][-1] == metadata[int(key)]["national_cap"] for key in package["series"])
    added = sum(r["kind"] == "FILLED_MISSING_POINT" for r in changes)
    revised = sum(r["kind"] == "RECALCULATED_REFERENCE_VALUE" for r in changes)
    assert added == 12728
    positive = sum(v is not None for values in package["series"].values() for v in values)
    assert positive == 41181
    unchanged = {key: values for key, values in parent["series"].items() if int(key) not in changed_ids}
    # Use numeric ID order so the digest also matches JavaScript JSON.stringify.
    unchanged_hash = sha(json.dumps(unchanged, ensure_ascii=False, separators=(",", ":")).encode())
    proof = {"approvalScopeDigest": SCOPE, "parentPackageSha256": PARENT_SHA, "committedInputSha256": identities,
        "projectorSha256": sha(Path(__file__).read_bytes()), "targetComplexes": len(targets), "committedTrades": len(new_rows),
        "changedComplexIds": changed_ids, "addedPoints": added, "recalculatedExistingReferencePoints": revised,
        "currentAnchorChanges": 0, "changedOutsideTargetComplexes": 0, "unchangedSeriesSha256": unchanged_hash,
        "datesAfter2024NovemberUnchanged": True, "historicalPublicationAmended": False, "officialIndexGenesisHoldPreserved": True}
    source_key = "current-canonical-reconstruction:" + hashlib.sha256(json.dumps(proof, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    observed_at = max(observed, key=lambda v: datetime.fromisoformat(v.replace("Z", "+00:00")))
    package["source"]["sourceKey"] = source_key
    package["source"]["sourceObservedAt"] = observed_at
    package["provenance"]["committedHistoryRecovery"] = proof
    package["provenance"]["sourceFamilies"].append({"key": "approved-committed-full-history-2023", "tradeCount": 55383,
        "approvalScopeDigest": SCOPE, "membership": "EXACT_COMMITTED_AND_SEPARATELY_VERIFIED", "inputIdentities": identities})
    package["counts"]["positivePoints"] = positive
    output_raw = (json.dumps(package, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    PACKAGE.write_bytes(output_raw)
    save("local-recalculation-changes.json", {"status": "LOCAL_REFERENCE_RECALCULATED_NOT_DEPLOYED", "changes": changes})
    summary = {"status": "PASS_COMMITTED_INPUT_LOCAL_RECALCULATION_NOT_DEPLOYED", "scopeDigest": SCOPE,
        "sourceKey": source_key, "sourceObservedAt": observed_at, "packageSha256": sha(output_raw), "parentSha256": PARENT_SHA,
        "complexes": len(package["series"]), "changedComplexes": len(changed_ids), "addedPoints": added,
        "recalculatedExistingReferencePoints": revised, "positivePoints": positive,
        "remainingNullPoints": len(package["series"]) * 33 - positive,
        "baselineComplexes": sum(values[0] is not None for values in package["series"].values()),
        "complete33DateComplexes": sum(all(v is not None for v in values) for values in package["series"].values()),
        "currentAnchorChanges": 0, "unchangedAfter2024November": True, "dbWritesByProjector": 0, "deployments": 0}
    save("local-recalculation-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
