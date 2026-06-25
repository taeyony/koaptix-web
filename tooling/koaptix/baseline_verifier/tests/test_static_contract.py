from pathlib import Path
import json
import ast
import hashlib

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "manifest.json",
    "run_r23.py",
    "verifier/queries/reference_public.region_dim.json.sql",
    "verifier/queries/extensions.json.sql",
    "tests/test_static_contract.py",
    "tests/test_region_dim_order.py",
    "tests/test_extension_owner_canonicalization.py",
]

REFERENCE_SEED_AGGREGATE_LINES = [
    "public.area_cluster_dim\t29\tABEB8A3E3B74428025F8BD9C6716C00F9A8A68D63ECD57E7B99A5C9F74B1DAFB",
    "public.area_group\t6\t294B1FD579300E865D5E3796513EE252B788E74D39903ACBBBA94CFF082EBB0A",
    "public.region_dim\t328\t72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095",
]
ACCEPTED_REFERENCE_SEED_ROOT = "8D493816623014089760CFEA2278CC234FBCCD26C38C7B8FBFBC844575766C87"
FINAL_LF_REFERENCE_SEED_ROOT_VARIANT = "E8F7F80E5E2973C767B4FC6424FDEDB7ECF1FD71024210DC4E25283177C306E2"
R51_006_ARTIFACT_ROOT = "C:\\tmp\\koaptix_r51_wave001c_reference_regeneration_006"
R51_006_ARTIFACT_INDEX_SHA256 = "A6C27FC3068876FC7F710E9FD7E7855F03EFEB57A573437328765C640602547A"
R51_006_SHA256SUMS_SHA256 = "29F9A37269A4883C0FF6E0C82A1D2B71280C007F2D2E0C91A5126CC11324F01F"
R51_006_STRUCTURAL_ROOT = "BCF834D27484723D3CBDF2693D77CF7840D525120DFFFC2A46C29A5A0D8B087E"
R51_006_SECURITY_ROOT = "8977B7518D1F5085A21FFDAD97FB536E09A530F0AFDAD908021562C70777DDF5"
R51_006_CONTEXT_DEFAULT_BOUNDARY = "EXPLICITLY_DEFERRED_FOR_RUNNER_MANIFEST_BINDING_PROVENANCE_ONLY_NOT_PERMANENT_SECURITY_ACCEPTANCE"


def sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest().upper()


