SET client_encoding = 'UTF8';
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
SET IntervalStyle = 'iso_8601';
SET extra_float_digits = 3;
SET bytea_output = 'hex';
SET search_path = pg_catalog, public;
SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.extname), '[]'::jsonb)::text AS json_document
FROM (
SELECT e.oid::text AS oid,e.extname,n.nspname AS schema_name,e.extversion,e.extconfig::text AS extconfig,e.extcondition::text AS extcondition,pg_get_userbyid(e.extowner) AS owner FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
) q;
