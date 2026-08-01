-- Tracked typed action query. Execution requires a separate INITIAL_SEED approval.
SELECT public.koaptix_seed_latest_board_compatibility_generation(%(packet)s::jsonb);
