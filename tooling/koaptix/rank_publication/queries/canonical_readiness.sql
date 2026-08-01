-- TRACKED READ-ONLY QUERY DEFINITION. DOES NOT MUTATE DATABASE STATE.
-- Execute only in a separately authorized readiness transaction.
select public.koaptix_compute_rank_input_authority(%(snapshot_date)s::date)
  as canonical_rank_input_authority;
