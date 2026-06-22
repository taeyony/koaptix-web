-- KOAPTIX canonical P3 decimal area-cluster resolver.
--
-- This migration source is additive only. This lane creates the file but does
-- not apply it to any database.
-- Future approved apply lane should compare the pre-apply pg_get_functiondef
-- snapshot, apply in an explicit reviewed migration step, then verify the live
-- function definition and SELECT-only fixtures before any data write.
--
-- Accepted policy:
--   non-terminal: min_i <= raw_decimal_area < min_(i+1)
--   terminal:     260.00 <= raw_decimal_area <= 999.99
--
-- The SQL core accepts numeric input only. An uncastable non-numeric string
-- cannot enter this function and must fail closed at the caller/parser
-- boundary. No text overload is introduced in this lane.
--
-- Future approved rollback, if this function is applied:
--   drop function if exists public.koaptix_resolve_area_cluster_p3(numeric, text);

create or replace function public.koaptix_resolve_area_cluster_p3(
  raw_exclusive_area_m2 numeric,
  area_semantic text
)
returns table (
  area_cluster_id bigint,
  area_cluster_code text,
  match_status text,
  hold_reason text
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_active_count integer;
  v_required_field_error_count integer;
  v_non_increasing_count integer;
  v_duplicate_lower_count integer;
  v_overlap_count integer;
  v_global_min numeric;
  v_terminal_id bigint;
  v_terminal_code text;
  v_terminal_min numeric;
  v_terminal_max numeric;
  v_match_count integer;
  v_match_id bigint;
  v_match_code text;
begin
  if area_semantic is distinct from 'exclusive' then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_WRONG_AREA_SEMANTIC'::text;
    return;
  end if;

  if raw_exclusive_area_m2 is null then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_NULL_INPUT'::text;
    return;
  end if;

  if raw_exclusive_area_m2 <= 0 then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_NON_POSITIVE'::text;
    return;
  end if;

  with active_clusters as (
    select
      ac.area_cluster_id as cluster_area_cluster_id,
      ac.area_cluster_code as cluster_area_cluster_code,
      ac.min_exclusive_area_m2 as cluster_min_exclusive_area_m2,
      ac.max_exclusive_area_m2 as cluster_max_exclusive_area_m2
    from public.area_cluster_dim as ac
    where ac.is_active = true
  ),
  ordered as (
    select
      ac.cluster_area_cluster_id,
      ac.cluster_area_cluster_code,
      ac.cluster_min_exclusive_area_m2,
      ac.cluster_max_exclusive_area_m2,
      lag(ac.cluster_min_exclusive_area_m2) over (
        order by ac.cluster_min_exclusive_area_m2, ac.cluster_area_cluster_id
      ) as previous_min,
      lead(ac.cluster_min_exclusive_area_m2) over (
        order by ac.cluster_min_exclusive_area_m2, ac.cluster_area_cluster_id
      ) as next_min
    from active_clusters as ac
  )
  select
    count(*)::integer,
    count(*) filter (
      where o.cluster_area_cluster_id is null
         or o.cluster_area_cluster_code is null
         or o.cluster_min_exclusive_area_m2 is null
         or o.cluster_max_exclusive_area_m2 is null
    )::integer,
    count(*) filter (
      where o.previous_min is not null
        and o.cluster_min_exclusive_area_m2 <= o.previous_min
    )::integer,
    (count(*) - count(distinct o.cluster_min_exclusive_area_m2))::integer,
    count(*) filter (
      where o.next_min is not null
        and o.cluster_max_exclusive_area_m2 >= o.next_min
    )::integer,
    min(o.cluster_min_exclusive_area_m2),
    max(o.cluster_area_cluster_id) filter (where o.cluster_area_cluster_code = 'EXCL_260_PLUS'),
    max(o.cluster_area_cluster_code) filter (where o.cluster_area_cluster_code = 'EXCL_260_PLUS'),
    max(o.cluster_min_exclusive_area_m2) filter (where o.cluster_area_cluster_code = 'EXCL_260_PLUS'),
    max(o.cluster_max_exclusive_area_m2) filter (where o.cluster_area_cluster_code = 'EXCL_260_PLUS')
  into
    v_active_count,
    v_required_field_error_count,
    v_non_increasing_count,
    v_duplicate_lower_count,
    v_overlap_count,
    v_global_min,
    v_terminal_id,
    v_terminal_code,
    v_terminal_min,
    v_terminal_max
  from ordered as o;

  if v_active_count = 0 then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_NO_ACTIVE_CLUSTER'::text;
    return;
  end if;

  if v_active_count <> 29
     or v_required_field_error_count <> 0
     or v_non_increasing_count <> 0
     or v_duplicate_lower_count <> 0
     or v_overlap_count <> 0
     or v_terminal_id is null
     or v_terminal_code <> 'EXCL_260_PLUS'
     or v_terminal_min <> 260.00
     or v_terminal_max <> 999.99 then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_CONFIG_INVALID'::text;
    return;
  end if;

  if raw_exclusive_area_m2 < v_global_min then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_BELOW_GLOBAL_MINIMUM'::text;
    return;
  end if;

  if raw_exclusive_area_m2 > v_terminal_max then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_ABOVE_TERMINAL_MAXIMUM'::text;
    return;
  end if;

  with ordered as (
    select
      ac.area_cluster_id as cluster_area_cluster_id,
      ac.area_cluster_code as cluster_area_cluster_code,
      ac.min_exclusive_area_m2 as cluster_min_exclusive_area_m2,
      ac.max_exclusive_area_m2 as cluster_max_exclusive_area_m2,
      lead(ac.min_exclusive_area_m2) over (
        order by ac.min_exclusive_area_m2, ac.area_cluster_id
      ) as next_min
    from public.area_cluster_dim as ac
    where ac.is_active = true
  ),
  candidates as (
    select
      o.cluster_area_cluster_id,
      o.cluster_area_cluster_code
    from ordered as o
    where (
      o.next_min is not null
      and raw_exclusive_area_m2 >= o.cluster_min_exclusive_area_m2
      and raw_exclusive_area_m2 < o.next_min
    )
    or (
      o.next_min is null
      and o.cluster_area_cluster_code = 'EXCL_260_PLUS'
      and raw_exclusive_area_m2 >= o.cluster_min_exclusive_area_m2
      and raw_exclusive_area_m2 <= o.cluster_max_exclusive_area_m2
    )
  )
  select
    count(*)::integer,
    min(c.cluster_area_cluster_id),
    min(c.cluster_area_cluster_code)
  into v_match_count, v_match_id, v_match_code
  from candidates as c;

  if v_match_count > 1 then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_DUPLICATE_MATCH'::text;
    return;
  end if;

  if v_match_count = 0 then
    return query select null::bigint, null::text, 'HOLD'::text, 'HOLD_NO_MATCH'::text;
    return;
  end if;

  return query select v_match_id, v_match_code, 'MATCH'::text, null::text;
end;
$$;

-- KOAPTIX privilege contract:
-- Owner-only until a separately approved caller-wiring migration.
-- No PUBLIC, anon, authenticated, or service_role execution is approved.
-- A future GRANT EXECUTE requires explicit CTO approval and an exact caller role.

REVOKE EXECUTE
ON FUNCTION public.koaptix_resolve_area_cluster_p3(numeric, text)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.koaptix_resolve_area_cluster_p3(numeric, text)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.koaptix_resolve_area_cluster_p3(numeric, text)
FROM authenticated;

REVOKE EXECUTE
ON FUNCTION public.koaptix_resolve_area_cluster_p3(numeric, text)
FROM service_role;
