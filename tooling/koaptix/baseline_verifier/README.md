# KOAPTIX Baseline Verifier Tooling Candidate

This directory contains the repository placement candidate for the KOAPTIX portable baseline verifier/export tooling.

Status: placement candidate only. It is not approved for production mutation, database writes, Docker execution, commit, push, deploy, caller wiring, or public exposure.

## Scope

- `run_r23.py` is a repository-local successor of the accepted R35 verifier runner, carrying the R30 extension-owner portable canonicalization contract and the R34/R35 `region_dim` primary-key export order.
- `verifier/queries/reference_public.region_dim.json.sql` orders by `region_id`, matching the accepted reference canonicalization order.
- `verifier/queries/extensions.json.sql` preserves the accepted raw extension-owner capture field; portable owner normalization is performed by `run_r23.py` for root comparison.
- `tests/` contains static local checks only. They do not connect to a database, execute SQL, run Docker, read secret files, or invoke application helpers.

## Runtime Inputs

The runner no longer hardcodes historical local artifact paths. Future disposable-proof lanes must provide explicit artifact roots through non-secret environment variables or prepare the `_external_artifact_inputs/` fixture directory before execution. R38 does not execute the runner.

## Review Boundary

This placement is intentionally narrow: no migrations, application source, package metadata, lockfiles, authority artifacts, generated captures, or service configuration are changed.
