-- query: RUNTIME_VERSION
SELECT current_database() AS database_name,
       current_user AS database_user,
       current_setting('server_version') AS server_version,
       current_setting('server_version_num') AS server_version_num,
       version() AS version_text;

-- query: DATABASE_LOCALE
SELECT d.datname AS database_name,
       pg_encoding_to_char(d.encoding) AS database_encoding,
       current_setting('client_encoding') AS client_encoding,
       d.datcollate AS lc_collate,
       d.datctype AS lc_ctype,
       d.datlocprovider::text AS locale_provider
FROM pg_catalog.pg_database AS d
WHERE d.datname = current_database()
ORDER BY d.datname COLLATE "C";

-- query: PREAPPLY_OBJECT_ABSENCE
SELECT 'relation' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
UNION ALL
SELECT 'constraint' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_namespace AS n ON n.oid = con.connamespace
WHERE n.nspname = 'public'
  AND con.conname LIKE 'koaptix_identity_reference_code%'
UNION ALL
SELECT 'policy' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_policy AS pol
JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
UNION ALL
SELECT 'index' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_index AS i
JOIN pg_catalog.pg_class AS c ON c.oid = i.indrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
UNION ALL
SELECT 'trigger' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_trigger AS t
JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
UNION ALL
SELECT 'dependency' AS object_kind, count(*)::bigint AS object_count
FROM pg_catalog.pg_depend AS d
JOIN pg_catalog.pg_class AS c ON c.oid = d.refobjid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE d.refclassid = 'pg_catalog.pg_class'::regclass
  AND n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
ORDER BY object_kind COLLATE "C";

-- query: TABLE_IDENTITY
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relkind::text AS relation_kind,
       c.relpersistence::text AS persistence,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS forced_rls_enabled
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
ORDER BY n.nspname COLLATE "C", c.relname COLLATE "C";

-- query: COLUMN_INVENTORY
SELECT a.attnum AS ordinal_position,
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull AS not_null,
       a.attidentity::text AS identity_kind,
       a.attgenerated::text AS generated_kind,
       CASE WHEN a.attcollation = 0 THEN NULL ELSE col.collname END AS collation_name
FROM pg_catalog.pg_attribute AS a
JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_collation AS col ON col.oid = a.attcollation
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- query: COLUMN_DEFAULTS
SELECT a.attnum AS ordinal_position,
       a.attname AS column_name,
       pg_catalog.pg_get_expr(ad.adbin, ad.adrelid, true) AS default_expression
FROM pg_catalog.pg_attribute AS a
JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_attrdef AS ad
       ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- query: PRIMARY_KEY
SELECT con.conname AS constraint_name,
       con.contype::text AS constraint_type,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS normalized_definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND con.contype = 'p'
ORDER BY con.conname COLLATE "C";

-- query: CHECK_CONSTRAINTS
SELECT con.conname AS constraint_name,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS normalized_definition,
       con.convalidated AS validated
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND con.contype = 'c'
ORDER BY con.conname COLLATE "C";

-- query: INDEX_INVENTORY
SELECT idx.relname AS index_name,
       i.indisprimary AS is_primary,
       i.indisunique AS is_unique,
       pg_catalog.pg_get_indexdef(i.indexrelid, 0, true) AS normalized_definition
FROM pg_catalog.pg_index AS i
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = i.indrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = tbl.relnamespace
JOIN pg_catalog.pg_class AS idx ON idx.oid = i.indexrelid
WHERE n.nspname = 'public'
  AND tbl.relname = 'koaptix_identity_reference_code'
ORDER BY idx.relname COLLATE "C";

-- query: TRIGGER_INVENTORY
SELECT t.tgname AS trigger_name,
       t.tgisinternal AS is_internal,
       t.tgenabled::text AS enabled_state,
       pg_catalog.pg_get_triggerdef(t.oid, true) AS normalized_definition
FROM pg_catalog.pg_trigger AS t
JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND NOT t.tgisinternal
ORDER BY t.tgname COLLATE "C";

