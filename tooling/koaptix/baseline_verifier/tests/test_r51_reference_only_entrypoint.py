import ast
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "run_r23.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def function_node(name: str) -> ast.FunctionDef:
    tree = ast.parse(RUNNER.read_text(encoding="utf-8"))
    return next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)


def called_names(node: ast.AST) -> set[str]:
    return {child.id for child in ast.walk(node) if isinstance(child, ast.Name)}


def test_reference_only_cli_requires_explicit_artifact_root():
    module = load_runner()
    parser = module.build_cli_parser()

    try:
        parser.parse_args([module.REFERENCE_ONLY_COMMAND])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("missing artifact root should fail parser validation")


def test_reference_only_cli_routes_to_separate_command(tmp_path):
    module = load_runner()
    parser = module.build_cli_parser()
    target = tmp_path / "r51"

    args = parser.parse_args([module.REFERENCE_ONLY_COMMAND, "--artifact-root", str(target)])

    assert args.command == module.REFERENCE_ONLY_COMMAND
    assert args.artifact_root == str(target)
    assert args.high_priority_grant_policy_artifact is None


def test_reference_only_cli_accepts_optional_high_priority_grant_policy_artifact(tmp_path):
    module = load_runner()
    parser = module.build_cli_parser()
    target = tmp_path / "r51"
    policy = tmp_path / "grant-policy.json"

    args = parser.parse_args([
        module.REFERENCE_ONLY_COMMAND,
        "--artifact-root",
        str(target),
        "--high-priority-grant-policy-artifact",
        str(policy),
    ])

    assert args.command == module.REFERENCE_ONLY_COMMAND
    assert args.artifact_root == str(target)
    assert args.high_priority_grant_policy_artifact == str(policy)


def test_reference_only_preflight_rejects_existing_root(tmp_path):
    module = load_runner()

    result = module.prepare_reference_only_generation(tmp_path, env={})

    assert result["status"] == module.REFERENCE_ONLY_STATUS_ROOT_EXISTS
    assert result["artifact_root"] == str(tmp_path)


def test_reference_only_preflight_does_not_create_new_root(tmp_path):
    module = load_runner()
    target = tmp_path / "r51"

    result = module.prepare_reference_only_generation(target, env={})

    assert result["status"] == "REFERENCE_PACKAGE_GENERATION_READY"
    assert result["artifact_root"] == str(target)
    assert not target.exists()


def test_reference_only_preflight_rejects_db_style_environment(tmp_path):
    module = load_runner()
    target = tmp_path / "r51"
    env = {
        "DATABASE" + "_URL": "redacted",
        "PG" + "PASSWORD": "redacted",
        "SUPA" + "BASE" + "_SERVICE_ROLE_KEY": "redacted",
    }

    result = module.prepare_reference_only_generation(target, env=env)

    assert result["status"] == module.REFERENCE_ONLY_STATUS_UNSAFE_ENV
    assert sorted(result["unsafe_env_names"]) == sorted(env)
    assert not target.exists()


def test_reference_only_preflight_rejects_missing_high_priority_grant_policy_artifact(tmp_path):
    module = load_runner()
    target = tmp_path / "r51"
    missing_policy = tmp_path / "missing-policy.json"

    result = module.prepare_reference_only_generation(
        target,
        env={},
        high_priority_grant_policy_artifact=missing_policy,
    )

    assert result["status"] == module.REFERENCE_ONLY_STATUS_GRANT_POLICY_MISSING
    assert result["artifact_root"] == str(target)
    assert not target.exists()


def test_artifact_json_copy_normalizes_bom_without_mutating_source(tmp_path):
    module = load_runner()
    original_root = module.ROOT
    original_audit = list(module.JSON_COPY_NORMALIZATION_AUDIT)
    try:
        root = tmp_path / "artifact"
        module.configure_artifact_root(root)
        module.JSON_COPY_NORMALIZATION_AUDIT.clear()
        source = tmp_path / "source.json"
        source.write_bytes(b'\xef\xbb\xbf{"ok":true}\n')
        source_before = source.read_bytes()

        target = root / "manifests" / "source.json"
        module.copy_artifact_file(source, target)

        assert source.read_bytes() == source_before
        assert target.read_bytes() == b'{"ok":true}\n'
        assert module.parse_json_strict(target.read_text(encoding="utf-8")) == {"ok": True}
        assert module.JSON_COPY_NORMALIZATION_AUDIT == [{
            "rule_id": module.JSON_COPY_NORMALIZATION_RULE_ID,
            "status": "BOM_REMOVED_STRICT_JSON_VALID",
            "source_path": str(source),
            "target_relative_path": "manifests/source.json",
            "source_sha256": module.sha_bytes(source_before),
            "target_sha256": module.sha_file(target),
        }]
    finally:
        module.configure_artifact_root(original_root)
        module.JSON_COPY_NORMALIZATION_AUDIT[:] = original_audit


def test_artifact_json_copy_keeps_non_bom_json_bytes_unchanged(tmp_path):
    module = load_runner()
    original_root = module.ROOT
    original_audit = list(module.JSON_COPY_NORMALIZATION_AUDIT)
    try:
        root = tmp_path / "artifact"
        module.configure_artifact_root(root)
        module.JSON_COPY_NORMALIZATION_AUDIT.clear()
        source = tmp_path / "source.json"
        source.write_bytes(b'{\n  "ok": true\n}\n')

        target = root / "manifests" / "source.json"
        module.copy_artifact_file(source, target)

        assert target.read_bytes() == source.read_bytes()
        assert module.JSON_COPY_NORMALIZATION_AUDIT == []
    finally:
        module.configure_artifact_root(original_root)
        module.JSON_COPY_NORMALIZATION_AUDIT[:] = original_audit


def test_reference_only_generation_function_excludes_full_runner_and_db_calls():
    node = function_node("run_reference_only_generation")
    names = called_names(node)

    assert "prepare_reference_only_generation" in names
    assert "copy_inputs" in names
    assert "generate_reference_sql" in names
    assert "run_fixture_construction" in names
    assert "write_artifact_index" in names
    assert "run_build" not in names
    assert "docker_inventory" not in names
    assert "write_handoffs" not in names
    assert "main" not in names


def test_main_cli_keeps_default_full_runner_and_separate_reference_route():
    node = function_node("main_cli")
    names = called_names(node)

    assert "main" in names
    assert "run_reference_only_generation" in names
    assert "run_build" not in names
    assert "docker_inventory" not in names


def test_reference_only_authority_preserves_region_id_and_hashes():
    module = load_runner()
    report = module.reference_only_authority_report()

    assert report["matches"] is True
    assert module.REFERENCE_TABLES["public.region_dim"]["order"] == ["region_id"]
    assert module.REFERENCE_TABLES["public.region_dim"]["sha256"] == "72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095"
    assert module.REFERENCE_TABLES["public.area_group"]["sha256"] == "294B1FD579300E865D5E3796513EE252B788E74D39903ACBBBA94CFF082EBB0A"
    assert module.REFERENCE_TABLES["public.area_cluster_dim"]["sha256"] == "ABEB8A3E3B74428025F8BD9C6716C00F9A8A68D63ECD57E7B99A5C9F74B1DAFB"
    assert module.REFERENCE_TABLES["public.region_dim"]["sha256"] != "6641DBFB3B1314A4A33EA282B971F8F803E0A630529BAEA21050C472AD9F9F90"
