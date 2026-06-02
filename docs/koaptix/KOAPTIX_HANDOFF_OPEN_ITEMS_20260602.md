# KOAPTIX Handoff Open Items

## Current Public / Service Baselines

- SGG_11710 baseline: 2026-06-01 / 177 rows / 177 distinct complexes.
- GANGWON_ALL baseline: 2026-06-01 / 71 rows / 71 distinct complexes.
- JEONBUK_ALL: disabled; blocked pending latest-board evidence.

## Supabase Data API Explicit GRANT Advisory

Supabase announced a Data API exposure change for new public schema tables.

- May 30 2026: new projects default to not exposing new public tables to the Data API automatically.
- October 30 2026: existing projects are affected for newly created public tables.
- Existing tables keep current grants and are not treated as immediately broken by this advisory.
- Future public table/view/function creation flows must include explicit GRANT only when Data API/PostgREST/GraphQL/supabase-js exposure is intended.

This is a future read-only audit/open item. It is not approval to run GRANT, REVOKE, ALTER DEFAULT PRIVILEGES, RLS, policy, schema, table, view, function, or migration changes.

## Required Next Lane

P-SUPABASE-GRANTS.0 read-only Data API grant exposure audit

Purpose:
Inventory public schema tables/views/functions and current role privileges, compare intended Data API exposure with actual grants, and prepare grant templates for future migrations.

## Supabase Do-Not-Run List

- Do not run GRANT in the audit lane.
- Do not run REVOKE in the audit lane.
- Do not run ALTER DEFAULT PRIVILEGES in the audit lane.
- Do not make RLS, policy, schema, table, view, or function changes in the audit lane.
- Do not use blanket grants.
- Do not expose service-role keys, DB URLs, connection strings, tokens, credentials, or secret env values.

## Suggested Read-Only Audit References

Future audit planning may reference object privilege inventory for public tables, views, and materialized views; function EXECUTE privilege inventory for public functions; and the Supabase dashboard Security Advisor review. These are references for a later explicit read-only audit lane, not mandatory execution in this closeout lane.

## Marker

P-SUPABASE-GRANTS.0_BACKLOG_RECORDED
