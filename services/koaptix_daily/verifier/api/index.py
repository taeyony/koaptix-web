"""Independent S1 committed-state verifier. Importing is inert."""
from __future__ import annotations

from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
import hashlib
import os
import stat
from tooling.koaptix.idempotent_publication import contracts as c


DB_BINDING = "S1_VERIFIER_DSN"
MODES = frozenset(("VERIFY", "REFERENCE", "R_P", "R_S", "R_A", "R_B", "R_D"))
READ = "select koaptix_s1.read_evidence(%s,%s)::text"
ADMIT = "select koaptix_s1.admit_phase(%s,%s)::text"
APPEND = "select koaptix_s1.record_verification(%s,%s::jsonb)::text"
_CREDENTIAL_KEYS = ("host", "port", "dbname", "user", "password")
_VERIFIER_IDENTITY = {
    "host": "aws-1-ap-northeast-2.pooler.supabase.com",
    "port": "5432",
    "dbname": "postgres",
    "user": "koaptix_publication_verifier.dsnqbadkyfmzeikzgvqp",
}
_CA_NAME = "supabase-root-2021-ca.pem"
_CA_SHA256 = "700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7"


class VerificationStop(Exception):
    def __init__(self, result: str, *, operation_result=None):
        super().__init__(result)
        self.result = result
        self.operation_result = operation_result


def _guard_transport_environment():
    for name in os.environ:
        upper = name.upper()
        if upper.startswith("PG") or upper in ("OPENSSL_CONF", "OPENSSL_CONF_INCLUDE"):
            raise VerificationStop("FAIL_PRECOMMIT") from None


def _credential_core(dsn: str) -> dict[str, str]:
    try:
        from psycopg.conninfo import conninfo_to_dict, make_conninfo
        if type(dsn) is not str or not dsn or len(dsn) > 16384 or "\x00" in dsn:
            raise VerificationStop("FAIL_PRECOMMIT")
        parsed = conninfo_to_dict(dsn)
        if set(parsed) != set(_CREDENTIAL_KEYS):
            raise VerificationStop("FAIL_PRECOMMIT")
        if any(type(parsed[key]) is not str or not parsed[key] for key in _CREDENTIAL_KEYS):
            raise VerificationStop("FAIL_PRECOMMIT")
        if any(parsed[key] != value for key, value in _VERIFIER_IDENTITY.items()):
            raise VerificationStop("FAIL_PRECOMMIT")
        core = {key: parsed[key] for key in _CREDENTIAL_KEYS}
        # Parsing alone loses duplicate-key history; require our producer's exact form.
        if dsn != make_conninfo(**core):
            raise VerificationStop("FAIL_PRECOMMIT")
        return core
    except Exception:
        raise VerificationStop("FAIL_PRECOMMIT") from None


@lru_cache(maxsize=1)
def _verified_ca_path() -> str:
    try:
        module_path = Path(__file__).resolve(strict=True)
        ca_path = module_path.with_name(_CA_NAME)
        metadata = ca_path.lstat()
        if not stat.S_ISREG(metadata.st_mode) or getattr(metadata, "st_file_attributes", 0) & 0x400:
            raise VerificationStop("FAIL_PRECOMMIT")
        resolved = ca_path.resolve(strict=True)
        if resolved != ca_path or resolved.parent != module_path.parent:
            raise VerificationStop("FAIL_PRECOMMIT")
        if hashlib.sha256(resolved.read_bytes()).hexdigest().upper() != _CA_SHA256:
            raise VerificationStop("FAIL_PRECOMMIT")
        return str(resolved)
    except Exception:
        raise VerificationStop("FAIL_PRECOMMIT") from None


def connect(dsn: str):
    try:
        _guard_transport_environment()
        core = _credential_core(dsn)
        ca_path = _verified_ca_path()
        import psycopg
        return psycopg.connect(**core, sslmode="verify-full", sslrootcert=ca_path,
                              gssencmode="disable", autocommit=True, connect_timeout=5,
                              application_name="koaptix_s1_verifier",
                              options="-c timezone=UTC -c lock_timeout=1000 -c statement_timeout=20000")
    except Exception:
        raise VerificationStop("FAIL_PRECOMMIT") from None


def json_call(conn, sql: str, parameters=()):
    row = conn.execute(sql, parameters).fetchone()
    if row is None or row[0] is None:
        raise VerificationStop("BLOCK_PARTIAL")
    return c.load_exact_json(row[0])


def transaction(conn, operation, *, readonly=False, deadline=None):
    commit_sent = False
    result = None
    try:
        conn.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" if readonly else
                     "BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE")
        if deadline is not None:
            remaining = (c._canonical_timestamp_value(deadline, "deadline") - datetime.now(timezone.utc)).total_seconds()
            if remaining <= 0:
                raise VerificationStop("BLOCK_EXPIRED")
            milliseconds = max(1, int(min(20, remaining) * 1000))
            conn.execute("select set_config('statement_timeout',%s,true)", (str(milliseconds),))
            conn.execute("select set_config('lock_timeout',%s,true)", (str(min(1000, milliseconds)),))
        result = operation()
        commit_sent = True
        ack = conn.execute("COMMIT")
        if ack.statusmessage != "COMMIT":
            raise VerificationStop("FAIL_PRECOMMIT")
        return result
    except Exception as exc:
        try:
            conn.execute("ROLLBACK")
        except Exception:
            pass
        if isinstance(exc, VerificationStop):
            raise
        state = getattr(exc, "sqlstate", None)
        if commit_sent and not readonly and (state is None or state.startswith("08")):
            raise VerificationStop("ACK_UNKNOWN", operation_result=result) from None
        raise VerificationStop("BLOCK_VERIFICATION" if isinstance(exc, c.ContractError) else "FAIL_PRECOMMIT") from None


