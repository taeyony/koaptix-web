from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "run_r23.py"
EXT_QUERY = ROOT / "verifier" / "queries" / "extensions.json.sql"
EXPECTED_TARGETS = {"pg_cron", "pg_trgm", "plpgsql", "supabase_vault"}


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> None:
    module = load_runner()
    assert set(module.EXTENSION_OWNER_CANONICALIZATION_TARGETS) == EXPECTED_TARGETS
    assert module.EXTENSION_OWNER_PORTABLE_OWNER_TOKEN == "__KOAPTIX_RUNTIME_EXTENSION_OWNER__"
    sample = [{"extname": target, "owner": f"runtime_owner_{idx}", "schema_name": "public"} for idx, target in enumerate(sorted(EXPECTED_TARGETS), start=1)]
    projected = module.project_extension_owner_records_for_portable_root(sample, source_side="actual")
    assert len(projected["audit_records"]) == 4
    assert projected["warning_records"] == []
    for record in projected["portable_records"]:
        assert "owner" not in record
        assert record["portable_owner"] == "__KOAPTIX_RUNTIME_EXTENSION_OWNER__"
    sql = EXT_QUERY.read_text(encoding="utf-8")
    assert "pg_get_userbyid(e.extowner) AS owner" in sql
    assert "portable_owner" not in sql
    assert "ORDER BY q.extname" in sql


if __name__ == "__main__":
    main()
