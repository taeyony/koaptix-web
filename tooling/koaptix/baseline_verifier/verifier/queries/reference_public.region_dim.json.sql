SET client_encoding = 'UTF8';
SET TimeZone = 'UTC';
SET DateStyle = 'ISO, YMD';
SET IntervalStyle = 'iso_8601';
SET extra_float_digits = 3;
SET bytea_output = 'hex';
SET search_path = pg_catalog, public;
SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY 1), '[]'::jsonb)::text AS json_document
FROM (
SELECT "region_id"::text AS "region_id", ("region_id" IS NULL) AS "region_id__is_null", "parent_region_id"::text AS "parent_region_id", ("parent_region_id" IS NULL) AS "parent_region_id__is_null", "region_type"::text AS "region_type", ("region_type" IS NULL) AS "region_type__is_null", "region_code"::text AS "region_code", ("region_code" IS NULL) AS "region_code__is_null", "region_name_ko"::text AS "region_name_ko", ("region_name_ko" IS NULL) AS "region_name_ko__is_null", "region_name_en"::text AS "region_name_en", ("region_name_en" IS NULL) AS "region_name_en__is_null", "full_name_ko"::text AS "full_name_ko", ("full_name_ko" IS NULL) AS "full_name_ko__is_null", "full_name_en"::text AS "full_name_en", ("full_name_en" IS NULL) AS "full_name_en__is_null", "display_order"::text AS "display_order", ("display_order" IS NULL) AS "display_order__is_null", "is_active"::text AS "is_active", ("is_active" IS NULL) AS "is_active__is_null", "created_at"::text AS "created_at", ("created_at" IS NULL) AS "created_at__is_null", "updated_at"::text AS "updated_at", ("updated_at" IS NULL) AS "updated_at__is_null" FROM "public"."region_dim" ORDER BY "region_id"
) q;
