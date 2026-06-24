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

## R51 Artifact-Only Entrypoint

`run_r23.py generate-fixture-reference-package --artifact-root <new-root>` is a separated fixture/reference package generation route for a future approved R51 lane. It requires an explicit new artifact root, rejects an existing root by default, preserves the `region_dim` `region_id` authority, and stops before disposable Docker/database proof phases.

This placement does not approve running that command, creating R51 artifacts, connecting to any database, running P3, or modifying repository reference files.

## Review Boundary

This placement is intentionally narrow: no migrations, application source, package metadata, lockfiles, authority artifacts, generated captures, or service configuration are changed.
