from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
QUERY = ROOT / "verifier" / "queries" / "reference_public.region_dim.json.sql"
RUNNER = ROOT / "run_r23.py"

EXPECTED_COLUMNS = [
    "region_id",
    "parent_region_id",
    "region_type",
    "region_code",
    "region_name_ko",
    "region_name_en",
    "full_name_ko",
    "full_name_en",
    "display_order",
    "is_active",
    "created_at",
    "updated_at",
]


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> None:
    sql = QUERY.read_text(encoding="utf-8")
    assert 'ORDER BY "region_id"' in sql
    assert 'ORDER BY "region_code"' not in sql
    assert 'FROM "public"."region_dim"' in sql
    for column in EXPECTED_COLUMNS:
        assert f'"{column}"::text AS "{column}"' in sql
        assert f'("{column}" IS NULL) AS "{column}__is_null"' in sql
    module = load_runner()
    assert module.REFERENCE_TABLES["public.region_dim"]["order"] == ["region_id"]
    assert module.REFERENCE_TABLES["public.region_dim"]["sha256"] == "72C96B12990CB070965C2CE06BD27418DFDF91F63AF14024880AD811CAAA0095"


if __name__ == "__main__":
    main()
