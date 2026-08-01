-- Transaction B only. Official rows, event and pointer-last-write are performed
-- atomically inside the reviewed SECURITY DEFINER entrypoint.
SELECT public.koaptix_publish_latest_board_generation(%(packet)s::jsonb);
