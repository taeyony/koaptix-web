"""Deterministic, side-effect-free helpers for approved validation artifacts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable, Sequence


_SENSITIVE_ASSIGNMENT_RE = re.compile(
    r"(?i)\b(password|passwd|secret|token|api[_-]?key|authorization)"
    r"\s*([:=])\s*([^\s,;]+)"
)
_BEARER_RE = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{8,}")
_CREDENTIAL_URI_RE = re.compile(
    r"(?i)\b([a-z][a-z0-9+.-]*://)([^\s/@:]+):([^\s/@]+)@"
)
_PRIVATE_KEY_RE = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")
_LONG_SECRET_RE = re.compile(r"(?<![0-9a-fA-F])[A-Za-z0-9_~+/=-]{48,}(?![0-9a-fA-F])")
_RUNTIME_IDENTIFIER_RE = re.compile(r"[^a-z0-9]+")


def canonical_json_bytes(value: Any) -> bytes:
    """Return deterministic UTF-8 JSON with exactly one trailing LF."""

    text = json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return (text + "\n").encode("utf-8", errors="strict")


def _persistable_json_bytes(value: Any) -> bytes:
    initial = canonical_json_bytes(value).decode("utf-8", errors="strict")
    redacted = redact_text_before_persistence(initial, ())
    normalized = json.loads(redacted)
    data = canonical_json_bytes(normalized)
    findings = scan_secret_like_text(data.decode("utf-8", errors="strict"))
    if findings:
        raise ValueError("secret-like content remains after redaction: " + ",".join(findings))
    return data


def _write_bytes(path: str | Path, data: bytes) -> None:
    target = Path(path)
    if target.exists() and (target.is_symlink() or not target.is_file()):
        raise ValueError("artifact target is not a regular file")
    if not target.parent.exists() or target.parent.is_symlink():
        raise ValueError("artifact parent must be an existing regular directory")
    target.write_bytes(data)


def write_canonical_json(path: str | Path, value: Any) -> None:
    """Redact, scan, and persist one canonical JSON document."""

    _write_bytes(path, _persistable_json_bytes(value))


def write_jsonl(path: str | Path, rows: Iterable[Any]) -> None:
    """Persist one redacted canonical JSON value per LF-terminated line."""

    lines = [_persistable_json_bytes(row).rstrip(b"\n") for row in rows]
    _write_bytes(path, b"\n".join(lines) + (b"\n" if lines else b""))


def sha256_bytes(data: bytes) -> str:
    """Return a lowercase SHA-256 hexadecimal digest."""

    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str | Path) -> str:
    """Hash one regular non-symlink file without following substitutions."""

    source = Path(path)
    if source.is_symlink() or not source.is_file():
        raise ValueError("hash source must be a regular non-symlink file")
    return sha256_bytes(source.read_bytes())


def build_manifest_entries(paths: Iterable[str | Path]) -> list[str]:
    """Build lexically sorted SHA-256 manifest lines, excluding the manifest."""

    materialized = [Path(path) for path in paths]
    if not materialized:
        return []
    parents = {path.resolve(strict=False).parent for path in materialized}
    if len(parents) != 1:
        raise ValueError("manifest inputs must share one parent")
    entries: list[str] = []
    names: set[str] = set()
    for path in materialized:
        if path.name == "sha256_manifest.txt":
            raise ValueError("manifest cannot hash itself")
        if path.name in names:
            raise ValueError("duplicate manifest path")
        names.add(path.name)
        entries.append(f"{sha256_file(path)}  {path.name}")
    return sorted(entries, key=lambda item: item.split("  ", 1)[1])


def write_manifest(path: str | Path, entries: Sequence[str]) -> None:
    """Write validated lexical manifest entries with one final LF."""

    target = Path(path)
    normalized: list[str] = []
    seen: set[str] = set()
    for entry in entries:
        match = re.fullmatch(r"([0-9a-f]{64})  ([A-Za-z0-9._-]+)", entry)
        if match is None:
            raise ValueError("invalid manifest entry")
        relative_name = match.group(2)
        if relative_name == target.name:
            raise ValueError("manifest cannot hash itself")
        if relative_name in seen:
            raise ValueError("duplicate manifest entry")
        seen.add(relative_name)
        normalized.append(entry)
    normalized.sort(key=lambda item: item.split("  ", 1)[1])
    text = "\n".join(normalized) + ("\n" if normalized else "")
    redacted = redact_text_before_persistence(text, ())
    findings = scan_secret_like_text(redacted)
    if findings:
        raise ValueError("secret-like content remains in manifest")
    _write_bytes(target, redacted.encode("utf-8", errors="strict"))


def safe_artifact_path(root: str | Path, relative_path: str | Path) -> Path:
    """Resolve a relative artifact path without traversal or symlink escape."""

    root_path = Path(root)
    child = Path(relative_path)
    if child.is_absolute() or not child.parts:
        raise ValueError("artifact child must be relative")
    if any(part in {"", ".", ".."} for part in child.parts):
        raise ValueError("artifact traversal is forbidden")
    resolved_root = root_path.resolve(strict=False)
    candidate = (resolved_root / child).resolve(strict=False)
    try:
        candidate.relative_to(resolved_root)
    except ValueError as exc:
        raise ValueError("artifact path escapes its root") from exc
    probe = resolved_root
    if probe.exists() and (probe.is_symlink() or not probe.is_dir()):
        raise ValueError("artifact root is not a regular directory")
    for part in child.parts:
        probe = probe / part
        if probe.exists() and probe.is_symlink():
            raise ValueError("artifact path contains a symlink")
    return candidate


def redact_text_before_persistence(
    text: str, redaction_values: Iterable[str]
) -> str:
    """Remove explicit and recognizable sensitive values before persistence."""

    redacted = text.replace("\r\n", "\n").replace("\r", "\n")
    values = sorted(
        {value for value in redaction_values if isinstance(value, str) and value},
        key=len,
        reverse=True,
    )
    for value in values:
        redacted = redacted.replace(value, "[REDACTED]")
    redacted = _CREDENTIAL_URI_RE.sub(r"\1[REDACTED]@", redacted)
    redacted = _BEARER_RE.sub("Bearer [REDACTED]", redacted)
    redacted = _SENSITIVE_ASSIGNMENT_RE.sub(
        lambda match: f"{match.group(1)}{match.group(2)}[REDACTED]", redacted
    )
    return redacted


def scan_secret_like_text(text: str) -> list[str]:
    """Return finding categories only, never matched values."""

    findings: list[str] = []
    checks = (
        ("credential_uri", _CREDENTIAL_URI_RE),
        ("bearer_credential", _BEARER_RE),
        ("sensitive_assignment", _SENSITIVE_ASSIGNMENT_RE),
        ("private_key", _PRIVATE_KEY_RE),
    )
    for label, pattern in checks:
        if pattern.search(text):
            findings.append(label)
    for match in _LONG_SECRET_RE.finditer(text):
        candidate = match.group(0)
        if re.fullmatch(r"[0-9a-fA-F]{64}", candidate):
            continue
        if re.fullmatch(r"[A-Z0-9_=-]+", candidate):
            continue
        if (
            any(char.islower() for char in candidate)
            and any(char.isupper() for char in candidate)
            and any(char.isdigit() for char in candidate)
        ):
            findings.append("long_secret_like_value")
            break
    return findings


def sanitize_runtime_identifier(text: str) -> str:
    """Create a deterministic lowercase runtime-safe identifier."""

    normalized = _RUNTIME_IDENTIFIER_RE.sub("-", text.strip().lower()).strip("-")
    normalized = normalized[:63].rstrip("-")
    if not normalized or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", normalized):
        raise ValueError("runtime identifier cannot be sanitized safely")
    return normalized