-- query: POLICY_AND_RLS
SELECT c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS forced_rls_enabled,
       (SELECT count(*)::bigint
        FROM pg_catalog.pg_policy AS pol
        WHERE pol.polrelid = c.oid) AS policy_count
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
ORDER BY n.nspname COLLATE "C", c.relname COLLATE "C";

-- query: FOREIGN_KEY_INVENTORY
SELECT con.conname AS constraint_name,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS normalized_definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'koaptix_identity_reference_code'
  AND con.contype = 'f'
ORDER BY con.conname COLLATE "C";

-- query: DEPENDENT_VIEWS
SELECT view_ns.nspname AS dependent_schema,
       view_rel.relname AS dependent_name
FROM pg_catalog.pg_depend AS d
JOIN pg_catalog.pg_rewrite AS rw ON rw.oid = d.objid
JOIN pg_catalog.pg_class AS view_rel ON view_rel.oid = rw.ev_class
JOIN pg_catalog.pg_namespace AS view_ns ON view_ns.oid = view_rel.relnamespace
WHERE d.refobjid = 'public.koaptix_identity_reference_code'::regclass
  AND d.refclassid = 'pg_catalog.pg_class'::regclass
  AND view_rel.relkind = 'v'
ORDER BY view_ns.nspname COLLATE "C", view_rel.relname COLLATE "C";

-- query: DEPENDENT_MATERIALIZED_VIEWS
SELECT view_ns.nspname AS dependent_schema,
       view_rel.relname AS dependent_name
FROM pg_catalog.pg_depend AS d
JOIN pg_catalog.pg_rewrite AS rw ON rw.oid = d.objid
JOIN pg_catalog.pg_class AS view_rel ON view_rel.oid = rw.ev_class
JOIN pg_catalog.pg_namespace AS view_ns ON view_ns.oid = view_rel.relnamespace
WHERE d.refobjid = 'public.koaptix_identity_reference_code'::regclass
  AND d.refclassid = 'pg_catalog.pg_class'::regclass
  AND view_rel.relkind = 'm'
ORDER BY view_ns.nspname COLLATE "C", view_rel.relname COLLATE "C";

-- query: DEPENDENCY_SCAN
SELECT d.classid::regclass::text AS dependent_catalog,
       d.objid::bigint AS dependent_object_id,
       d.objsubid AS dependent_subobject_id,
       d.deptype::text AS dependency_type,
       pg_catalog.pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_identity
FROM pg_catalog.pg_depend AS d
WHERE d.refclassid = 'pg_catalog.pg_class'::regclass
  AND d.refobjid = 'public.koaptix_identity_reference_code'::regclass
  AND d.deptype <> 'i'
  AND d.classid NOT IN ('pg_catalog.pg_attrdef'::regclass,
                        'pg_catalog.pg_constraint'::regclass,
                        'pg_catalog.pg_class'::regclass)
ORDER BY dependent_catalog COLLATE "C",
         dependent_object_id,
         dependent_subobject_id,
         dependency_type COLLATE "C";

-- query: ROW_COUNT
SELECT count(*)::bigint AS row_count
FROM public.koaptix_identity_reference_code;

-- query: COLLATION_CONTROL
SELECT ('A' ~ '^[A-Z][A-Z0-9_]{0,63}$') AS token_default_collation,
       ('A' COLLATE "C" ~ '^[A-Z][A-Z0-9_]{0,63}$') AS token_c_collation,
       ('A B' ~ '^[^[:space:]].*[^[:space:]]$') AS internal_space_default,
       ('A B' COLLATE "C" ~ '^[^[:space:]].*[^[:space:]]$') AS internal_space_c,
       ((' ' || 'X') ~ '^[^[:space:]].*[^[:space:]]$') AS leading_space_default,
       (('X' || chr(11)) COLLATE "C" ~ '^[^[:space:]].*[^[:space:]]$') AS trailing_vertical_tab_c,
       (('X' || chr(12)) COLLATE "C" ~ '^[^[:space:]].*[^[:space:]]$') AS trailing_form_feed_c;
