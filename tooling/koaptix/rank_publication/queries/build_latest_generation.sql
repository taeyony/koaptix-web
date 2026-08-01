-- Transaction A only. Candidate stages and an inactive immutable generation are
-- built server-side; this client query contains no direct DML.
SELECT public.koaptix_build_rank_publication_generation(%(packet)s::jsonb);
