"""Offline tests of the real verifier: fake credentials, no live connector."""
from __future__ import annotations

import ast
from contextlib import ExitStack, redirect_stderr, redirect_stdout
import hashlib
import http.server  # Load standard-library socket types before installing tripwires.
import importlib.util
import io
import os
from pathlib import Path
import socket
import stat
import subprocess
import sys
from types import SimpleNamespace
import traceback
import unittest
from unittest import mock
from urllib.parse import quote


TEST_PATH = Path(__file__).resolve()
REPO_ROOT = TEST_PATH.parents[4]
API_PATH = TEST_PATH.parents[1] / "api" / "index.py"
CA_PATH = API_PATH.with_name("supabase-root-2021-ca.pem")
CA_SHA256 = "700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7"
CORE_KEYS = ("host", "port", "dbname", "user", "password")
FAKE_CORE = {
    "host": "aws-1-ap-northeast-2.pooler.supabase.com",
    "port": "5432",
    "dbname": "postgres",
    "user": "koaptix_publication_verifier.dsnqbadkyfmzeikzgvqp",
    "password": "SYNTHETIC-ONLY-PASSWORD",
}
APP_NAMES = ("S1_VERIFIER_DSN", "S1_VERIFY_REQUEST_SECRET")

# Patch the Python mapping reference, never the underlying OS environment. Library
# imports see an empty fake mapping; no existing environment values are inspected.
with mock.patch.object(os, "environ", {}):
    import psycopg
    from psycopg import conninfo, pq


class KeysOnlyEnvironment:
    """Expose fake names and fail on every attempted value read or mutation."""

    def __init__(self, names=APP_NAMES):
        self.names = tuple(names)
        self.value_reads = 0

    def __iter__(self):
        return iter(self.names)

    def forbidden_value_access(self, *args, **kwargs):
        self.value_reads += 1
        raise AssertionError("Environment values must remain unread")

    __getitem__ = get = items = values = forbidden_value_access
    __setitem__ = __delitem__ = clear = update = pop = forbidden_value_access


_blocked_calls = []
_suite_stack = None
verifier = None


def blocked(*args, **kwargs):
    _blocked_calls.append("forbidden_api")
    raise AssertionError("Live connection, defaults, network or subprocess call")


