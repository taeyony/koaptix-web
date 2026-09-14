"""Fixed, undated natural wake for the S1 writer. Importing performs no work."""
from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from http.server import BaseHTTPRequestHandler
from pathlib import Path
import hashlib
import os
import stat
from tooling.koaptix.idempotent_publication import contracts as c
from tooling.koaptix.idempotent_publication import forward_projection as projection


DB_BINDING = "S1_WRITER_DSN"
ACTIONS = {
    "P": "select koaptix_s1.prepare(%s,%s::smallint)::text",
    "S": "select koaptix_s1.seal(%s,%s::smallint)::text",
    "A": "select koaptix_s1.build(%s,%s::smallint)::text",
    "B": "select koaptix_s1.publish(%s,%s::smallint)::text",
    "D": "select koaptix_s1.derive(%s,%s::smallint)::text",
}
READ = "select koaptix_s1.read_evidence(%s,%s)::text"
ADMIT = "select koaptix_s1.admit_phase(%s,%s)::text"
TRANSIENT_SQLSTATES = frozenset(("40001", "40P01", "55P03", "57014", "08000", "08003", "08006", "08001"))
_CREDENTIAL_KEYS = ("host", "port", "dbname", "user", "password")
_WRITER_IDENTITY = {
    "host": "aws-1-ap-northeast-2.pooler.supabase.com",
    "port": "5432",
    "dbname": "postgres",
    "user": "koaptix_publication_writer.dsnqbadkyfmzeikzgvqp",
}
_CA_NAME = "supabase-root-2021-ca.pem"
_CA_SHA256 = "700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7"


class WorkflowStop(Exception):
    def __init__(self, result: str, *, ack: str = "UNOBSERVED", retryable: bool = False, operation_result=None):
        super().__init__(result)
        self.result, self.ack, self.retryable = result, ack, retryable
        self.operation_result = operation_result


def _guard_transport_environment():
    for name in os.environ:
        upper = name.upper()
        if upper.startswith("PG") or upper in ("OPENSSL_CONF", "OPENSSL_CONF_INCLUDE"):
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True) from None


def _credential_core(dsn: str) -> dict[str, str]:
    try:
        from psycopg.conninfo import conninfo_to_dict, make_conninfo
        if type(dsn) is not str or not dsn or len(dsn) > 16384 or "\x00" in dsn:
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        parsed = conninfo_to_dict(dsn)
        if set(parsed) != set(_CREDENTIAL_KEYS):
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        if any(type(parsed[key]) is not str or not parsed[key] for key in _CREDENTIAL_KEYS):
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        if any(parsed[key] != value for key, value in _WRITER_IDENTITY.items()):
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        core = {key: parsed[key] for key in _CREDENTIAL_KEYS}
        # Parsing alone loses duplicate-key history; require our producer's exact form.
        if dsn != make_conninfo(**core):
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        return core
    except Exception:
        raise WorkflowStop("FAIL_PRECOMMIT", retryable=True) from None


@lru_cache(maxsize=1)
def _verified_ca_path() -> str:
    try:
        module_path = Path(__file__).resolve(strict=True)
        ca_path = module_path.with_name(_CA_NAME)
        metadata = ca_path.lstat()
        if not stat.S_ISREG(metadata.st_mode) or getattr(metadata, "st_file_attributes", 0) & 0x400:
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        resolved = ca_path.resolve(strict=True)
        if resolved != ca_path or resolved.parent != module_path.parent:
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        if hashlib.sha256(resolved.read_bytes()).hexdigest().upper() != _CA_SHA256:
            raise WorkflowStop("FAIL_PRECOMMIT", retryable=True)
        return str(resolved)
    except Exception:
        raise WorkflowStop("FAIL_PRECOMMIT", retryable=True) from None


def connect(dsn: str):
    try:
        _guard_transport_environment()
        core = _credential_core(dsn)
        ca_path = _verified_ca_path()
        import psycopg
        return psycopg.connect(**core, sslmode="verify-full", sslrootcert=ca_path,
                              gssencmode="disable", autocommit=True, connect_timeout=5,
                              application_name="koaptix_s1_writer",
                              options="-c timezone=UTC -c lock_timeout=1000 -c statement_timeout=20000")
    except Exception:
        raise WorkflowStop("FAIL_PRECOMMIT", retryable=True) from None


def json_call(conn, sql: str, parameters=()):
    row = conn.execute(sql, parameters).fetchone()
    if row is None or row[0] is None:
        raise WorkflowStop("BLOCK_PARTIAL")
    return c.load_exact_json(row[0])