def verdict_response(verdict: dict) -> dict:
    # Full immutable reference comparison bytes stay in the protected record.
    # The informational HTTP result carries the original clock and identity,
    # avoiding retransmission of every prior generation row to W.
    return {k: v for k, v in verdict.items() if k != "comparison_evidence"}


def verify_request(dsn: str, request: dict) -> dict:
    c._exact_object(request, ("plan_id", "mode"), "fixed verifier request")
    plan_id = c._require_sha256(request, "plan_id")
    mode = request["mode"]
    if mode not in MODES:
        raise c.ContractError("unknown verifier operation")
    phase = "V" if mode in ("VERIFY", "REFERENCE") else mode
    # Each request owns one fresh independent connection and explicitly closes
    # its admission transaction before opening the committed read-only snapshot.
    conn = connect(dsn)
    try:
        read_mode = "A" if mode == "VERIFY" else "REFERENCE" if mode == "REFERENCE" else mode[2:]
        evidence = None
        try:
            admission = transaction(conn, lambda: json_call(conn, ADMIT, (plan_id, phase)))
        except VerificationStop as exc:
            candidate = exc.operation_result
            if exc.result != "ACK_UNKNOWN" or not isinstance(candidate, dict) or candidate.get("ordinal") not in (1, 2):
                raise
            conn.close()
            conn = connect(dsn)
            evidence = transaction(conn, lambda: json_call(conn, READ, (plan_id, read_mode)), readonly=True)
            exact = [r for r in evidence["records"] if r["phase"] == phase and r["record_kind"] == "ADMIT"
                     and r["ordinal"] == candidate["ordinal"] and r["phase_identity"] == candidate["phase_identity"]
                     and r["actor"] == "koaptix_publication_verifier"]
            if len(exact) != 1:
                raise VerificationStop("ACK_UNKNOWN")
            admission = candidate  # No new admission/ordinal for a lost admission ACK.
        deadline = admission.get("admission_deadline") if phase == "V" and admission["ordinal"] else None
        if evidence is None:
            evidence = transaction(conn, lambda: json_call(conn, READ, (plan_id, read_mode)), readonly=True, deadline=deadline)
        if evidence["session_user"] != "koaptix_publication_verifier":
            raise VerificationStop("BLOCK_VERIFICATION")
        if mode not in ("VERIFY", "REFERENCE"):
            try:
                classification = c.verify_evidence(evidence, mode[2:])
            except (c.ContractError, KeyError, TypeError, ValueError):
                classification = "PARTIAL"
            response = {"plan_id": plan_id, "classification": classification, "original_ack": "UNOBSERVED"}
            response["admissions"] = [
                {k: r[k] for k in ("ordinal", "phase_identity", "actor")}
                for r in evidence["records"] if r["phase"] == mode[2:] and r["record_kind"] == "ADMIT"
            ]
            if classification == "EXACT_COMMITTED" and mode in ("R_B", "R_D"):
                response["currentness"] = c.publication_currentness(evidence)
            return response
        prior = c.terminal_record(evidence, "V", "VERDICT")
        if admission["ordinal"] == 0:
            if prior is None:
                raise VerificationStop("BLOCK_PARTIAL")
            # A completed FAIL remains FAIL. The original stored observation
            # clock is preserved; this read proves no original HTTP/COMMIT ACK.
            if prior["mode"] != ("REFERENCE" if mode == "REFERENCE" else "GENERATION"):
                raise VerificationStop("BLOCK_VERIFICATION")
            if prior["verdict"] == "PASS":
                if mode == "REFERENCE":
                    if c.reference_verdict(evidence, observed_at=prior["observed_at"]) != prior:
                        raise VerificationStop("BLOCK_VERIFICATION")
                elif c.verify_evidence(evidence, "V") != "EXACT_COMMITTED":
                    raise VerificationStop("BLOCK_VERIFICATION")
            return {"plan_id": plan_id, "verdict": verdict_response(prior), "result": "SUCCESS_EXISTING"}
        c.validate_ordinal("V", "ADMIT", admission["ordinal"], "koaptix_publication_verifier")
        verdict = c.reference_verdict(evidence) if mode == "REFERENCE" else c.generation_verdict(evidence)
        stored = transaction(conn, lambda: json_call(conn, APPEND, (plan_id, c.canonical_json(verdict))), deadline=deadline)
        return {"plan_id": plan_id, "verdict": verdict_response(stored), "result": "SUCCESS_NEW"}
    finally:
        conn.close()


class handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        return

    def do_POST(self):
        import os
        from secrets import compare_digest
        request_secret = os.environ.get("S1_VERIFY_REQUEST_SECRET")
        if self.path != "/api/index" or not request_secret or not compare_digest(self.headers.get("Authorization", ""), "Bearer " + request_secret):
            self.send_error(403)
            return
        request = None
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096:
                raise c.ContractError("bounded request required")
            request = c.load_exact_json(self.rfile.read(length).decode("utf-8"))
            result = verify_request(os.environ[DB_BINDING], request)
        except VerificationStop as exc:
            result = {"plan_id": request.get("plan_id") if isinstance(request, dict) else None,
                      "result": exc.result, "classification": "UNVERIFIABLE"}
        except Exception:
            result = {"plan_id": request.get("plan_id") if isinstance(request, dict) else None,
                      "result": "BLOCK_VERIFICATION", "classification": "UNVERIFIABLE"}
        body = c.canonical_json(result).encode("utf-8")
        # A completed FAIL is an observed application result, not an invitation
        # for the HTTP client to retry it as a transport failure.
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
