-- Post-publication recovery only. Execution requires a separate exact rollback
-- approval and a verified complete, nonrevoked canonical or exact V1 target.
SELECT public.koaptix_rollback_latest_board_publication(%(packet)s::jsonb);