def transaction(conn, operation, *, preparation=None):
    """One transaction and one COMMIT submission. No driver retry or reconnect."""
    commit_sent = False
    result = None
    try:
        conn.execute("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE")
        if preparation is not None:
            milliseconds = max(1, int(min(20, remaining(preparation)) * 1000))
            conn.execute("select set_config('statement_timeout',%s,true)", (str(milliseconds),))
            conn.execute("select set_config('lock_timeout',%s,true)", (str(min(1000, milliseconds)),))
        result = operation()
        commit_sent = True
        ack = conn.execute("COMMIT")
        if ack.statusmessage != "COMMIT":
            raise WorkflowStop("FAIL_PRECOMMIT")
        return result
    except Exception as exc:
        try:
            conn.execute("ROLLBACK")
        except Exception:
            pass
        if isinstance(exc, WorkflowStop):
            raise
        state = getattr(exc, "sqlstate", None)
        if commit_sent and (state is None or state.startswith("08")):
            raise WorkflowStop("ACK_UNKNOWN", ack="UNKNOWN", retryable=True, operation_result=result) from None
        if isinstance(exc, c.ContractError):
            raise WorkflowStop("BLOCK_CONFLICT") from None
        # Server BLOCK messages are classification only; raw driver errors and
        # connection strings never leave this boundary or enter observations.
        message = str(exc) if state == "P0001" else ""
        result = next((x for x in ("BLOCK_CONFLICT", "BLOCK_PARTIAL", "BLOCK_VERIFICATION",
                                  "BLOCK_PREDECESSOR", "BLOCK_BUDGET", "BLOCK_EXPIRED") if x in message), "FAIL_PRECOMMIT")
        raise WorkflowStop(result, retryable=state in TRANSIENT_SQLSTATES) from None


def remaining(preparation: dict) -> float:
    end = c._canonical_timestamp_value(preparation["admission_deadline"], "deadline")
    seconds = (end - datetime.now(timezone.utc)).total_seconds()
    if seconds <= 0:
        raise WorkflowStop("BLOCK_EXPIRED")
    return seconds


