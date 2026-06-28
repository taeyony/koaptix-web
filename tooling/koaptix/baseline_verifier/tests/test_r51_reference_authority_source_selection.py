import importlib.util
import ast
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "run_r23.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def runner_function(name: str) -> ast.FunctionDef:
    tree = ast.parse(RUNNER.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    raise AssertionError(f"{name} function not found")


def run_fixture_construction_calls(function_name: str) -> list[ast.Call]:
    function = runner_function(function_name)
    calls = []
    for node in ast.walk(function):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "run_fixture_construction":
            calls.append(node)
    return calls


def keyword_name(call: ast.Call, name: str) -> str | None:
    for keyword in call.keywords:
        if keyword.arg == name and isinstance(keyword.value, ast.Name):
            return keyword.value.id
    return None


def write_authority_files(module, root: Path, *, include_region: bool = True) -> dict[str, str]:
    texts = {
        "public.area_group": "accepted-area-group",
        "public.area_cluster_dim": "accepted-area-cluster",
        "public.region_dim": "accepted-region-id-order",
    }
    authority = root / "authority" / "reference"
    authority.mkdir(parents=True, exist_ok=True)
    for table_identity, text in texts.items():
        if table_identity == "public.region_dim" and not include_region:
            continue
        (authority / f"{table_identity}.canonical.jsonl").write_text(text, encoding="utf-8")
        module.REFERENCE_TABLES[table_identity]["sha256"] = module.sha_text(text)
        module.REFERENCE_TABLES[table_identity]["rows"] = len(text.splitlines())
    return texts


def test_reference_only_policy_prefers_accepted_region_dim_authority(tmp_path):
    module = load_runner()
    original_root = module.ROOT
    original_tables = {key: dict(value) for key, value in module.REFERENCE_TABLES.items()}
    try:
        module.configure_artifact_root(tmp_path)
        texts = write_authority_files(module, tmp_path)
        capture_dir = tmp_path / "fixture" / "r22_qualification_1_canonical_capture"
        capture_dir.mkdir(parents=True)
        stale_capture = capture_dir / "reference_public.region_dim.json"
        stale_capture.write_text('[{"region_id":"2","region_id__is_null":false}]', encoding="utf-8")

        result = module.canonicalize_reference(
            capture_dir,
            source_policy=module.REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY,
        )

        region = result["tables"]["public.region_dim"]
        trace = result["source_trace"]["public.region_dim"]
        output = tmp_path / "freshbuild" / "r22_qualification_1_canonical_capture_public.region_dim.canonical.jsonl"

        assert output.read_text(encoding="utf-8") == texts["public.region_dim"]
        assert region["sha256"] == module.sha_text(texts["public.region_dim"])
        assert region["source_policy"] == module.REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY
        assert trace["source_path"].endswith("authority\\reference\\public.region_dim.canonical.jsonl") or trace["source_path"].endswith("authority/reference/public.region_dim.canonical.jsonl")
        assert trace["stale_r22_capture_fallback_allowed"] is False
        assert stale_capture.read_text(encoding="utf-8") != output.read_text(encoding="utf-8")
    finally:
        module.configure_artifact_root(original_root)
        module.REFERENCE_TABLES.clear()
        module.REFERENCE_TABLES.update(original_tables)


def test_reference_only_policy_blocks_missing_region_dim_authority(tmp_path):
    module = load_runner()
    original_root = module.ROOT
    original_tables = {key: dict(value) for key, value in module.REFERENCE_TABLES.items()}
    try:
        module.configure_artifact_root(tmp_path)
        write_authority_files(module, tmp_path, include_region=False)
        capture_dir = tmp_path / "fixture" / "r22_qualification_1_canonical_capture"
        capture_dir.mkdir(parents=True)

        with pytest.raises(module.ReferenceOnlyGenerationBlocked) as exc:
            module.canonicalize_reference(
                capture_dir,
                source_policy=module.REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY,
            )

        assert exc.value.status == module.REFERENCE_ONLY_STATUS_ACCEPTED_AUTHORITY_MISSING
        assert "public.region_dim" in str(exc.value)
    finally:
        module.configure_artifact_root(original_root)
        module.REFERENCE_TABLES.clear()
        module.REFERENCE_TABLES.update(original_tables)


def test_reference_only_entrypoint_uses_accepted_authority_policy():
    runner = RUNNER.read_text(encoding="utf-8")
    calls = run_fixture_construction_calls("run_reference_only_generation")

    assert len(calls) == 1
    assert keyword_name(calls[0], "reference_source_policy") == "REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY"
    assert keyword_name(calls[0], "high_priority_grant_policy") == "high_priority_grant_policy"
    assert 'ORDER BY "region_id"' in (ROOT / "verifier" / "queries" / "reference_public.region_dim.json.sql").read_text(encoding="utf-8")
    assert "REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY" in runner


def test_full_runner_entrypoint_uses_accepted_authority_policy():
    runner = RUNNER.read_text(encoding="utf-8")
    calls = run_fixture_construction_calls("main")

    assert len(calls) == 1
    assert keyword_name(calls[0], "reference_source_policy") == "REFERENCE_SOURCE_POLICY_ACCEPTED_AUTHORITY"
    assert "REJECTED_STALE_REGION_DIM_SHA256" in runner
    assert "6641DBFB3B1314A4A33EA282B971F8F803E0A630529BAEA21050C472AD9F9F90" in runner
    assert "72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095" in runner
