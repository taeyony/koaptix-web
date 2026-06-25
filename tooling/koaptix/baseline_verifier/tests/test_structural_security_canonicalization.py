from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "run_r23.py"


def load_runner():
    spec = importlib.util.spec_from_file_location("koaptix_baseline_run_r23", RUNNER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def routine_key_parts(key: str) -> tuple[str, str, str]:
    schema, rest = key.split(".", 1)
    name, signature = rest.split("(", 1)
    return schema, name, signature[:-1]


def write_grant_policy_artifact(module, tmp_path: Path, *, expose_high_priority: bool = False) -> Path:
    rows = []
    for idx, key in enumerate(sorted(module.HIGH_PRIORITY_ROUTINE_KEYS), start=1):
        schema, name, signature = routine_key_parts(key)
        rows.append({
            "anon_execute_effective": expose_high_priority,
            "authenticated_execute_effective": expose_high_priority,
            "candidate_regprocedures": [f"{name}({signature})"],
            "candidate_type_signatures": [signature],
            "expected_type_signature": signature,
            "full_arguments": signature,
            "grant_source": "explicit_acl",
            "has_explicit_acl": True,
            "identity_arguments": signature,
            "idx": idx,
            "name": name,
            "owner": module.HIGH_PRIORITY_GRANT_POLICY_OWNER,
            "owner_execute_effective": True,
            "priority": "HIGH",
            "public_execute_effective": expose_high_priority,
            "regprocedure": f"{name}({signature})",
            "resolution_classification": "RESOLVED_EXACT_TYPE_SIGNATURE",
            "resolved": True,
            "schema": schema,
            "service_role_execute_effective": True,
            "type_signature": signature,
        })
    for idx, key in enumerate(sorted(module.CONTEXT_UTILITY_ROUTINE_KEYS), start=100):
        schema, name, signature = routine_key_parts(key)
        rows.append({
            "anon_execute_effective": True,
            "authenticated_execute_effective": True,
            "candidate_regprocedures": [f"{name}({signature})"],
            "candidate_type_signatures": [signature],
            "expected_type_signature": signature,
            "full_arguments": signature,
            "grant_source": "explicit_acl",
            "has_explicit_acl": True,
            "identity_arguments": signature,
            "idx": idx,
            "name": name,
            "owner": module.HIGH_PRIORITY_GRANT_POLICY_OWNER,
            "owner_execute_effective": True,
            "priority": "CONTEXT",
            "public_execute_effective": True,
            "regprocedure": f"{name}({signature})",
            "resolution_classification": "RESOLVED_EXACT_TYPE_SIGNATURE",
            "resolved": True,
            "schema": schema,
            "service_role_execute_effective": True,
            "type_signature": signature,
        })
    artifact = {
        "default_privileges": [{
            "anon_default_execute": True,
            "authenticated_default_execute": True,
            "owner": module.HIGH_PRIORITY_GRANT_POLICY_OWNER,
            "public_default_execute": True,
            "service_role_default_execute": True,
        }],
        "routine_privileges": rows,
        "summaries": {
            "context": {
                "anon_execute_count": 10,
                "authenticated_execute_count": 10,
                "expected_count": 10,
                "public_execute_count": 10,
                "resolved_count": 10,
                "service_role_execute_count": 10,
                "unresolved_count": 0,
            },
            "high_priority": {
                "anon_execute_count": 0 if not expose_high_priority else 16,
                "authenticated_execute_count": 0 if not expose_high_priority else 16,
                "expected_count": 16,
                "exposed_high_priority_targets": [] if not expose_high_priority else sorted(module.HIGH_PRIORITY_ROUTINE_KEYS),
                "exposed_to_public_roles_count": 0 if not expose_high_priority else 16,
                "public_execute_count": 0 if not expose_high_priority else 16,
                "resolved_count": 16,
                "service_role_execute_count": 16,
                "service_role_missing_targets": [],
                "unresolved_count": 0,
                "unresolved_high_priority_targets": [],
            },
        },
    }
    path = tmp_path / "grant-policy.json"
    path.write_text(json.dumps(artifact, sort_keys=True), encoding="utf-8")
    return path


def routine_row_from_key(module, key: str, *, acl: str) -> dict[str, str]:
    schema, name, signature = routine_key_parts(key)
    return {
        "schema_name": schema,
        "name": name,
        "identity_arguments": signature,
        "owner": module.HIGH_PRIORITY_GRANT_POLICY_OWNER,
        "acl": acl,
    }


def empty_structural_manifest():
    return {
        "extensions": [],
        "relations": [],
        "columns": [],
        "sequences": [],
        "routines": [],
        "views": [],
        "constraints": [],
        "indexes": [],
        "triggers": [],
    }


def empty_security_manifest():
    return {
        "relations": [],
        "routines": [],
        "types": [],
        "expanded_relation_grants": [],
        "expanded_routine_grants": [],
        "expanded_type_grants": [],
        "expanded_default_acl_grants": [],
        "policies": [],
    }


def test_extension_runtime_structural_noise_is_canonicalized_without_hiding_app_routines():
    module = load_runner()
    manifest = empty_structural_manifest()
    manifest["extensions"] = [
        {
            "schema_name": "pg_catalog",
            "extname": "pg_cron",
            "extversion": "1.6.4",
            "owner": "postgres",
            "extconfig": "{16408,16407}",
            "extcondition": '{"",""}',
        }
    ]
    manifest["routines"] = [
        {
            "schema_name": "public",
            "name": "similarity",
            "identity_arguments": "text, text",
            "extension_managed": True,
            "owner": "postgres",
            "acl": "{=X/postgres}",
            "definition": "CREATE FUNCTION public.similarity(text, text) RETURNS real",
        },
        {
            "schema_name": "public",
            "name": "refresh_koaptix_front_views",
            "identity_arguments": "",
            "extension_managed": False,
            "owner": "postgres",
            "acl": "{=X/postgres,postgres=X/postgres}",
            "definition": "CREATE FUNCTION public.refresh_koaptix_front_views() RETURNS void",
        },
    ]

    projected = module.project_structural_manifest_for_portable_runtime_noise(manifest, source_side="actual")["manifest"]

    extension = projected["extensions"][0]
    assert "owner" not in extension
    assert extension["portable_owner"] == module.EXTENSION_OWNER_PORTABLE_OWNER_TOKEN
    assert "extconfig" not in extension
    assert "extcondition" not in extension
    assert extension["portable_extconfig"] == module.EXTENSION_RUNTIME_METADATA_TOKEN
    assert extension["portable_extcondition"] == module.EXTENSION_RUNTIME_METADATA_TOKEN

    extension_routine = next(r for r in projected["routines"] if r["name"] == "similarity")
    assert "owner" not in extension_routine
    assert "acl" not in extension_routine
    assert extension_routine["portable_owner"] == module.EXTENSION_MANAGED_OBJECT_OWNER_TOKEN
    assert extension_routine["portable_acl"] == module.EXTENSION_MANAGED_ROUTINE_ACL_TOKEN
    assert "definition" in extension_routine

    app_routine = next(r for r in projected["routines"] if r["name"] == "refresh_koaptix_front_views")
    assert app_routine["owner"] == "postgres"
    assert app_routine["acl"] == "{=X/postgres,postgres=X/postgres}"
    assert app_routine["definition"] == "CREATE FUNCTION public.refresh_koaptix_front_views() RETURNS void"


def test_internal_ri_constrainttrigger_names_are_canonicalized_but_app_triggers_remain_visible():
    module = load_runner()
    manifest = empty_structural_manifest()
    manifest["triggers"] = [
        {
            "schema_name": "public",
            "table_name": "apt_complex",
            "name": "RI_ConstraintTrigger_c_17144",
            "tgisinternal": True,
            "tgenabled": "O",
            "definition": 'CREATE CONSTRAINT TRIGGER "RI_ConstraintTrigger_c_17144" AFTER INSERT ON public.apt_complex FROM region_dim NOT DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION "RI_FKey_check_ins"()',
        },
        {
            "schema_name": "public",
            "table_name": "apt_complex",
            "name": "trg_apt_complex_set_updated_at",
            "tgisinternal": False,
            "tgenabled": "O",
            "definition": "CREATE TRIGGER trg_apt_complex_set_updated_at BEFORE UPDATE ON public.apt_complex FOR EACH ROW EXECUTE FUNCTION koaptix_set_updated_at()",
        },
    ]

    projected = module.project_structural_manifest_for_portable_runtime_noise(manifest, source_side="actual")["manifest"]

    ri_trigger = next(t for t in projected["triggers"] if t["tgisinternal"])
    assert ri_trigger["name"] == "RI_ConstraintTrigger_c__KOAPTIX_GENERATED__"
    assert "17144" not in ri_trigger["definition"]
    assert "RI_FKey_check_ins" in ri_trigger["definition"]
    assert "FROM region_dim" in ri_trigger["definition"]

    app_trigger = next(t for t in projected["triggers"] if not t["tgisinternal"])
    assert app_trigger["name"] == "trg_apt_complex_set_updated_at"
    assert "koaptix_set_updated_at" in app_trigger["definition"]


def test_security_canonicalization_excludes_only_extension_routine_grants_and_keeps_app_public_execute_visible():
    module = load_runner()
    manifest = empty_security_manifest()
    manifest["routines"] = [
        {
            "routine_identity": "public.similarity(text, text)",
            "extension_managed": True,
            "owner": "supabase_admin",
            "security_definer": False,
        },
        {
            "routine_identity": "public.refresh_koaptix_front_views()",
            "extension_managed": False,
            "owner": "postgres",
            "security_definer": True,
        },
    ]
    manifest["types"] = [
        {"type_identity": "public.gtrgm", "owner": "supabase_admin"},
        {"type_identity": "public.app_type", "owner": "postgres"},
    ]
    manifest["expanded_routine_grants"] = [
        {
            "object_identity": "public.similarity(text, text)",
            "object_class": "routine",
            "grantee": "PUBLIC",
            "privilege_type": "EXECUTE",
            "grantor": "supabase_admin",
            "grant_option": False,
        },
        {
            "object_identity": "public.refresh_koaptix_front_views()",
            "object_class": "routine",
            "grantee": "PUBLIC",
            "privilege_type": "EXECUTE",
            "grantor": "postgres",
            "grant_option": False,
        },
    ]
    manifest["expanded_relation_grants"] = [
        {
            "object_identity": "public.apt_complex",
            "object_class": "relation",
            "grantee": "service_role",
            "privilege_type": "SELECT",
            "grantor": "postgres",
            "grant_option": False,
        }
    ]
    manifest["expanded_default_acl_grants"] = [
        {
            "object_identity": "default_acl:postgres:public:r",
            "object_class": "default",
            "grantee": "service_role",
            "privilege_type": "SELECT",
            "grantor": "postgres",
            "grant_option": False,
        }
    ]
    manifest["policies"] = [
        {"schema_name": "public", "table_name": "apt_complex", "name": "visible_policy", "polcmd": "r"}
    ]

    projected = module.project_security_manifest_for_portable_runtime_noise(manifest, source_side="actual")["manifest"]
    evidence = module.app_routine_public_execute_policy_evidence(projected)

    extension_routine = next(r for r in projected["routines"] if r["routine_identity"] == "public.similarity(text, text)")
    assert "owner" not in extension_routine
    assert extension_routine["portable_owner"] == module.EXTENSION_MANAGED_OBJECT_OWNER_TOKEN

    extension_type = next(t for t in projected["types"] if t["type_identity"] == "public.gtrgm")
    assert "owner" not in extension_type
    assert extension_type["portable_owner"] == module.EXTENSION_MANAGED_OBJECT_OWNER_TOKEN
    app_type = next(t for t in projected["types"] if t["type_identity"] == "public.app_type")
    assert app_type["owner"] == "postgres"

    assert all(g["object_identity"] != "public.similarity(text, text)" for g in projected["expanded_routine_grants"])
    assert any(g["object_identity"] == "public.refresh_koaptix_front_views()" for g in projected["expanded_routine_grants"])
    assert evidence["status"] == module.APP_ROUTINE_PUBLIC_EXECUTE_POLICY_REVIEW_REQUIRED
    assert evidence["routine_identities"] == ["public.refresh_koaptix_front_views()"]
    assert projected["expanded_relation_grants"] == manifest["expanded_relation_grants"]
    assert projected["expanded_default_acl_grants"] == manifest["expanded_default_acl_grants"]
    assert projected["policies"] == manifest["policies"]


def test_high_priority_grant_policy_overlay_removes_only_high_priority_public_role_grants(tmp_path):
    module = load_runner()
    policy = module.load_high_priority_grant_policy_artifact(write_grant_policy_artifact(module, tmp_path))
    public_acl = "{=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"
    context_key = "public.koaptix_pick_column(text, text, text[])"
    capture = {
        "routines": [
            *(routine_row_from_key(module, key, acl=public_acl) for key in sorted(module.HIGH_PRIORITY_ROUTINE_KEYS)),
            routine_row_from_key(module, context_key, acl=public_acl),
        ]
    }

    patched = module.apply_high_priority_grant_policy_overlay_to_capture(capture, policy)

    assert patched["audit"]["enabled"] is True
    assert patched["audit"]["patched_target_count"] == 16
    assert capture["routines"][0]["acl"] == public_acl
    for row in patched["capture"]["routines"]:
        identity = module.logical_routine(row)
        grants = module.summarize_execute_grants(module.acl_entries(row["acl"], "routine", identity))
        if module.routine_policy_key_from_capture_row(row) in module.HIGH_PRIORITY_ROUTINE_KEYS:
            assert grants["public_execute"] is False
            assert grants["anon_execute"] is False
            assert grants["authenticated_execute"] is False
            assert grants["service_role_execute"] is True
            assert grants["execute_grantees"] == ["postgres", "service_role"]
        else:
            assert module.routine_policy_key_from_capture_row(row) == context_key
            assert grants["public_execute"] is True
            assert grants["anon_execute"] is True
            assert grants["authenticated_execute"] is True
            assert grants["service_role_execute"] is True


def test_high_priority_grant_policy_loader_fails_closed_on_public_exposure(tmp_path):
    module = load_runner()
    policy_path = write_grant_policy_artifact(module, tmp_path, expose_high_priority=True)

    try:
        module.load_high_priority_grant_policy_artifact(policy_path)
    except module.ReferenceOnlyGenerationBlocked as exc:
        assert exc.status == module.REFERENCE_ONLY_STATUS_GRANT_POLICY_INVALID
    else:
        raise AssertionError("publicly exposed high-priority policy evidence must fail closed")