def main() -> None:
    missing = [rel for rel in REQUIRED_FILES if not (ROOT / rel).is_file()]
    assert not missing, f"missing placement files: {missing}"
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["run_id"] == "KOAPTIX-R51-006-RUNNER-MANIFEST-BINDING-PATCH-001"
    assert manifest["status"] == "R51_006_PROVENANCE_BOUND_BINDING_ONLY_POLICY_DEFER"
    assert manifest["placement_root"] == "tooling/koaptix/baseline_verifier"
    for value in manifest["execution_boundary"].values():
        assert value is False
    r51 = manifest["accepted_r51_006_provenance"]
    assert r51["artifact_root"] == R51_006_ARTIFACT_ROOT
    assert r51["artifact_index_sha256"] == R51_006_ARTIFACT_INDEX_SHA256
    assert r51["sha256sums_sha256"] == R51_006_SHA256SUMS_SHA256
    assert r51["official_artifact_count_excluding_index_and_sha256sums"] == 438
    assert r51["expected_roots"]["structural_root"] == R51_006_STRUCTURAL_ROOT
    assert r51["expected_roots"]["security_root"] == R51_006_SECURITY_ROOT
    assert r51["expected_roots"]["reference_seed_root"] == ACCEPTED_REFERENCE_SEED_ROOT
    assert r51["context_default_policy_boundary"] == R51_006_CONTEXT_DEFAULT_BOUNDARY
    assert r51["policy_defer_not_permanent_security_acceptance"] is True
    for approved_action in ("db_write", "sql_execution", "full_runner_execution", "p3_execution", "deploy", "expected_root_update", "artifact_root_mutation"):
        assert manifest["blocked_actions_after_binding"][approved_action] is True
    runner = (ROOT / "run_r23.py").read_text(encoding="utf-8")
    assert R51_006_ARTIFACT_ROOT in runner
    assert R51_006_ARTIFACT_INDEX_SHA256 in runner
    assert R51_006_SHA256SUMS_SHA256 in runner
    assert R51_006_CONTEXT_DEFAULT_BOUNDARY in runner
    assert ("C:" + "\\Users" + "\\taeyo") not in runner
    runner_lower = runner.lower()
    assert "postgres://" not in runner_lower
    assert "postgresql://" not in runner_lower
    assert ("ALTER" + " EXTENSION") not in runner.upper()
    assert "KOAPTIX_BASELINE_VERIFIER_ARTIFACT_ROOT" in runner
    assert "_external_artifact_inputs" in runner
    assert "__KOAPTIX_RUNTIME_EXTENSION_OWNER__" in runner
    accepted_reference_seed_input = "\n".join(REFERENCE_SEED_AGGREGATE_LINES)
    final_lf_reference_seed_input = accepted_reference_seed_input + "\n"
    assert sha_text(accepted_reference_seed_input) == ACCEPTED_REFERENCE_SEED_ROOT
    assert sha_text(final_lf_reference_seed_input) == FINAL_LF_REFERENCE_SEED_ROOT_VARIANT
    assert 'aggregate_input = "\\n".join(sorted(aggregate_lines)) + "\\n"' not in runner
    assert 'aggregate_input = "\\n".join(sorted(aggregate_lines))' in runner
    assert 'aggregate_input_final_lf_variant = aggregate_input + "\\n"' in runner
    assert "reference_seed_root_final_lf_audit" in runner
    assert "aggregate_root = sha_text(aggregate_input)" in runner
    assert "aggregate_root_final_lf_variant = sha_text(aggregate_input_final_lf_variant)" in runner
    tree = ast.parse(runner)
    expected_node = next(node for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "EXPECTED" for target in node.targets))
    expected_values = ast.literal_eval(expected_node.value)
    assert expected_values["structural_root"] == R51_006_STRUCTURAL_ROOT
    assert expected_values["security_root"] == R51_006_SECURITY_ROOT
    assert expected_values["reference_seed_root"] == ACCEPTED_REFERENCE_SEED_ROOT
    provenance_node = next(node for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "R51_006_ACCEPTED_ARTIFACT_PROVENANCE" for target in node.targets))
    provenance = ast.literal_eval(provenance_node.value)
    assert provenance["artifact_root"] == R51_006_ARTIFACT_ROOT
    assert provenance["artifact_index_sha256"] == R51_006_ARTIFACT_INDEX_SHA256
    assert provenance["sha256sums_sha256"] == R51_006_SHA256SUMS_SHA256
    assert provenance["official_artifact_count_excluding_index_and_sha256sums"] == 438
    assert provenance["context_default_policy_boundary"] == R51_006_CONTEXT_DEFAULT_BOUNDARY
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "R51 006 artifact package is bound as provenance" in readme
    assert "not as proof of production mutation or permanent security acceptance" in readme
    assert "does not approve DB remediation" in readme
    assert "does not approve running that command" in readme
    run_build = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "run_build")
    run_build_names = {node.id for node in ast.walk(run_build) if isinstance(node, ast.Name)}
    assert "build_semantic_outputs" in run_build_names
    stale_root_names = {
        "expected_structural_root",
        "actual_structural_root",
        "expected_security_root",
        "actual_security_root",
        "expected_reference_seed_root",
        "actual_reference_seed_root",
        "expected_extension_owner_projection",
    }
    assert not (run_build_names & stale_root_names)


if __name__ == "__main__":
    main()
