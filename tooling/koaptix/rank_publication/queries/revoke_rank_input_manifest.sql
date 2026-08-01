-- TRACKED TYPED ACTION QUERY. NO CLIENT-SIDE TABLE DML.
-- Execute only through the separately activated manifest-revoker role.
select public.koaptix_revoke_rank_input_manifest(%(packet)s::jsonb)
  as revoked_manifest;