def phase_observation(phase, result, original_ack, reconciliation):
    return {"phase": phase, "result": result, "original_ack": original_ack,
            "reconciliation": reconciliation,
            "finished_at": datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")}


def verifier_request(config: dict, plan_id: str, mode: str, timeout: float):
    from urllib.request import Request, HTTPRedirectHandler, build_opener
    from urllib.parse import urlsplit

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    endpoint = urlsplit(config["verify_url"])
    if endpoint.scheme != "https" or not endpoint.hostname or endpoint.username or endpoint.password or endpoint.query or endpoint.fragment:
        raise WorkflowStop("BLOCK_VERIFICATION")
    if endpoint.path != "/api/index":
        raise WorkflowStop("BLOCK_VERIFICATION")
    data = c.canonical_json({"plan_id": plan_id, "mode": mode}).encode("utf-8")
    request = Request(config["verify_url"], data=data, method="POST", headers={
        "Content-Type": "application/json", "Authorization": "Bearer " + config["verify_request_secret"],
    })
    try:
        with build_opener(NoRedirect()).open(request, timeout=min(60, timeout)) as response:
            payload = c.load_exact_json(response.read(1_048_577).decode("utf-8"))
    except Exception:
        raise WorkflowStop("ACK_UNKNOWN", ack="UNKNOWN", retryable=True) from None
    if payload.get("plan_id") != plan_id:
        raise WorkflowStop("BLOCK_VERIFICATION")
    if payload.get("result") == "ACK_UNKNOWN":
        raise WorkflowStop("ACK_UNKNOWN", ack="UNKNOWN", retryable=True)
    return payload


def reconcile(config: dict, p: dict, phase: str) -> dict:
    response = verifier_request(config, p["plan_id"], "R_" + phase, min(60, remaining(p)))
    if response.get("classification") not in ("EXACT_COMMITTED", "ABSENT_AT_SNAPSHOT"):
        classification = response.get("classification")
        raise WorkflowStop("BLOCK_PARTIAL" if classification == "PARTIAL" else
                           "BLOCK_CONFLICT" if classification == "CONFLICT" else "BLOCK_VERIFICATION")
    return response


def run_phase(config: dict, p: dict, phase: str, *, initial_conn=None, initial_admission=None) -> dict:
    """Only one additional same-plan business attempt; each admission is durable."""
    recovered_absence = False
    original_ack = "UNOBSERVED"
    conn = initial_conn
    try:
        for attempt in (1, 2):
            remaining(p)
            if conn is None:
                conn = connect(config["dsn"])
            try:
                if initial_admission is not None:
                    admission, initial_admission = initial_admission, None
                else:
                    def admit():
                        evidence = json_call(conn, READ, (p["plan_id"], phase))
                        done = c.terminal_record(evidence, phase)
                        if done is not None:
                            if c.verify_evidence(evidence, phase) != "EXACT_COMMITTED":
                                raise WorkflowStop("BLOCK_PARTIAL")
                            return {"ordinal": 0, "existing": done}
                        prior = [r for r in evidence["records"] if r["phase"] == phase and r["record_kind"] == "ADMIT"]
                        if prior and not recovered_absence:
                            return {"needs_reconciliation": True}
                        if phase == "S":
                            prepared = c.terminal_record(evidence, "P")
                            if prepared is None:
                                raise WorkflowStop("BLOCK_PARTIAL")
                            assembled = projection.assemble_projection(prepared["projection"])
                        value = json_call(conn, ADMIT, (p["plan_id"], phase))
                        if phase == "S":
                            attached = json_call(conn, READ, (p["plan_id"], "S"))["publication"]
                            if c.canonical_json(attached["data"]) != c.canonical_json(assembled):
                                raise WorkflowStop("BLOCK_CONFLICT")
                        return value
                    admission = transaction(conn, admit, preparation=p)
                if admission.get("needs_reconciliation"):
                    observation = reconcile(config, p, phase)
                    if observation["classification"] == "EXACT_COMMITTED":
                        return phase_observation(phase, "RECOVERED_COMMITTED", "UNOBSERVED", "EXACT_COMMITTED")
                    recovered_absence = True
                    # This pass submitted no business operation or new admission.
                    admission = transaction(conn, admit, preparation=p)
                ordinal = admission["ordinal"]
                if ordinal == 0:
                    return phase_observation(phase, "SUCCESS_EXISTING", original_ack, "EXACT_COMMITTED")
                c.validate_ordinal(phase, "ADMIT", ordinal, "koaptix_publication_writer")
                remaining(p)
                transaction(conn, lambda: json_call(conn, ACTIONS[phase], (p["plan_id"], ordinal)), preparation=p)
                return phase_observation(phase, "SUCCESS_NEW", "OBSERVED", None)
            except WorkflowStop as exc:
                original_ack = exc.ack
                if not exc.retryable or attempt == 2:
                    raise
                observation = reconcile(config, p, phase)
                if observation["classification"] == "EXACT_COMMITTED":
                    return phase_observation(phase, "RECOVERED_COMMITTED", original_ack, "EXACT_COMMITTED")
                recovered_absence = True
                candidate = exc.operation_result
                if isinstance(candidate, dict) and candidate.get("phase") == phase and candidate.get("ordinal") in (1, 2):
                    exact = [r for r in observation.get("admissions", [])
                             if r["ordinal"] == candidate["ordinal"] and r["phase_identity"] == candidate["phase_identity"]
                             and r["actor"] == "koaptix_publication_writer"]
                    if len(exact) != 1:
                        # A stale absence snapshot is not proof of rollback.
                        # Do not burn a new ordinal just because admission ACK
                        # was lost before this caller submitted any business SQL.
                        raise WorkflowStop("ACK_UNKNOWN", ack="UNKNOWN")
                    initial_admission = candidate
            finally:
                conn.close()
                conn = None
        raise WorkflowStop("BLOCK_BUDGET")
    finally:
        if conn is not None:
            conn.close()


def append_observations(config, p, observations):
    audit = None
    try:
        audit = connect(config["dsn"])
        transaction(audit, lambda: json_call(audit, "select koaptix_s1.append_observations(%s,%s::jsonb)::text",
            (p["plan_id"], c.canonical_json({"contract_sha": c.CONTRACT_SHA256, "observations": observations}))))
    except WorkflowStop:
        # Lost observation ACK cannot change a canonical result or manufacture
        # an earlier ACK. Missing terminal audit remains visible as UNOBSERVED.
        pass
    finally:
        if audit is not None:
            audit.close()


def run_workflow(config: dict) -> dict:
    conn = connect(config["dsn"])
    try:
        admitted = transaction(conn, lambda: json_call(conn, "select koaptix_s1.admit_due_occurrence()::text"))
    except WorkflowStop as exc:
        conn.close()
        candidate = exc.operation_result
        if not isinstance(candidate, dict) or not candidate.get("preparation") or not candidate.get("P_admission"):
            raise
        p = candidate["preparation"]
        c.validate_frozen_plan(p)
        observation = reconcile(config, p, "P")
        admission = candidate["P_admission"]
        if not any(r["ordinal"] == admission["ordinal"] and r["phase_identity"] == admission["phase_identity"]
                   and r["actor"] == "koaptix_publication_writer" for r in observation.get("admissions", [])):
            raise WorkflowStop("ACK_UNKNOWN", ack="UNKNOWN")
        admitted = candidate
        conn = connect(config["dsn"])
    except Exception:
        conn.close()
        raise
    if admitted.get("result"):
        conn.close()
        return admitted
    p, observations = admitted["preparation"], []
    published = False
    result = "SUCCESS_NEW"
    phase = "P"
    try:
        c.validate_frozen_plan(p)
        observations.append(run_phase(config, p, "P", initial_conn=conn, initial_admission=admitted["P_admission"]))
        conn = None
        reference_conn = connect(config["dsn"])
        try:
            reference = transaction(reference_conn, lambda: json_call(reference_conn, READ, (p["plan_id"], "REFERENCE")), preparation=p)
        finally:
            reference_conn.close()
        # An already attached PUBLICATION is resumed unchanged. A new reference
        # can only terminate an occurrence before S/A/B/D effects exist.
        reference_kind = c.reference_candidate(reference) if reference["publication"] is None else None
        if reference_kind is not None:
            phase = "V"
            verified = None
            for reference_attempt in (1, 2):
                try:
                    verified = verifier_request(config, p["plan_id"], "REFERENCE", min(60, remaining(p)))
                    break
                except WorkflowStop as exc:
                    if not exc.retryable or reference_attempt == 2:
                        raise
            if (verified is None or verified.get("verdict", {}).get("verdict") != "PASS"
                    or verified["verdict"].get("mode") != "REFERENCE"):
                raise WorkflowStop("BLOCK_VERIFICATION")
            observations.append(phase_observation("V", verified["result"],
                                "OBSERVED" if reference_attempt == 1 else "UNKNOWN", "EXACT_COMMITTED"))
            append_observations(config, p, observations)
            return {"plan_id": p["plan_id"], "D": p["D"], "result": reference_kind,
                    "published": False, "verdict": verified["verdict"]}
        for phase in ("S", "A"):
            observations.append(run_phase(config, p, phase))
        phase = "V"
        original_ack = "OBSERVED"
        verified = None
        for verification_attempt in (1, 2):
            try:
                verified = verifier_request(config, p["plan_id"], "VERIFY", min(60, remaining(p)))
                break
            except WorkflowStop as exc:
                original_ack = "UNKNOWN"
                if not exc.retryable or verification_attempt == 2:
                    raise
        if verified is None or verified.get("verdict", {}).get("verdict") != "PASS":
            raise WorkflowStop("BLOCK_VERIFICATION", ack=original_ack)
        observations.append(phase_observation("V", "SUCCESS_NEW" if original_ack == "OBSERVED" else "RECOVERED_COMMITTED",
                                              original_ack, "EXACT_COMMITTED"))
        phase = "B"
        observations.append(run_phase(config, p, "B"))
        confirmation = reconcile(config, p, "B")
        if confirmation["classification"] != "EXACT_COMMITTED":
            raise WorkflowStop("BLOCK_PARTIAL")
        published = True
        phase = "D"
        observations.append(run_phase(config, p, "D"))
    except c.ContractError:
        result = "BLOCK_VERIFICATION"
        observations.append(phase_observation(phase, result, "UNOBSERVED", None))
    except WorkflowStop as exc:
        result = "PUBLISHED_DERIVATION_PENDING" if published and phase == "D" else exc.result
        observations.append(phase_observation(phase, exc.result, exc.ack, None))
    finally:
        if conn is not None:
            conn.close()
    append_observations(config, p, observations)
    return {"plan_id": p["plan_id"], "D": p["D"], "result": result, "published": published}


class handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        return

    def do_GET(self):
        import os
        from secrets import compare_digest
        cron_secret = os.environ.get("CRON_SECRET")
        if self.path != "/api/index" or not cron_secret or not compare_digest(self.headers.get("Authorization", ""), "Bearer " + cron_secret):
            self.send_error(403)
            return
        try:
            config = {"dsn": os.environ[DB_BINDING], "verify_url": os.environ["S1_VERIFY_URL"],
                      "verify_request_secret": os.environ["S1_VERIFY_REQUEST_SECRET"]}
            payload = run_workflow(config)
        except WorkflowStop as exc:
            payload = {"result": exc.result, "original_ack": exc.ack}
        except Exception:
            payload = {"result": "FAIL_PRECOMMIT"}
        body = c.canonical_json(payload).encode("utf-8")
        self.send_response(200 if payload.get("result") in ("SUCCESS_NEW", "SUCCESS_EXISTING", "NOOP_ALREADY_COMPLETE", "BLOCK_EXPIRED", "NO_NEW_SOURCE_INPUT", "VERIFIED_NO_OUTPUT_CHANGE") else 500)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
