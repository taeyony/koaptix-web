"""Bounded Q1 local tests. DB access requires the separate explicit Q2 option.

The default command neither imports a DB driver nor reads a DSN. PostgreSQL
behavior is not inferred from these pure/static checks. Package mode copies
six named files; it is the only default tooling operation that writes files.
"""
from __future__ import annotations

import ast
import copy
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from tooling.koaptix.idempotent_publication import contracts as c
from tooling.koaptix.idempotent_publication import forward_projection as fp


def sha(data):
    return hashlib.sha256(data).hexdigest().upper()


def actor_module(actor):
    path = ROOT / f"services/koaptix_daily/{actor}/api/index.py"
    spec = importlib.util.spec_from_file_location("s1_test_" + actor, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sql_statements(source):
    """Quote-aware lexical splitting, explicitly not a PostgreSQL grammar parser."""
    statements, start, i, depth = [], 0, 0, 0
    while i < len(source):
        if source.startswith("--", i):
            end = source.find("\n", i)
            i = len(source) if end == -1 else end + 1
            continue
        if source.startswith("/*", i):
            level, i = 1, i + 2
            while level and i < len(source):
                if source.startswith("/*", i):
                    level, i = level + 1, i + 2
                elif source.startswith("*/", i):
                    level, i = level - 1, i + 2
                else:
                    i += 1
            if level:
                raise ValueError("unterminated SQL comment")
            continue
        if source[i] in "\"'":
            quote, i = source[i], i + 1
            while i < len(source):
                if source[i] == quote:
                    if i + 1 < len(source) and source[i + 1] == quote:
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            else:
                raise ValueError("unterminated SQL string/identifier")
            continue
        if source[i] == "$":
            match = re.match(r"\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$", source[i:])
            if match:
                tag = match.group()
                end = source.find(tag, i + len(tag))
                if end < 0:
                    raise ValueError("unterminated SQL function body")
                i = end + len(tag)
                continue
        if source[i] == "(":
            depth += 1
        elif source[i] == ")":
            depth -= 1
            if depth < 0:
                raise ValueError("unbalanced SQL parentheses")
        elif source[i] == ";" and depth == 0:
            statements.append(source[start:i + 1])
            start = i + 1
        i += 1
    tail = re.sub(r"--[^\n]*", "", source[start:]).strip()
    if depth or tail:
        raise ValueError("unbalanced or unterminated SQL statement")
    return statements


def golden_projection(day="2026-09-04"):
    """Small synthetic PD01/PD04 bundle; not historical application data."""
    common = dict(snapshot_date=day, universe_code="KOREA_ALL", complex_id=101,
                  apt_name_ko="Synthetic Complex", sigungu_name="Synthetic Region",
                  legal_dong_name="Synthetic Dong", build_year=2000, rank_all=1,
                  market_cap_krw=1_000_000_000_000, previous_rank_all=None,
                  rank_movement="NEW", tier_code=None, tier_label=None, tier_sort=None,
                  is_top1000=True, household_count=100, total_household_count=100,
                  recovery_52w=None, market_cap_share=Decimal("1.00000000"),
                  market_cap_share_pct=Decimal("100.000000"),
                  market_cap_trillion_krw=Decimal("1.000000000000"))
    g = {k: common.get(k) for k in c.GLOBAL_ROW_KEYS}
    g.update(priced_household_count=100, priced_household_ratio=Decimal("1.0000"),
             total_cluster_count=1, priced_cluster_count=1, coverage_status="complete",
             is_rank_eligible=True, eligibility_status="eligible", rank_delta_1d=None)
    s = {k: common.get(k) for k in c.SERVICE_ROW_KEYS}
    s.update(universe_name="Synthetic Korea", universe_scope="NATIONAL", rank_delta_w=None,
             source_previous_snapshot_date=None, generated_at=day + "T15:05:01.000000Z", refresh_run_id="synthetic-A")
    h = {k: g.get(k) for k in c.HISTORY_STAGE_KEYS}
    h["total_market_cap"] = g["market_cap_krw"]
    t = {k: s.get(k) for k in c.SNAPSHOT_STAGE_KEYS}
    t.update(rank_delta_1d=None, rank_method="market_cap_desc", calculation_version="v1", created_at=s["generated_at"])
    return {"target_rank_date": day, "global_previous_snapshot_date": None,
            "input_authority": {"affected_universe_codes": ["KOREA_ALL"]},
            "global_rows": [g], "service_rows": [s], "history_stage_rows": [h], "snapshot_stage_rows": [t]}


def pure_import_probe(root, *, packaged=False):
    code = r'''
import sys, os, json, pathlib, importlib.util
import http.server, datetime, decimal, typing, hashlib, re, uuid, collections
sys.dont_write_bytecode = True
sys.path.insert(0, sys.argv[1])
events = []
def guard(event, args):
    if event.startswith("socket.") or event in ("subprocess.Popen", "os.system"):
        raise AssertionError("import attempted network/process action: " + event)
    if event == "open":
        mode = args[1] or ""
        flags = args[2] if len(args)>2 and isinstance(args[2], int) else 0
        if any(x in mode for x in "wa+") or flags & (os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC):
            raise AssertionError("import attempted a filesystem write")
    if event in ("os.mkdir","os.remove","os.rename","os.rmdir"):
        raise AssertionError("import attempted filesystem mutation")
sys.addaudithook(guard)
original = os._Environ.__getitem__
def no_secrets(self, key):
    if any(x in key.upper() for x in ("SECRET","DSN","SUPABASE","DATABASE","TOKEN")):
        raise AssertionError("import attempted a secret lookup")
    return original(self,key)
os._Environ.__getitem__ = no_secrets
from tooling.koaptix.idempotent_publication import contracts, forward_projection
roots = [pathlib.Path(sys.argv[1])/"api/index.py"] if sys.argv[2]=="package" else [
    pathlib.Path(sys.argv[1])/"services/koaptix_daily"/a/"api/index.py" for a in ("writer","verifier")]
for i, path in enumerate(roots):
    spec=importlib.util.spec_from_file_location("inert_actor_"+str(i),path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
assert "psycopg" not in sys.modules
assert contracts.sha256_json(contracts.canonical_contract()) == contracts.CONTRACT_SHA256
print(json.dumps({"inert":True,"driver_imported":False,"actors":len(roots)}))
'''
    result = subprocess.run([sys.executable, "-B", "-I", "-c", code, str(root), "package" if packaged else "repo"],
                            capture_output=True, text=True, cwd=root, timeout=20)
    if result.returncode:
        raise AssertionError(result.stderr)
    return json.loads(result.stdout)


def package_actor(actor, output):
    allowed_root = (ROOT / ".handoff/s1_local_qualification").resolve()
    destination = (ROOT / output).resolve()
    if destination.parent != allowed_root or destination.name != actor or actor not in ("writer", "verifier"):
        raise ValueError("package output must be the exact actor artifact directory")
    files = {
        f"services/koaptix_daily/{actor}/api/index.py": "api/index.py",
        f"services/koaptix_daily/{actor}/requirements.txt": "requirements.txt",
        f"services/koaptix_daily/{actor}/vercel.json": "vercel.json",
        **{p: p for p in c.SOURCE_PATHS[1:4]},
    }
    # Do not recursively remove or sweep any directory, even for packaging.
    if destination.exists():
        existing = {p.relative_to(destination).as_posix() for p in destination.rglob("*") if p.is_file()}
        if existing - set(files.values()):
            raise ValueError("unexpected package file; no overwrite or cleanup")
    entries = []
    for source, relative in files.items():
        data = (ROOT / source).read_bytes()
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        entries.append({"path": relative, "bytes": len(data), "sha256": sha(data)})
    return {"actor": actor, "files": entries, "import": pure_import_probe(destination, packaged=True)}


class LocalContractTests(unittest.TestCase):
    # Each negative group prevents the named concrete harmful outcome.
    def test_01_contract_identity(self):
        value = c.canonical_contract()
        self.assertEqual(c.CONTRACT_NAME, "KOAPTIX_S1_IDEMPOTENT_FORWARD_PUBLICATION")
        self.assertEqual(c.CONTRACT_VERSION, "1.0.0")
        self.assertEqual(sha(c.CANONICAL_CONTRACT_JSON.encode()), c.CONTRACT_SHA256)
        self.assertEqual(c.sha256_json(value), c.CONTRACT_SHA256)
        # Duplicate keys/nonfinite/float normalization must not change meaning.
        for text in ('{"a":1,"a":2}', '{"a":NaN}', '{"a":1.5}'):
            with self.subTest(text=text), self.assertRaises((c.ContractError, ValueError)):
                c.load_exact_json(text, contract=True)

    def test_02_phase_and_result_vocabulary(self):
        self.assertEqual(set(c.PHASES), {"W_START","P","S","A","V","B","D","R_P","R_S","R_A","R_B","R_D"})
        self.assertIn("ACK_UNKNOWN", c.RESULTS)
        self.assertNotIn("AS_PUBLISHED", fp.REFERENCE_STATUSES)
        with self.assertRaises(c.ContractError):
            c.validate_ordinal("UNRESTRICTED", "ADMIT", 1, "koaptix_publication_writer")

    def test_03_durable_admission_bound_and_actor(self):
        for n in (1, 2):
            c.validate_ordinal("S", "ADMIT", n, "koaptix_publication_writer")
        for n in (0, 3, True, -1):
            with self.subTest(ordinal=n), self.assertRaises(c.ContractError):
                c.validate_ordinal("S", "ADMIT", n, "koaptix_publication_writer")
        for phase, actor, kind in (("B","koaptix_publication_verifier","ADMIT"),
                                   ("V","koaptix_publication_writer","VERDICT")):
            with self.subTest(phase=phase), self.assertRaises(c.ContractError):
                c.validate_ordinal(phase, kind, 0 if kind=="VERDICT" else 1, actor)

    def test_04_canonical_slot_cannot_escape(self):
        self.assertEqual(c.publication_key(c.PUBLICATION_TRACK,"2026-09-04"), (c.PUBLICATION_TRACK,"2026-09-04"))
        self.assertEqual(list(__import__('inspect').signature(c.publication_key).parameters), ["track","business_date"])
        for track in ("NEW_HASH_TRACK", "KOAPTIX_OFFICIAL_DAILY_v2"):
            with self.subTest(track=track), self.assertRaises(c.ContractError):
                c.publication_key(track,"2026-09-04")
        self.assertEqual(c.required_slots(["KOREA_ALL","SEOUL_ALL"]), ("GLOBAL","U:KOREA_ALL","U:SEOUL_ALL"))
        with self.assertRaises(c.ContractError):
            c.required_slots(["SEOUL_ALL"])

    def test_05_conflict_and_partial_are_not_existing_success(self):
        expected={"publication_track":c.PUBLICATION_TRACK,"D":"2026-09-04","G":"one","all_rows":[1,2]}
        for changed in (dict(expected,G="two"),dict(expected,all_rows=[1])):
            self.assertEqual(c.classify_effect(expected,changed),"BLOCK_CONFLICT")
        self.assertEqual(c.classify_effect(expected,expected,has_partial_footprint=True),"BLOCK_PARTIAL")

    def test_06_identical_repeat_preserves_full_value(self):
        expected={"publication_track":c.PUBLICATION_TRACK,"D":"2026-09-04","sealed_at":"fixed","all_rows":[1,2]}
        before=copy.deepcopy(expected)
        self.assertEqual(c.classify_effect(expected,copy.deepcopy(expected)),"SUCCESS_EXISTING")
        self.assertEqual(expected,before)
        self.assertEqual(c.classify_effect(expected,None),"ABSENT_AT_SNAPSHOT")

    def test_07_query_identity_and_exact_embedding(self):
        query=(ROOT/c.SOURCE_PATHS[3]).read_bytes()
        self.assertEqual(sha(query),c.PROJECTION_QUERY_SHA256)
        migration=(ROOT/c.SOURCE_PATHS[0]).read_bytes()
        self.assertEqual(migration.count(query),1)
        statements=sql_statements(query.decode())
        self.assertEqual(len(statements),1)
        self.assertFalse(re.search(r"\b(insert|update|delete|merge|truncate)\s+(into|from|public\.)",query.decode(),re.I))

    def test_08_projection_keys_and_golden_bundle(self):
        data=fp.assemble_projection(golden_projection())
        c.validate_generation_inputs(data)
        self.assertEqual(data["surface_components"][1]["snapshot_date"],None)
        self.assertEqual(data["surface_components"][1]["previous_snapshot_date"],None)
        self.assertEqual(data["affected_universe_codes"],["KOREA_ALL"])
        for key,(fields,_) in c.DATA_ARRAYS.items():
            self.assertEqual(set(data[key][0]),set(fields))
        # Field changes outside mere row count/digest membership must be seen.
        for family,field,value in (("global_rows","tier_code","S"),("service_rows","recovery_52w",1),
                                   ("snapshot_stage_rows","calculation_version","v2"),
                                   ("history_stage_rows","total_market_cap",1)):
            raw=golden_projection(); raw[family][0][field]=value
            with self.subTest(family=family,field=field),self.assertRaises(c.ContractError):
                fp.assemble_projection(raw)

    def test_09_writer_verifier_import_separation(self):
        for actor,other in (("writer","verifier"),("verifier","writer")):
            source=(ROOT/f"services/koaptix_daily/{actor}/api/index.py").read_text(encoding="utf-8")
            tree=ast.parse(source)
            imports=[ast.unparse(n) for n in ast.walk(tree) if isinstance(n,(ast.Import,ast.ImportFrom))]
            self.assertFalse(any("koaptix_daily."+other in x for x in imports))
            self.assertFalse(any("run_publication" in x for x in imports))

    def test_10_writer_has_no_verifier_credential(self):
        source=(ROOT/c.SOURCE_PATHS[6]).read_text(encoding="utf-8")
        self.assertNotIn("S1_VERIFIER_DSN",source)
        self.assertIn('DB_BINDING = "S1_WRITER_DSN"',source)
        self.assertNotIn("record_verification(",source)

    def test_11_verifier_has_no_writer_credential_or_action(self):
        source=(ROOT/c.SOURCE_PATHS[9]).read_text(encoding="utf-8")
        self.assertNotIn("S1_WRITER_DSN",source)
        self.assertIn('DB_BINDING = "S1_VERIFIER_DSN"',source)
        for name in ("prepare","seal","build","publish","derive"):
            self.assertNotIn("koaptix_s1."+name+"(",source)
        self.assertIn("REPEATABLE READ READ ONLY",source)

    def test_12_no_c4_runtime_machinery(self):
        for path in (c.SOURCE_PATHS[1],c.SOURCE_PATHS[2],c.SOURCE_PATHS[6],c.SOURCE_PATHS[9]):
            tree=ast.parse((ROOT/path).read_text(encoding="utf-8"))
            calls=[ast.unparse(n.func).lower() for n in ast.walk(tree) if isinstance(n,ast.Call)]
            self.assertFalse(any(any(word in name for word in ("hmac","latch","consume_authority","receipt_sign")) for name in calls))
        migration=(ROOT/c.SOURCE_PATHS[0]).read_text(encoding="utf-8").lower()
        self.assertNotRegex(migration,r"create\s+(temporary|temp)\s+table")
        self.assertEqual(len(re.findall(r"create table koaptix_s1\.",migration)),4)

    def test_13_no_legacy_finalize_runtime_call(self):
        for path in (c.SOURCE_PATHS[1],c.SOURCE_PATHS[2],c.SOURCE_PATHS[6],c.SOURCE_PATHS[9]):
            tree=ast.parse((ROOT/path).read_text(encoding="utf-8"))
            for n in ast.walk(tree):
                if isinstance(n,ast.Call):
                    self.assertNotIn("run_koaptix_safe_finalize",ast.unparse(n.func))
        sql=(ROOT/c.SOURCE_PATHS[0]).read_text(encoding="utf-8")
        self.assertNotRegex(sql,r"(?i)(perform|select|call)\s+public\.(run_koaptix_safe_finalize|append_daily_rank_history)\s*\(")

    def test_14_no_old_authority_execution_dependency(self):
        for path in (c.SOURCE_PATHS[1],c.SOURCE_PATHS[2],c.SOURCE_PATHS[6],c.SOURCE_PATHS[9]):
            tree=ast.parse((ROOT/path).read_text(encoding="utf-8"))
            for n in ast.walk(tree):
                if isinstance(n,(ast.Import,ast.ImportFrom)):
                    self.assertNotRegex(ast.unparse(n),r"authority|ack_bridge|receipt_writer|run_publication")

    def test_15_no_local_reference_runtime_dependency(self):
        for path in (c.SOURCE_PATHS[1],c.SOURCE_PATHS[2],c.SOURCE_PATHS[6],c.SOURCE_PATHS[9]):
            tree=ast.parse((ROOT/path).read_text(encoding="utf-8"))
            for n in tree.body:
                if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="CANONICAL_CONTRACT_JSON" for t in n.targets):
                    continue  # Exact immutable provenance is inert contract text.
                self.assertNotRegex(ast.unparse(n),r"(?i)c:[/\\]+tmp|\.handoff[/\\]+runs|reference_regeneration")

    def test_16_fixed_config_and_pinned_dependencies(self):
        w=json.loads((ROOT/c.SOURCE_PATHS[8]).read_text(encoding="utf-8")); v=json.loads((ROOT/c.SOURCE_PATHS[11]).read_text(encoding="utf-8"))
        self.assertEqual(w,{"functions":{"api/index.py":{"maxDuration":300}},"crons":[{"path":"/api/index","schedule":"5 15 * * *"}]})
        self.assertEqual(v,{"functions":{"api/index.py":{"maxDuration":60}}})
        for index in (7,10):
            self.assertEqual((ROOT/c.SOURCE_PATHS[index]).read_text(encoding="utf-8").strip(),"psycopg[binary]==3.3.3")

    def test_17_no_secret_literal_or_default_driver_work(self):
        self.assertEqual(pure_import_probe(ROOT),{"inert":True,"driver_imported":False,"actors":2})
        for path in c.SOURCE_PATHS:
            source=(ROOT/path).read_text(encoding="utf-8")
            self.assertNotRegex(source,r"postgres(?:ql)?://[^\s'\"]+:[^\s'\"]+@")
            self.assertNotRegex(source,r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.")

    def test_18_exact_surface_and_syntax(self):
        self.assertEqual(len(c.SOURCE_PATHS),12)
        self.assertEqual(len(set(c.SOURCE_PATHS)),12)
        for path in c.SOURCE_PATHS:
            data=(ROOT/path).read_bytes(); source=data.decode("utf-8")
            self.assertFalse(data.startswith(b"\xef\xbb\xbf"),path)
            self.assertTrue(data.endswith(b"\n"),path)
            self.assertFalse(any(line.rstrip()!=line for line in source.splitlines()),path)
            if path.endswith(".py"):
                compile(ast.parse(source),path,"exec",dont_inherit=True)
            elif path.endswith(".sql"):
                self.assertTrue(sql_statements(source))

    def test_full_equality_rejects_missing_extra_duplicate_and_non_digest_field(self):
        fields=("id","descriptive_value"); rows=[{"id":1,"descriptive_value":"original"}]
        self.assertTrue(c.full_rows_equal(rows,copy.deepcopy(rows),fields,("id",)))
        for changed in ([],[{"id":1,"descriptive_value":"changed"}],rows+[{"id":2,"descriptive_value":"original"}]):
            self.assertFalse(c.full_rows_equal(rows,changed,fields,("id",)))
        with self.assertRaises(c.ContractError):
            c.full_rows_equal(rows,rows+rows,fields,("id",))

    def test_clock_and_failed_history_not_relabelled(self):
        good=c.occurrence_plan_id("2026-09-04","2026-09-04T15:05:00.000000Z")
        self.assertEqual(len(good),64)
        for day,tick in (("2026-09-03","2026-09-03T15:05:00.000000Z"),
                         ("2026-09-04","2026-09-04T15:06:00.000000Z"),
                         ("2026-09-05","2026-09-04T15:05:00.000000Z")):
            with self.subTest(day=day,tick=tick),self.assertRaises(c.ContractError):
                c.occurrence_plan_id(day,tick)

    def test_reference_policy_preserves_business_dates(self):
        prior=fp.assemble_projection(golden_projection())
        current=fp.assemble_projection(golden_projection("2026-09-05"))
        self.assertEqual(fp.business_sha256(prior),fp.business_sha256(current))
        current["service_rows"][0]["apt_name_ko"]="changed"
        self.assertNotEqual(fp.business_sha256(prior),fp.business_sha256(current))
        self.assertEqual(prior["service_rows"][0]["snapshot_date"],"2026-09-04")

    def test_reference_receipt_requires_complete_bound_evidence(self):
        data=fp.assemble_projection(golden_projection())
        prior={"generation_id":"00000000-0000-4000-8000-000000000001","packet_sha256":"A"*64,
               "projection_contract_sha256":c.PROJECTION_IDENTITY,"data":data,
               "input_identity_sha256":"B"*64,"affected_universe_set_sha256":"C"*64}
        receipt={"expected_kst_day":"2026-09-06","observed_at":"2026-09-05T15:05:02.000000Z",
                 "classification":"NO_NEW_SOURCE_INPUT","observation_evidence_sha256":"D"*64,
                 "source_inventory_complete":True,"prior_generation_id":prior["generation_id"],
                 "prior_packet_sha256":prior["packet_sha256"],"prior_projection_contract_sha256":c.PROJECTION_IDENTITY,
                 "projection_contract_sha256":c.PROJECTION_IDENTITY,"prior_business_sha256":fp.business_sha256(data),
                 "current_business_sha256":fp.business_sha256(data),"prior_input_identity_sha256":"B"*64,
                 "current_input_identity_sha256":"B"*64,"affected_universe_set_sha256":"C"*64,
                 "prior_date_vector_sha256":data["surface_components"][1]["date_vector_sha256"]}
        result=fp.validate_daily_observation_reference(receipt,prior)
        self.assertFalse(result["official_target_D_rows_required"])
        for field,value in (("source_inventory_complete",False),("current_input_identity_sha256","E"*64),
                            ("classification","AS_PUBLISHED"),("prior_date_vector_sha256","F"*64),
                            ("expected_kst_day","2026-09-05")):
            altered=dict(receipt); altered[field]=value
            with self.subTest(field=field),self.assertRaises(c.ContractError):
                fp.validate_daily_observation_reference(altered,prior)
        # A SHA and boolean without stored comparison bytes cannot produce the
        # stronger S1 reference verdict, even if the inherited receipt parses.
        with self.assertRaises((c.ContractError,KeyError)):
            c.reference_material({"reference_prior":None})

    def test_reconciliation_never_manufactures_original_ack(self):
        for original in ("UNKNOWN","UNOBSERVED"):
            result=c.reconcile_result("EXACT_COMMITTED",original)
            self.assertEqual(result["result"],"RECOVERED_COMMITTED")
            self.assertEqual(result["original_ack"],original)
        self.assertEqual(c.reconcile_result("ABSENT_AT_SNAPSHOT","UNKNOWN")["durable_state"],"ABSENT_AT_SNAPSHOT")

    def test_driver_transaction_classification_no_retry(self):
        writer=actor_module("writer")
        class FakeConnection:
            def __init__(self,error): self.calls=[]; self.error=error
            def execute(self,sql,*args):
                self.calls.append(sql)
                if sql=="COMMIT": raise self.error
                return self
        class SerializationFailure(Exception): sqlstate="40001"
        for error,result in ((ConnectionError(),"ACK_UNKNOWN"),(SerializationFailure(),"FAIL_PRECOMMIT")):
            conn=FakeConnection(error)
            with self.subTest(result=result),self.assertRaises(writer.WorkflowStop) as caught:
                writer.transaction(conn,lambda:"one operation")
            self.assertEqual(caught.exception.result,result)
            self.assertEqual(conn.calls.count("COMMIT"),1)
            self.assertEqual(conn.calls.count("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE"),1)

    def test_restarted_writer_reconciles_before_new_admission(self):
        writer=actor_module("writer")
        class Conn:
            def close(self): pass
        evidence={"records":[{"phase":"S","record_kind":"ADMIT"}]}
        with patch.object(writer,"remaining",return_value=100),patch.object(writer,"connect",return_value=Conn()), \
             patch.object(writer,"transaction",side_effect=lambda conn,op,**kw:op()), \
             patch.object(writer,"json_call",return_value=evidence) as call, \
             patch.object(c,"terminal_record",return_value=None), \
             patch.object(writer,"reconcile",return_value={"classification":"EXACT_COMMITTED"}) as observed:
            result=writer.run_phase({"dsn":"unused synthetic argument"},{"plan_id":"A"*64},"S")
        self.assertEqual(result["result"],"RECOVERED_COMMITTED")
        self.assertEqual(result["original_ack"],"UNOBSERVED")
        self.assertEqual(observed.call_count,1)
        self.assertEqual(call.call_count,1)
        self.assertEqual(call.call_args.args[1],writer.READ)

    def test_writer_lost_admission_ack_reuses_observed_ordinal(self):
        writer=actor_module("writer")
        class Conn:
            def close(self): pass
        admission={"plan_id":"A"*64,"phase":"P","ordinal":1,"phase_identity":"B"*64}
        for committed in (True,False):
            calls=[]
            def transaction(conn,op,**kwargs):
                value=op(); calls.append(value)
                if len(calls)==1:
                    raise writer.WorkflowStop("ACK_UNKNOWN",ack="UNKNOWN",retryable=True,operation_result=value)
                return value
            observation={"classification":"ABSENT_AT_SNAPSHOT","admissions":[
                {"ordinal":1,"phase_identity":"B"*64,"actor":"koaptix_publication_writer"}] if committed else []}
            with self.subTest(committed=committed),patch.object(writer,"remaining",return_value=100), \
                 patch.object(writer,"connect",return_value=Conn()),patch.object(writer,"transaction",side_effect=transaction), \
                 patch.object(writer,"json_call",side_effect=[{"records":[]},admission,{"result":"PREPARED_FROZEN"}]) as sql, \
                 patch.object(c,"terminal_record",return_value=None),patch.object(writer,"reconcile",return_value=observation):
                if committed:
                    result=writer.run_phase({"dsn":"unused"},{"plan_id":"A"*64},"P")
                    self.assertEqual(result["result"],"SUCCESS_NEW")
                    self.assertEqual(sql.call_args.args[2],("A"*64,1))
                    self.assertEqual(sql.call_count,3)
                else:
                    with self.assertRaises(writer.WorkflowStop) as stopped:
                        writer.run_phase({"dsn":"unused"},{"plan_id":"A"*64},"P")
                    self.assertEqual(stopped.exception.result,"ACK_UNKNOWN")
                    self.assertEqual(sql.call_count,2)  # No fresh ordinal or business submit.
                self.assertEqual(sum(x.args[1]==writer.ADMIT for x in sql.call_args_list),1)

    def test_verifier_lost_admission_ack_reuses_observed_ordinal(self):
        verifier=actor_module("verifier")
        class Conn:
            def close(self): pass
        admission={"plan_id":"A"*64,"phase":"V","ordinal":1,"phase_identity":"B"*64}
        evidence={"session_user":"koaptix_publication_verifier","records":[
            {"phase":"V","record_kind":"ADMIT","ordinal":1,"phase_identity":"B"*64,"actor":"koaptix_publication_verifier"}]}
        verdict={"mode":"GENERATION","verdict":"PASS"}
        calls=[]
        def transaction(conn,op,**kwargs):
            value=op(); calls.append(value)
            if len(calls)==1:
                raise verifier.VerificationStop("ACK_UNKNOWN",operation_result=value)
            return value
        with patch.object(verifier,"connect",side_effect=[Conn(),Conn()]) as connect, \
             patch.object(verifier,"transaction",side_effect=transaction), \
             patch.object(verifier,"json_call",side_effect=[admission,evidence,verdict]) as sql, \
             patch.object(c,"terminal_record",return_value=None),patch.object(c,"generation_verdict",return_value=verdict):
            result=verifier.verify_request("unused",{"plan_id":"A"*64,"mode":"VERIFY"})
        self.assertEqual(result["verdict"],verdict)
        self.assertEqual(connect.call_count,2)
        self.assertEqual(sum(x.args[1]==verifier.ADMIT for x in sql.call_args_list),1)
        self.assertEqual(sum(x.args[1]==verifier.APPEND for x in sql.call_args_list),1)

    def test_verifier_completed_fail_is_immutable(self):
        verifier=actor_module("verifier")
        fail={"mode":"GENERATION","verdict":"FAIL","observed_at":"2026-09-04T15:05:02.000000Z"}
        class Conn:
            def close(self): pass
        with patch.object(verifier,"connect",return_value=Conn()), \
             patch.object(verifier,"transaction",side_effect=lambda conn,op,**kw:op()), \
             patch.object(verifier,"json_call",side_effect=[{"ordinal":0},{"session_user":"koaptix_publication_verifier"}]) as call, \
             patch.object(c,"terminal_record",return_value=fail):
            result=verifier.verify_request("unused synthetic argument",{"plan_id":"A"*64,"mode":"VERIFY"})
        self.assertEqual(result["verdict"],fail)
        self.assertEqual(call.call_count,2)  # No new append or rerun after FAIL.

    def test_sql_bundle_and_principal_structure(self):
        sql=(ROOT/c.SOURCE_PATHS[0]).read_text(encoding="utf-8").lower()
        self.assertIn("primary key(publication_track,d,slot_code)",sql)
        self.assertIn("deferrable initially deferred",sql)
        self.assertIn("except all",sql)
        self.assertIn("set constraints all immediate",sql)
        self.assertIn("v_verdict->>'mode' is distinct from 'generation'",sql)
        self.assertIn("to koaptix_publication_verifier;",sql)
        publish=sql.split("create function koaptix_s1.publish(")[1].split("$body$;",1)[0]
        self.assertGreater(publish.index("update public.koaptix_latest_board_publication"),publish.index("finish_phase(p_plan,'b'"))
        derive=sql.split("create function koaptix_s1.derive(")[1].split("$body$;",1)[0]
        self.assertNotRegex(derive,r"(update|delete from) public\.")
        self.assertIn("before truncate on public.koaptix_index_snapshot",sql)
        self.assertIn("source_inventory",sql)
        self.assertIn("append_reference(p_plan,p_verdict)",sql)


def run_inert(env_name):
    """Q2 opt-in only; never used by the default unittest invocation."""
    if env_name != "S1_INERT_DSN":
        raise ValueError("only the explicitly named inert binding is accepted")
    import os
    import ipaddress
    import psycopg
    from psycopg.conninfo import conninfo_to_dict
    dsn = os.environ[env_name]
    info = conninfo_to_dict(dsn)
    if set(info) - {"host","hostaddr","port","dbname","user","password","sslmode","connect_timeout"}:
        raise ValueError("inert connection options exceed the fixed local allowlist")
    host=info.get("host","")
    if not ipaddress.ip_address(host).is_loopback or (info.get("hostaddr") and info["hostaddr"]!=host):
        raise ValueError("literal loopback host required; no DNS or service indirection")
    if not re.fullmatch(r"koaptix_s1_inert_[a-z0-9_]+",info.get("dbname","")):
        raise ValueError("explicit isolated synthetic database name required")
    with psycopg.connect(dsn,connect_timeout=5,autocommit=True) as conn:
        # C06 asserts empty synthetic fixture namespace and exact existing
        # canonical baseline before installing only its local qualification data.
        conn.execute((ROOT/c.SOURCE_PATHS[5]).read_text(encoding="utf-8"),prepare=False)
        return {"result":"INERT_FIXTURE_INSTALLED","db_contract_qualification":"NOT_YET_RUN"}


if __name__ == "__main__":
    if "--package-only" in sys.argv or "--inert-dsn-env" in sys.argv:
        import argparse
        parser=argparse.ArgumentParser()
        parser.add_argument("--package-only",action="store_true")
        parser.add_argument("--actor",choices=("writer","verifier"))
        parser.add_argument("--output")
        parser.add_argument("--inert-dsn-env")
        args=parser.parse_args()
        if args.package_only:
            if args.inert_dsn_env or not args.actor or not args.output:
                parser.error("package mode requires actor/output and no DB option")
            print(json.dumps(package_actor(args.actor,args.output),sort_keys=True))
        else:
            print(json.dumps(run_inert(args.inert_dsn_env),sort_keys=True))
    else:
        unittest.main()
