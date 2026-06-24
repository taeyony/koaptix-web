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


def sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest().upper()


def main() -> None:
    missing = [rel for rel in REQUIRED_FILES if not (ROOT / rel).is_file()]
    assert not missing, f"missing placement files: {missing}"
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["run_id"] == "KOAPTIX-R38-REPOSITORY-VERIFIER-EXPORT-TOOLING-PLACEMENT-CANDIDATE-001"
    assert manifest["placement_root"] == "tooling/koaptix/baseline_verifier"
    for value in manifest["execution_boundary"].values():
        assert value is False
    runner = (ROOT / "run_r23.py").read_text(encoding="utf-8")
    assert ("C:" + "\\tmp") not in runner
    assert ("C:" + "\\Users" + "\\taeyo") not in runner
    assert ("DATABASE" + "_URL") not in runner
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
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "placement candidate only" in readme
    assert "does not execute the runner" in readme
    tree = ast.parse(runner)
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
