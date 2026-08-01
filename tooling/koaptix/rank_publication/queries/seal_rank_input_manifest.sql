-- TRACKED TYPED ACTION QUERY. NO CLIENT-SIDE TABLE DML.
-- Execute only through the separately activated manifest-sealer role.
select public.koaptix_seal_rank_input_manifest(%(packet)s::jsonb) as sealed_manifest;
