from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "run_r23.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_runner_provenance_hash_uses_repo_source_path():
    module = load_runner()
    evidence = module.runner_provenance_hash_evidence()
    source = evidence["source_runner"]
    legacy_artifact = evidence["legacy_artifact_runner"]

    assert source["relative_path"] == "tooling/koaptix/baseline_verifier/run_r23.py"
    assert source["source_kind"] == "repo_source"
    assert source["provenance_hash_status"] == "PRESENT"
    assert source["sha256"]
    assert legacy_artifact["relative_path"] == "tooling/run_r23.py"
    assert legacy_artifact["expected_path"] == source["attempted_path"]


def test_missing_provenance_file_is_structured_evidence(tmp_path):
    module = load_runner()
    missing = tmp_path / "missing" / "run_r23.py"
    evidence = module.file_hash_evidence(
        missing,
        relative_path="tooling/koaptix/baseline_verifier/run_r23.py",
        source_kind="repo_source",
    )

    assert evidence["provenance_hash_status"] == "MISSING_INPUT"
    assert evidence["sha256"] is None
    assert evidence["failure_class"] == "PROVENANCE_HASH_INPUT_MISSING"
    assert evidence["attempted_path"] == str(missing)


def test_fixture_reference_mismatch_remains_blocking_primary_failure():
    module = load_runner()
    fixture = {
        "construction_completed": True,
        "deterministic_output": True,
        "actual_portable_structural_root_match": False,
        "actual_portable_security_root_match": False,
        "reference_hashes_match": False,
        "reference_seed_root_match": False,
    }

    summary = module.fixture_reference_mismatch_summary(fixture)

    assert summary["status"] == "BLOCKED_FIXTURE_REFERENCE_MISMATCH_NO_REMOTE_MUTATION"
    assert summary["blocks_db_build"] is True
    assert summary["blockers"] == [
        "portable_structural_root_match",
        "portable_security_root_match",
        "reference_hashes_match",
        "reference_seed_root_match",
    ]


def test_failure_reporting_preserves_primary_before_reporting_blocker():
    module = load_runner()
    fixture_summary = module.fixture_reference_mismatch_summary({
        "construction_completed": True,
        "deterministic_output": True,
        "actual_portable_structural_root_match": False,
        "actual_portable_security_root_match": True,
        "reference_hashes_match": True,
        "reference_seed_root_match": True,
    })
    runner_provenance = {
        "provenance_hash_status": "PRESENT",
        "legacy_artifact_runner": {"provenance_hash_status": "MISSING_INPUT"},
    }

    reporting = module.failure_reporting_summary(
        "BLOCKED_FIXTURE_REFERENCE_MISMATCH_NO_REMOTE_MUTATION",
        ["R22 fixture portable_structural_root_match failed"],
        fixture_summary,
        runner_provenance,
    )

    assert reporting["primary_substantive_blocker"] == "BLOCKED_FIXTURE_REFERENCE_MISMATCH_NO_REMOTE_MUTATION"
    assert reporting["secondary_reporting_blocker"] == "LEGACY_ARTIFACT_RUNNER_HASH_INPUT_MISSING_PREVENTED"
    assert reporting["final_exit_cause"] == "BLOCKED_FIXTURE_REFERENCE_MISMATCH_NO_REMOTE_MUTATION"


def test_missing_grant_policy_artifact_is_safe_preflight_blocker_without_root_creation(tmp_path):
    module = load_runner()
    target = tmp_path / "r51"
    missing_policy = tmp_path / "missing-grant-policy.json"

    result = module.prepare_reference_only_generation(
        target,
        env={},
        high_priority_grant_policy_artifact=missing_policy,
    )

    assert result["status"] == module.REFERENCE_ONLY_STATUS_GRANT_POLICY_MISSING
    assert result["artifact_root"] == str(target)
    assert not target.exists()