def load_verifier(name):
    spec = importlib.util.spec_from_file_location(name, API_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def setUpModule():
    global _suite_stack, verifier
    _suite_stack = ExitStack()
    try:
        _suite_stack.enter_context(mock.patch.object(os, "environ", {}))
        for name in ("socket", "create_connection", "getaddrinfo", "gethostbyname",
                     "gethostbyname_ex", "gethostbyaddr"):
            _suite_stack.enter_context(mock.patch.object(socket, name, side_effect=blocked))
        _suite_stack.enter_context(mock.patch.object(subprocess, "Popen", side_effect=blocked))
        _suite_stack.enter_context(mock.patch.object(os, "system", side_effect=blocked))
        _suite_stack.enter_context(mock.patch.object(psycopg, "connect", side_effect=blocked))
        _suite_stack.enter_context(mock.patch.object(psycopg.Connection, "connect", side_effect=blocked))
        parse_only = SimpleNamespace(parse=pq.Conninfo.parse, get_defaults=blocked)
        _suite_stack.enter_context(mock.patch.object(pq, "Conninfo", parse_only))
        _suite_stack.enter_context(mock.patch.object(
            pq, "PGconn", SimpleNamespace(connect=blocked, connect_start=blocked, ping=blocked)))
        _suite_stack.enter_context(mock.patch.object(conninfo, "conninfo_attempts", side_effect=blocked))
        _suite_stack.enter_context(mock.patch.object(conninfo, "conninfo_attempts_async", side_effect=blocked))
        original_path = sys.path[:]
        _suite_stack.callback(lambda: sys.path.__setitem__(slice(None), original_path))
        sys.path.insert(0, str(REPO_ROOT))
        with mock.patch.object(os, "environ", KeysOnlyEnvironment()):
            verifier = load_verifier("_koaptix_tls_verifier_under_test")
    except BaseException:
        _suite_stack.close()
        raise


def tearDownModule():
    if _suite_stack is not None:
        _suite_stack.close()


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.environment = KeysOnlyEnvironment()
        self.env_patch = mock.patch.object(os, "environ", self.environment)
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)
        verifier._verified_ca_path.cache_clear()
        self.addCleanup(verifier._verified_ca_path.cache_clear)

    def tearDown(self):
        self.assertEqual(self.environment.value_reads, 0)
        self.assertEqual(_blocked_calls, [])

    def canonical(self, values=None):
        values = FAKE_CORE if values is None else values
        return conninfo.make_conninfo(**{key: values[key] for key in CORE_KEYS if key in values})

    def assert_safe_failure(self, operation):
        output, errors = io.StringIO(), io.StringIO()
        with redirect_stdout(output), redirect_stderr(errors):
            with self.assertRaises(verifier.VerificationStop) as caught:
                operation()
        self.assertEqual(str(caught.exception), "FAIL_PRECOMMIT")
        self.assertEqual(caught.exception.result, "FAIL_PRECOMMIT")
        self.assertIsNone(caught.exception.__cause__)
        self.assertTrue(caught.exception.__suppress_context__)
        self.assertEqual(output.getvalue(), "")
        self.assertEqual(errors.getvalue(), "")

    def reject_dsn(self, dsn):
        with mock.patch.object(psycopg, "connect") as connector:
            with mock.patch.object(verifier, "_verified_ca_path") as ca_check:
                self.assert_safe_failure(lambda: verifier.connect(dsn))
        connector.assert_not_called()
        ca_check.assert_not_called()

    def test_canonical_credential_core(self):
        core = verifier._credential_core(self.canonical())
        self.assertEqual(core, FAKE_CORE)
        self.assertEqual(tuple(core), CORE_KEYS)

    def test_password_space_roundtrip(self):
        values = {**FAKE_CORE, "password": "SYNTHETIC password with spaces"}
        self.assertEqual(verifier._credential_core(self.canonical(values)), values)

    def test_password_special_characters_roundtrip(self):
        values = {**FAKE_CORE, "password": "SYNTHETIC % / : @ ? # &= + ' \\ space"}
        self.assertEqual(verifier._credential_core(self.canonical(values)), values)

    def test_length_16384_boundary_is_accepted(self):
        overhead = len(self.canonical({**FAKE_CORE, "password": "x"})) - 1
        dsn = self.canonical({**FAKE_CORE, "password": "x" * (16384 - overhead)})
        self.assertEqual(len(dsn), 16384)
        self.assertEqual(len(verifier._credential_core(dsn)["password"]), 16384 - overhead)

    def test_actual_nul_in_password(self):
        dsn = self.canonical({**FAKE_CORE, "password": "SYNTHETIC-NUL-MARKER"})
        self.reject_dsn(dsn.replace("SYNTHETIC-NUL-MARKER", "SYNTHETIC" + chr(0) + "PASSWORD"))

    def test_uri_percent_decodes_but_contract_rejects(self):
        password = "SYNTHETIC % / : @ ? # &= + ' \\ space"
        uri = ("postgresql://" + quote(FAKE_CORE["user"], safe="") + ":" +
               quote(password, safe="") + "@" + FAKE_CORE["host"] + ":5432/postgres")
        self.assertEqual(conninfo.conninfo_to_dict(uri), {**FAKE_CORE, "password": password})
        self.reject_dsn(uri)

    def test_duplicate_history_requires_canonical_comparison(self):
        duplicate = self.canonical() + " host=" + FAKE_CORE["host"]
        self.assertEqual(conninfo.conninfo_to_dict(duplicate), FAKE_CORE)
        self.assertEqual(conninfo.make_conninfo(duplicate), duplicate)
        self.reject_dsn(duplicate)

    def test_guard_allows_application_names_without_values(self):
        verifier._guard_transport_environment()
        self.assertEqual(self.environment.value_reads, 0)

    def test_guard_allows_unrelated_names_without_values(self):
        self.environment.names += ("APP_MODE", "PSYCOPG_IMPL")
        verifier._guard_transport_environment()

    def test_environment_guard_precedes_parsing(self):
        self.environment.names += ("PGHOSTADDR",)
        with mock.patch.object(verifier, "_credential_core") as parser:
            self.assert_safe_failure(lambda: verifier.connect(self.canonical()))
        parser.assert_not_called()

    def test_exact_trusted_overlay_and_preserved_connection_options(self):
        expected = {
            **FAKE_CORE, "sslmode": "verify-full", "sslrootcert": str(CA_PATH.resolve()),
            "gssencmode": "disable", "autocommit": True, "connect_timeout": 5,
            "application_name": "koaptix_s1_verifier",
            "options": "-c timezone=UTC -c lock_timeout=1000 -c statement_timeout=20000",
        }
        sentinel = object()
        with mock.patch.object(psycopg, "connect", return_value=sentinel) as connector:
            self.assertIs(verifier.connect(self.canonical()), sentinel)
        connector.assert_called_once_with(**expected)
        self.assertEqual(connector.call_args.args, ())
        self.assertIs(connector.call_args.kwargs["autocommit"], True)

    def test_connector_error_is_sanitized_without_logging(self):
        marker = "SYNTHETIC-CONNECTOR-EXCEPTION-MARKER"
        with mock.patch.object(psycopg, "connect", side_effect=RuntimeError(marker)):
            with mock.patch("logging.Logger._log") as logger:
                self.assert_safe_failure(lambda: verifier.connect(self.canonical()))
                try:
                    verifier.connect(self.canonical())
                except verifier.VerificationStop as exc:
                    self.assertNotIn(marker, "".join(traceback.format_exception(exc)))
        logger.assert_not_called()

    def test_parser_exception_is_sanitized_without_logging(self):
        marker = "SYNTHETIC-PARSER-EXCEPTION-MARKER"
        with mock.patch.object(conninfo, "conninfo_to_dict", side_effect=ValueError(marker)):
            with mock.patch("logging.Logger._log") as logger:
                self.reject_dsn(self.canonical())
        logger.assert_not_called()

    def test_import_is_inert_and_ca_validation_is_lazy(self):
        output, errors = io.StringIO(), io.StringIO()
        with mock.patch.object(Path, "read_bytes", side_effect=blocked):
            with redirect_stdout(output), redirect_stderr(errors):
                fresh = load_verifier("_koaptix_tls_verifier_inert_import")
        self.assertEqual(fresh._verified_ca_path.cache_info().currsize, 0)
        self.assertEqual(output.getvalue(), "")
        self.assertEqual(errors.getvalue(), "")

    def test_one_authoritative_psycopg_connector(self):
        tree = ast.parse(API_PATH.read_text(encoding="utf-8-sig"))
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)
                 and isinstance(node.func, ast.Attribute) and node.func.attr == "connect"
                 and isinstance(node.func.value, ast.Name) and node.func.value.id == "psycopg"]
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args, [])

    def test_accepted_public_ca_hash_and_absolute_sibling(self):
        data = CA_PATH.read_bytes()
        self.assertEqual(len(data), 1367)
        self.assertEqual(hashlib.sha256(data).hexdigest().upper(), CA_SHA256)
        result = Path(verifier._verified_ca_path())
        self.assertTrue(result.is_absolute())
        self.assertEqual(result, API_PATH.resolve(strict=True).with_name(CA_PATH.name))

    def test_ca_missing_metadata_fails_before_connector(self):
        with mock.patch.object(Path, "lstat", side_effect=FileNotFoundError("SYNTHETIC")):
            with mock.patch.object(psycopg, "connect") as connector:
                self.assert_safe_failure(lambda: verifier.connect(self.canonical()))
        connector.assert_not_called()
        self.assertEqual(verifier._verified_ca_path.cache_info().currsize, 0)

    def test_ca_wrong_bytes_fail(self):
        with mock.patch.object(Path, "read_bytes", return_value=b"SYNTHETIC-WRONG-CA"):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_read_error_is_safe(self):
        with mock.patch.object(Path, "read_bytes", side_effect=PermissionError("SYNTHETIC")):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_directory_metadata_rejected(self):
        metadata = SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_file_attributes=0)
        with mock.patch.object(Path, "lstat", return_value=metadata):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_symlink_metadata_rejected_mocked(self):
        # Portable lstat simulation: no OS symlink is created or followed.
        metadata = SimpleNamespace(st_mode=stat.S_IFLNK | 0o777, st_file_attributes=0)
        with mock.patch.object(Path, "lstat", return_value=metadata):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_windows_reparse_metadata_rejected_mocked(self):
        metadata = SimpleNamespace(st_mode=stat.S_IFREG | 0o644, st_file_attributes=0x400)
        with mock.patch.object(Path, "lstat", return_value=metadata):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_resolution_outside_module_sibling_rejected_mocked(self):
        original = Path.resolve

        def redirected(path, *args, **kwargs):
            if path == CA_PATH:
                return REPO_ROOT / "synthetic-escaped-ca.pem"
            return original(path, *args, **kwargs)

        with mock.patch.object(Path, "resolve", new=redirected):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_wrong_module_sibling_fails(self):
        with mock.patch.object(verifier, "__file__", str(TEST_PATH)):
            self.assert_safe_failure(verifier._verified_ca_path)

    def test_ca_cwd_independent(self):
        original = Path.cwd()
        try:
            os.chdir(REPO_ROOT / "services")
            self.assertEqual(verifier._verified_ca_path(), str(CA_PATH.resolve()))
        finally:
            os.chdir(original)

    def test_successful_ca_verification_is_cached(self):
        data = CA_PATH.read_bytes()
        with mock.patch.object(Path, "read_bytes", return_value=data) as reader:
            first = verifier._verified_ca_path()
            second = verifier._verified_ca_path()
        self.assertEqual(first, second)
        reader.assert_called_once()
        self.assertEqual(verifier._verified_ca_path.cache_info().currsize, 1)
        self.assertEqual(verifier._verified_ca_path.cache_info().hits, 1)

    def test_ca_failure_is_not_cached_and_recovery_rechecks_bytes(self):
        data = CA_PATH.read_bytes()
        with mock.patch.object(Path, "read_bytes", side_effect=[b"SYNTHETIC-BAD-CA", data]) as reader:
            self.assert_safe_failure(verifier._verified_ca_path)
            self.assertEqual(verifier._verified_ca_path.cache_info().currsize, 0)
            self.assertEqual(verifier._verified_ca_path(), str(CA_PATH.resolve()))
        self.assertEqual(reader.call_count, 2)

    def test_repeated_ca_failures_never_cache_success(self):
        with mock.patch.object(Path, "read_bytes", return_value=b"SYNTHETIC-BAD-CA") as reader:
            self.assert_safe_failure(verifier._verified_ca_path)
            self.assert_safe_failure(verifier._verified_ca_path)
        self.assertEqual(reader.call_count, 2)
        self.assertEqual(verifier._verified_ca_path.cache_info().currsize, 0)


