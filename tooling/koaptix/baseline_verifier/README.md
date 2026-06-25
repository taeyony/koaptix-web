# KOAPTIX Baseline Verifier Tooling

This directory contains the repository placement for the KOAPTIX portable baseline verifier/export tooling.

Status: repository tooling placement with R51 006 artifact provenance bound for runner/manifest provenance only. It is not approved for production mutation, database writes, SQL execution, Docker execution, commit, push, deploy, caller wiring, public exposure, full runner execution, P3 execution, Supabase Security Advisor remediation, expected-root updates, or R51 artifact root mutation.

## Scope

- `run_r23.py` is a repository-local successor of the accepted R35 verifier runner, carrying the R30 extension-owner portable canonicalization contract and the R34/R35 `region_dim` primary-key export order.
- `run_r23.py` records the accepted R51 006 artifact package metadata and preserves the three R51 expected roots exactly.
- `verifier/queries/reference_public.region_dim.json.sql` orders by `region_id`, matching the accepted reference canonicalization order.
- `verifier/queries/extensions.json.sql` preserves the accepted raw extension-owner capture field; portable owner normalization is performed by `run_r23.py` for root comparison.
- `tests/` contains static local checks only. They do not connect to a database, execute SQL, run Docker, read secret files, or invoke application helpers.

## R51 006 Provenance Binding

The accepted R51 006 artifact package is bound as provenance, not as proof of production mutation or permanent security acceptance:

- artifact root: `C:\tmp\koaptix_r51_wave001c_reference_regeneration_006`
- artifact index SHA256: `A6C27FC3068876FC7F710E9FD7E7855F03EFEB57A573437328765C640602547A`
- SHA256SUMS SHA256: `29F9A37269A4883C0FF6E0C82A1D2B71280C007F2D2E0C91A5126CC11324F01F`
- official artifact count, excluding index and SHA256SUMS: `438`
- structural root: `BCF834D27484723D3CBDF2693D77CF7840D525120DFFFC2A46C29A5A0D8B087E`
- security root: `8977B7518D1F5085A21FFDAD97FB536E09A530F0AFDAD908021562C70777DDF5`
- reference seed root: `8D493816623014089760CFEA2278CC234FBCCD26C38C7B8FBFBC844575766C87`

The context/default EXECUTE policy boundary is `EXPLICITLY_DEFERRED_FOR_RUNNER_MANIFEST_BINDING_PROVENANCE_ONLY_NOT_PERMANENT_SECURITY_ACCEPTANCE`. This deferment applies only to runner/manifest binding provenance. It does not approve DB remediation, Supabase Security Advisor remediation, full runner execution, deploy, P3, DB writes, SQL, expected-root updates, or R51 artifact root mutation.

## Runtime Inputs

The runner no longer hardcodes historical local artifact paths. Future disposable-proof lanes must provide explicit artifact roots through non-secret environment variables or prepare the `_external_artifact_inputs/` fixture directory before execution. R38 does not execute the runner.

## R51 Artifact-Only Entrypoint

`run_r23.py generate-fixture-reference-package --artifact-root <new-root>` is a separated fixture/reference package generation route for a future approved R51 lane. It requires an explicit new artifact root, rejects an existing root by default, preserves the `region_dim` `region_id` authority, and stops before disposable Docker/database proof phases.

This placement does not approve running that command, creating or mutating R51 artifacts, connecting to any database, running SQL, running P3, running the full verifier, or modifying repository reference files.

## Review Boundary

This placement is intentionally narrow: no migrations, application source, package metadata, lockfiles, authority artifacts, generated captures, or service configuration are changed.