def add_invalid_case(name, factory):
    def test(self):
        self.reject_dsn(factory(self))
    test.__name__ = "test_reject_dsn_" + name
    setattr(TransportTests, test.__name__, test)


for _name, _factory in {
    "missing": lambda self: None,
    "empty": lambda self: "",
    "non_string": lambda self: 7,
    "bytes": lambda self: b"SYNTHETIC",
    "nul_suffix": lambda self: self.canonical() + chr(0) + " sslmode=disable",
    "over_limit": lambda self: self.canonical({**FAKE_CORE, "password": "x" * 16385}),
    "malformed": lambda self: "password='SYNTHETIC-UNTERMINATED",
    "multihost": lambda self: self.canonical({**FAKE_CORE, "host": FAKE_CORE["host"] + ",other.invalid"}),
    "socket_host": lambda self: self.canonical({**FAKE_CORE, "host": "/tmp"}),
    "ip_host": lambda self: self.canonical({**FAKE_CORE, "host": "192.0.2.1"}),
    "dbname_indirection": lambda self: self.canonical({**FAKE_CORE, "dbname": "postgresql://other.invalid/db"}),
    "leading_space": lambda self: " " + self.canonical(),
    "trailing_space": lambda self: self.canonical() + " ",
    "reordered": lambda self: conninfo.make_conninfo(**dict(reversed(tuple(FAKE_CORE.items())))),
    "arbitrary_sixth_field": lambda self: self.canonical() + " synthetic_extra=value",
    "servicefile": lambda self: self.canonical() + " servicefile=synthetic-service-file",
    "tls_duplicate_conflict": lambda self: self.canonical() + " sslmode=disable sslmode=verify-full",
    "overridden_wrong_host": lambda self: "host=other.invalid " + self.canonical(),
}.items():
    add_invalid_case(_name, _factory)

for _key in CORE_KEYS:
    add_invalid_case("missing_" + _key, lambda self, key=_key: self.canonical({k: v for k, v in FAKE_CORE.items() if k != key}))
    add_invalid_case("empty_" + _key, lambda self, key=_key: self.canonical({**FAKE_CORE, key: ""}))
    add_invalid_case("duplicate_" + _key, lambda self, key=_key: self.canonical() + " " + conninfo.make_conninfo(**{key: FAKE_CORE[key]}))

for _key, _value in {"host": "other.invalid", "port": "6543", "dbname": "other", "user": "other"}.items():
    add_invalid_case("wrong_" + _key, lambda self, key=_key, value=_value: self.canonical({**FAKE_CORE, key: value}))

for _name, _directive in {
    "sslmode_require": "sslmode=require", "sslmode_matching": "sslmode=verify-full", "sslmode_disable": "sslmode=disable",
    "sslrootcert": "sslrootcert=synthetic-ca.pem", "sslcert": "sslcert=synthetic-client.pem",
    "sslkey": "sslkey=synthetic-key", "sslpassword": "sslpassword=SYNTHETIC", "sslcrl": "sslcrl=synthetic-crl",
    "sslcrldir": "sslcrldir=synthetic-crls", "sslsni": "sslsni=0", "requirepeer": "requirepeer=synthetic",
    "gssencmode_matching": "gssencmode=disable", "gssencmode_prefer": "gssencmode=prefer",
    "krbsrvname": "krbsrvname=synthetic", "gsslib": "gsslib=gssapi", "hostaddr": "hostaddr=192.0.2.1",
    "service": "service=synthetic", "connect_timeout": "connect_timeout=600", "application_name": "application_name=synthetic",
    "options": "options='-c default_transaction_read_only=off'", "target_session_attrs": "target_session_attrs=any",
    "channel_binding": "channel_binding=disable", "passfile": "passfile=synthetic-passfile",
    "client_encoding": "client_encoding=UTF8", "fallback_application_name": "fallback_application_name=synthetic",
    "requiressl_alias": "requiressl=0", "replication": "replication=true", "tls_min_version": "ssl_min_protocol_version=TLSv1",
}.items():
    add_invalid_case("extra_" + _name, lambda self, directive=_directive: self.canonical() + " " + directive)


def add_ambient_case(name):
    def test(self):
        self.environment.names += (name,)
        with mock.patch.object(psycopg, "connect") as connector:
            self.assert_safe_failure(lambda: verifier.connect(self.canonical()))
        connector.assert_not_called()
        self.assertEqual(self.environment.value_reads, 0)
    test.__name__ = "test_reject_ambient_" + name
    setattr(TransportTests, test.__name__, test)


for _name in ("PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD", "PGSSLMODE",
              "PGSSLROOTCERT", "PGSERVICE", "PGSERVICEFILE", "PGSYSCONFDIR", "PGOPTIONS", "PGGSSENCMODE",
              "PGUNKNOWN", "PG", "pgsslmode", "pGsErViCe", "OPENSSL_CONF", "OPENSSL_CONF_INCLUDE",
              "openssl_conf", "OpenSSL_Conf_Include"):
    add_ambient_case(_name)


if __name__ == "__main__":
    unittest.main()
