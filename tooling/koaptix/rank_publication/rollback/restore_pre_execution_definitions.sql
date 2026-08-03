-- TRACKED MIGRATION-904-ONLY DEFINITION ROLLBACK. DOES NOT AUTHORIZE EXECUTION.
-- Valid only before any authority, revocation, generation, stage, publication,
-- or pointer row exists. This file restores the exact post-900/pre-904 append
-- routine and removes only the three routines first introduced by Migration 904.
-- It intentionally preserves every Migration-900 closure control and every
-- Migration-901/902/903 relation, routine, owner, ACL, policy, and role.

begin;

set local search_path = pg_catalog, pg_temp, public;

lock table
  public.koaptix_rank_input_authority_manifest,
  public.koaptix_rank_input_manifest_revocation,
  public.koaptix_latest_board_generation,
  public.koaptix_latest_board_generation_surface,
  public.koaptix_latest_board_generation_universe,
  public.koaptix_latest_board_generation_row,
  public.koaptix_latest_board_generation_global_row,
  public.koaptix_rank_publication_history_stage,
  public.koaptix_rank_publication_snapshot_stage,
  public.koaptix_latest_board_publication_event,
  public.koaptix_latest_board_publication
in access exclusive mode;

create temporary table koaptix_rollback_904_relation_baseline
on commit drop as
select relation_row.oid,relation_row.relowner,relation_row.relacl
from pg_catalog.pg_class relation_row
where relation_row.oid in (
  'public.koaptix_rank_input_authority_manifest'::regclass,
  'public.koaptix_rank_input_manifest_revocation'::regclass,
  'public.koaptix_latest_board_generation'::regclass,
  'public.koaptix_latest_board_generation_surface'::regclass,
  'public.koaptix_latest_board_generation_universe'::regclass,
  'public.koaptix_latest_board_generation_row'::regclass,
  'public.koaptix_latest_board_generation_global_row'::regclass,
  'public.koaptix_rank_publication_history_stage'::regclass,
  'public.koaptix_rank_publication_snapshot_stage'::regclass,
  'public.koaptix_latest_board_publication_event'::regclass,
  'public.koaptix_latest_board_publication'::regclass
);

create temporary table koaptix_rollback_904_nonwriter_baseline
on commit drop as
select requested.ordinal,requested.routine_identity,proc.oid,
       proc.proowner,proc.proacl,
       upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
         pg_catalog.regexp_replace(
           pg_catalog.regexp_replace(
             pg_catalog.replace(
               pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
               E'\r',E'\n'
             ),
             E'[ \t]+(\n|$)',E'\\1','g'
           ),
           E'\n*$', ''
         ) || E'\n','UTF8'
       )),'hex')) as definition_sha256
from (values
  (1,'public.build_koaptix_index_snapshot_stage(text,date,date,text[])'),
  (2,'public.merge_market_source_to_master(date)'),
  (3,'public.refresh_koaptix_front_views()'),
  (4,'public.refresh_koaptix_home_kpi()'),
  (5,'public.refresh_koaptix_index_snapshot(date)'),
  (6,'public.refresh_koaptix_total_market_cap_history()'),
  (7,'public.sync_market_daily_aggregates(date)')
) requested(ordinal,routine_identity)
join pg_catalog.pg_proc proc
  on proc.oid=pg_catalog.to_regprocedure(requested.routine_identity);

create temporary table koaptix_rollback_904_candidate_observation
on commit drop as
select expected.ordinal,expected.routine_identity,expected.expected_owner,
       expected.expected_definition_sha256,proc.oid,
       pg_catalog.pg_get_userbyid(proc.proowner) as actual_owner,
       upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
         pg_catalog.regexp_replace(
           pg_catalog.regexp_replace(
             pg_catalog.replace(
               pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
               E'\r',E'\n'
             ),
             E'[ \t]+(\n|$)',E'\\1','g'
           ),
           E'\n*$', ''
         ) || E'\n','UTF8'
       )),'hex')) as actual_definition_sha256
from (values
  (1,'public.koaptix_compute_rank_input_authority(date)',
     'koaptix_rank_publication_owner','EBC03827C6F1BC91E0DB1659BDC2B05216F2E28398BBE75FD69A786B6E05DC86'),
  (2,'public.koaptix_seal_rank_input_manifest(jsonb)',
     'koaptix_rank_authority_owner','4CB990F6323E2340306A9E95778AD842E2F80AAD6519603BB06E5C7BDCEB88EA'),
  (3,'public.koaptix_revoke_rank_input_manifest(jsonb)',
     'koaptix_rank_authority_owner','F7677886B59878E06DC9EA9D9A58D6514570D3F507E300E9FA454C58E4F2EAA9'),
  (4,'public.append_daily_rank_history(date)',
     'koaptix_rank_publication_owner','E74CDCF102B7D89A8DB22853A1B89A5F330DC8D66E5BCFA82158DC403F0CA026')
) expected(ordinal,routine_identity,expected_owner,expected_definition_sha256)
left join pg_catalog.pg_proc proc
  on proc.oid=pg_catalog.to_regprocedure(expected.routine_identity);

do $preconditions$
begin
  if current_setting(
       'koaptix.rollback.migration_904_reconciliation_proof_exact',true
     ) is distinct from
       'MIGRATION_904_RECONCILIATION_PRE_EXECUTION_DEFINITION_ROLLBACK_APPROVAL' then
    raise exception 'exact Migration-904 reconciliation rollback approval is absent';
  end if;

  if current_user like 'koaptix_rank_%' then
    raise exception 'Migration-904 definition rollback requires the separately authorized admin principal';
  end if;

  if exists (select 1 from public.koaptix_rank_input_authority_manifest)
     or exists (select 1 from public.koaptix_rank_input_manifest_revocation)
     or exists (select 1 from public.koaptix_latest_board_generation)
     or exists (select 1 from public.koaptix_latest_board_generation_surface)
     or exists (select 1 from public.koaptix_latest_board_generation_universe)
     or exists (select 1 from public.koaptix_latest_board_generation_row)
     or exists (select 1 from public.koaptix_latest_board_generation_global_row)
     or exists (select 1 from public.koaptix_rank_publication_history_stage)
     or exists (select 1 from public.koaptix_rank_publication_snapshot_stage)
     or exists (select 1 from public.koaptix_latest_board_publication_event)
     or exists (select 1 from public.koaptix_latest_board_publication) then
    raise exception 'Migration-904 definition rollback is prohibited after authority or publication data exists';
  end if;

  if exists (
    select 1 from pg_catalog.pg_stat_activity activity
    where activity.pid<>pg_catalog.pg_backend_pid()
      and activity.datname=current_database()
      and activity.backend_type='client backend'
  ) then
    raise exception 'Migration-904 definition rollback requires zero other client backends';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members membership
    join pg_catalog.pg_roles granted_role on granted_role.oid=membership.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=membership.member
    where granted_role.rolname like 'koaptix_rank_%'
       or member_role.rolname like 'koaptix_rank_%'
  ) then
    raise exception 'revoke every recovery-role activation membership before Migration-904 definition rollback';
  end if;

  if (select count(*) from koaptix_rollback_904_relation_baseline)<>11
     or (select count(*) from koaptix_rollback_904_nonwriter_baseline)<>7
     or (select count(*) from koaptix_rollback_904_candidate_observation)<>4
     or exists (
       select 1 from koaptix_rollback_904_candidate_observation
       where oid is null
          or actual_owner<>expected_owner
          or actual_definition_sha256<>expected_definition_sha256
     ) then
    raise exception 'AUTHORITY_UNRESOLVED: Migration-904 candidate signature, owner or definition drift';
  end if;

  if exists (
    select 1
    from koaptix_rollback_904_candidate_observation observed
    join pg_catalog.pg_proc proc on proc.oid=observed.oid
    left join pg_catalog.pg_language language on language.oid=proc.prolang
    where (observed.ordinal=1 and (
             language.lanname<>'sql' or proc.provolatile<>'s'
           ))
       or (observed.ordinal<>1 and (
             language.lanname<>'plpgsql' or proc.provolatile<>'v'
           ))
       or proc.proparallel<>'u'
       or proc.proisstrict
       or proc.proleakproof
       or not proc.prosecdef
       or proc.proretset
       or coalesce(proc.proconfig,array[]::text[])
          is distinct from array['search_path=pg_catalog, public']
       or pg_catalog.pg_get_function_result(proc.oid)<>'jsonb'
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: Migration-904 candidate structural contract drift';
  end if;

  if exists (
    with expected_name(routine_identity,grantee_name) as (values
      ('public.koaptix_compute_rank_input_authority(date)','koaptix_rank_authority_owner'),
      ('public.koaptix_compute_rank_input_authority(date)','koaptix_rank_authority_reader'),
      ('public.koaptix_seal_rank_input_manifest(jsonb)','koaptix_rank_manifest_sealer'),
      ('public.koaptix_revoke_rank_input_manifest(jsonb)','koaptix_rank_manifest_revoker')
    ), expected_acl as (
      select expected_name.routine_identity,
             proc.proowner as grantor,
             grantee.oid as grantee,
             'EXECUTE'::text as privilege_type,
             false as is_grantable
      from expected_name
      join koaptix_rollback_904_candidate_observation observed
        using (routine_identity)
      join pg_catalog.pg_proc proc on proc.oid=observed.oid
      left join pg_catalog.pg_roles grantee
        on grantee.rolname=expected_name.grantee_name
    ), actual_acl as (
      select observed.routine_identity,
             acl.grantor,
             acl.grantee,
             acl.privilege_type,
             acl.is_grantable
      from koaptix_rollback_904_candidate_observation observed
      join pg_catalog.pg_proc proc on proc.oid=observed.oid
      cross join lateral pg_catalog.aclexplode(
        coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
      ) acl
      where acl.grantee<>proc.proowner
    ), acl_delta as (
      (select * from expected_acl except all select * from actual_acl)
      union all
      (select * from actual_acl except all select * from expected_acl)
    )
    select 1 from acl_delta
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: Migration-904 required nonowner EXECUTE ACL set or grantor drift';
  end if;
end;
$preconditions$;

-- Exact captured post-900/pre-904 definition. Migration 900 established the
-- owner-only EXECUTE closure that is restored below; service_role is not restored.
CREATE OR REPLACE FUNCTION public.append_daily_rank_history(p_run_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_history_exists boolean;
  v_previous_snapshot_date date;
  v_deleted_rows integer := 0;
  v_inserted_rows integer := 0;
  v_trade_complex_count integer := 0;
  v_carried_complex_count integer := 0;
begin
  select to_regclass('public.complex_rank_history') is not null into v_history_exists;
  if not v_history_exists then
    raise exception 'public.complex_rank_history table not found';
  end if;

  select max(snapshot_date)
    into v_previous_snapshot_date
  from public.complex_rank_history
  where snapshot_date < p_run_date;

  select count(*)
    into v_trade_complex_count
  from (
    select distinct s.complex_id
    from public.staging_market_raw s
    where s.complex_id is not null
      and s.deal_amount_krw is not null
      and coalesce(s.household_count, 0) > 0
      and s.trade_date <= p_run_date
  ) t;

  if v_trade_complex_count = 0 and v_previous_snapshot_date is null then
    raise exception 'No matched staged trade rows and no previous snapshot found for %', p_run_date;
  end if;

  delete from public.complex_rank_history
  where snapshot_date = p_run_date;
  get diagnostics v_deleted_rows = row_count;

  with latest_trade as (
    select distinct on (s.complex_id)
      s.complex_id,
      (s.deal_amount_krw * coalesce(s.household_count, 0))::numeric(20, 0) as market_cap_krw
    from public.staging_market_raw s
    where s.complex_id is not null
      and s.deal_amount_krw is not null
      and coalesce(s.household_count, 0) > 0
      and s.trade_date <= p_run_date
    order by s.complex_id, s.trade_date desc, s.ingested_at desc, s.deal_amount_krw desc
  ),
  previous_snapshot as (
    select
      h.complex_id,
      h.market_cap_krw
    from public.complex_rank_history h
    where h.snapshot_date = v_previous_snapshot_date
  ),
  resolved as (
    select
      coalesce(t.complex_id, p.complex_id) as complex_id,
      coalesce(t.market_cap_krw, p.market_cap_krw) as market_cap_krw
    from previous_snapshot p
    full outer join latest_trade t
      on t.complex_id = p.complex_id
    where coalesce(t.market_cap_krw, p.market_cap_krw) is not null
  ),
  ranked as (
    select
      p_run_date as snapshot_date,
      r.complex_id,
      r.market_cap_krw,
      dense_rank() over (
        order by r.market_cap_krw desc, r.complex_id asc
      ) as rank_all
    from resolved r
  )
  insert into public.complex_rank_history (
    snapshot_date,
    complex_id,
    market_cap_krw,
    total_market_cap, -- ?슚 ?ш린??total_market_cap 湲곕뫁??異붽??덉뒿?덈떎!!
    rank_all
  )
  select
    snapshot_date,
    complex_id,
    market_cap_krw,   -- ?슚 鍮덉뭏??market_cap_krw ?덉쓣 ?묎컳??蹂듭궗?댁꽌 梨꾩썙以띾땲??!
    market_cap_krw,
    rank_all
  from ranked
  order by rank_all asc;

  get diagnostics v_inserted_rows = row_count;

  if v_previous_snapshot_date is not null then
    select count(*)
      into v_carried_complex_count
    from public.complex_rank_history h
    where h.snapshot_date = p_run_date
      and not exists (
        select 1
        from public.staging_market_raw s
        where s.complex_id = h.complex_id
          and s.deal_amount_krw is not null
          and coalesce(s.household_count, 0) > 0
          and s.trade_date <= p_run_date
      );
  else
    v_carried_complex_count := 0;
  end if;

  return jsonb_build_object(
    'previous_snapshot_date', v_previous_snapshot_date,
    'trade_complex_count', v_trade_complex_count,
    'carried_complex_count', v_carried_complex_count,
    'deleted_rows', v_deleted_rows,
    'inserted_rows', v_inserted_rows
  );
end;
$function$;

-- The captured definition contains two UTF-8 comments that are part of the
-- Migration-900 definition fingerprint. Decode the exact committed bytes and
-- verify their DDL digest before replacing the readable rendering above.
do $restore_exact_pre904_append$
declare
  v_ddl text;
begin
  v_ddl := pg_catalog.convert_from(pg_catalog.decode(
    'Q1JFQVRFIE9SIFJFUExBQ0UgRlVOQ1RJT04gcHVibGljLmFwcGVuZF9kYWlseV9yYW5rX2hpc3RvcnkocF9ydW5fZGF0ZSBkYXRlKQogUkVUVVJOUyBqc29u' ||
    'YgogTEFOR1VBR0UgcGxwZ3NxbAogU0VDVVJJVFkgREVGSU5FUgogU0VUIHNlYXJjaF9wYXRoIFRPICdwdWJsaWMnCkFTICRmdW5jdGlvbiQKZGVjbGFyZQog' ||
    'IHZfaGlzdG9yeV9leGlzdHMgYm9vbGVhbjsKICB2X3ByZXZpb3VzX3NuYXBzaG90X2RhdGUgZGF0ZTsKICB2X2RlbGV0ZWRfcm93cyBpbnRlZ2VyIDo9IDA7' ||
    'CiAgdl9pbnNlcnRlZF9yb3dzIGludGVnZXIgOj0gMDsKICB2X3RyYWRlX2NvbXBsZXhfY291bnQgaW50ZWdlciA6PSAwOwogIHZfY2FycmllZF9jb21wbGV4' ||
    'X2NvdW50IGludGVnZXIgOj0gMDsKYmVnaW4KICBzZWxlY3QgdG9fcmVnY2xhc3MoJ3B1YmxpYy5jb21wbGV4X3JhbmtfaGlzdG9yeScpIGlzIG5vdCBudWxs' ||
    'IGludG8gdl9oaXN0b3J5X2V4aXN0czsKICBpZiBub3Qgdl9oaXN0b3J5X2V4aXN0cyB0aGVuCiAgICByYWlzZSBleGNlcHRpb24gJ3B1YmxpYy5jb21wbGV4' ||
    'X3JhbmtfaGlzdG9yeSB0YWJsZSBub3QgZm91bmQnOwogIGVuZCBpZjsKCiAgc2VsZWN0IG1heChzbmFwc2hvdF9kYXRlKQogICAgaW50byB2X3ByZXZpb3Vz' ||
    'X3NuYXBzaG90X2RhdGUKICBmcm9tIHB1YmxpYy5jb21wbGV4X3JhbmtfaGlzdG9yeQogIHdoZXJlIHNuYXBzaG90X2RhdGUgPCBwX3J1bl9kYXRlOwoKICBz' ||
    'ZWxlY3QgY291bnQoKikKICAgIGludG8gdl90cmFkZV9jb21wbGV4X2NvdW50CiAgZnJvbSAoCiAgICBzZWxlY3QgZGlzdGluY3Qgcy5jb21wbGV4X2lkCiAg' ||
    'ICBmcm9tIHB1YmxpYy5zdGFnaW5nX21hcmtldF9yYXcgcwogICAgd2hlcmUgcy5jb21wbGV4X2lkIGlzIG5vdCBudWxsCiAgICAgIGFuZCBzLmRlYWxfYW1v' ||
    'dW50X2tydyBpcyBub3QgbnVsbAogICAgICBhbmQgY29hbGVzY2Uocy5ob3VzZWhvbGRfY291bnQsIDApID4gMAogICAgICBhbmQgcy50cmFkZV9kYXRlIDw9' ||
    'IHBfcnVuX2RhdGUKICApIHQ7CgogIGlmIHZfdHJhZGVfY29tcGxleF9jb3VudCA9IDAgYW5kIHZfcHJldmlvdXNfc25hcHNob3RfZGF0ZSBpcyBudWxsIHRo' ||
    'ZW4KICAgIHJhaXNlIGV4Y2VwdGlvbiAnTm8gbWF0Y2hlZCBzdGFnZWQgdHJhZGUgcm93cyBhbmQgbm8gcHJldmlvdXMgc25hcHNob3QgZm91bmQgZm9yICUn' ||
    'LCBwX3J1bl9kYXRlOwogIGVuZCBpZjsKCiAgZGVsZXRlIGZyb20gcHVibGljLmNvbXBsZXhfcmFua19oaXN0b3J5CiAgd2hlcmUgc25hcHNob3RfZGF0ZSA9' ||
    'IHBfcnVuX2RhdGU7CiAgZ2V0IGRpYWdub3N0aWNzIHZfZGVsZXRlZF9yb3dzID0gcm93X2NvdW50OwoKICB3aXRoIGxhdGVzdF90cmFkZSBhcyAoCiAgICBz' ||
    'ZWxlY3QgZGlzdGluY3Qgb24gKHMuY29tcGxleF9pZCkKICAgICAgcy5jb21wbGV4X2lkLAogICAgICAocy5kZWFsX2Ftb3VudF9rcncgKiBjb2FsZXNjZShz' ||
    'LmhvdXNlaG9sZF9jb3VudCwgMCkpOjpudW1lcmljKDIwLCAwKSBhcyBtYXJrZXRfY2FwX2tydwogICAgZnJvbSBwdWJsaWMuc3RhZ2luZ19tYXJrZXRfcmF3' ||
    'IHMKICAgIHdoZXJlIHMuY29tcGxleF9pZCBpcyBub3QgbnVsbAogICAgICBhbmQgcy5kZWFsX2Ftb3VudF9rcncgaXMgbm90IG51bGwKICAgICAgYW5kIGNv' ||
    'YWxlc2NlKHMuaG91c2Vob2xkX2NvdW50LCAwKSA+IDAKICAgICAgYW5kIHMudHJhZGVfZGF0ZSA8PSBwX3J1bl9kYXRlCiAgICBvcmRlciBieSBzLmNvbXBs' ||
    'ZXhfaWQsIHMudHJhZGVfZGF0ZSBkZXNjLCBzLmluZ2VzdGVkX2F0IGRlc2MsIHMuZGVhbF9hbW91bnRfa3J3IGRlc2MKICApLAogIHByZXZpb3VzX3NuYXBz' ||
    'aG90IGFzICgKICAgIHNlbGVjdAogICAgICBoLmNvbXBsZXhfaWQsCiAgICAgIGgubWFya2V0X2NhcF9rcncKICAgIGZyb20gcHVibGljLmNvbXBsZXhfcmFu' ||
    'a19oaXN0b3J5IGgKICAgIHdoZXJlIGguc25hcHNob3RfZGF0ZSA9IHZfcHJldmlvdXNfc25hcHNob3RfZGF0ZQogICksCiAgcmVzb2x2ZWQgYXMgKAogICAg' ||
    'c2VsZWN0CiAgICAgIGNvYWxlc2NlKHQuY29tcGxleF9pZCwgcC5jb21wbGV4X2lkKSBhcyBjb21wbGV4X2lkLAogICAgICBjb2FsZXNjZSh0Lm1hcmtldF9j' ||
    'YXBfa3J3LCBwLm1hcmtldF9jYXBfa3J3KSBhcyBtYXJrZXRfY2FwX2tydwogICAgZnJvbSBwcmV2aW91c19zbmFwc2hvdCBwCiAgICBmdWxsIG91dGVyIGpv' ||
    'aW4gbGF0ZXN0X3RyYWRlIHQKICAgICAgb24gdC5jb21wbGV4X2lkID0gcC5jb21wbGV4X2lkCiAgICB3aGVyZSBjb2FsZXNjZSh0Lm1hcmtldF9jYXBfa3J3' ||
    'LCBwLm1hcmtldF9jYXBfa3J3KSBpcyBub3QgbnVsbAogICksCiAgcmFua2VkIGFzICgKICAgIHNlbGVjdAogICAgICBwX3J1bl9kYXRlIGFzIHNuYXBzaG90' ||
    'X2RhdGUsCiAgICAgIHIuY29tcGxleF9pZCwKICAgICAgci5tYXJrZXRfY2FwX2tydywKICAgICAgZGVuc2VfcmFuaygpIG92ZXIgKAogICAgICAgIG9yZGVy' ||
    'IGJ5IHIubWFya2V0X2NhcF9rcncgZGVzYywgci5jb21wbGV4X2lkIGFzYwogICAgICApIGFzIHJhbmtfYWxsCiAgICBmcm9tIHJlc29sdmVkIHIKICApCiAg' ||
    'aW5zZXJ0IGludG8gcHVibGljLmNvbXBsZXhfcmFua19oaXN0b3J5ICgKICAgIHNuYXBzaG90X2RhdGUsCiAgICBjb21wbGV4X2lkLAogICAgbWFya2V0X2Nh' ||
    'cF9rcncsCiAgICB0b3RhbF9tYXJrZXRfY2FwLCAtLSDwn5qoIOyXrOq4sOyXkCB0b3RhbF9tYXJrZXRfY2FwIOq4sOuRpeydhCDstpTqsIDtlojsirXri4jr' ||
    'i6QhIQogICAgcmFua19hbGwKICApCiAgc2VsZWN0CiAgICBzbmFwc2hvdF9kYXRlLAogICAgY29tcGxleF9pZCwKICAgIG1hcmtldF9jYXBfa3J3LAogICAg' ||
    'bWFya2V0X2NhcF9rcncsICAgLS0g8J+aqCDruYjsubjsl5AgbWFya2V0X2NhcF9rcncg64+I7J2EIOuYkeqwmeydtCDrs7XsgqztlbTshJwg7LGE7JuM7KSN' ||
    '64uI64ukISEKICAgIHJhbmtfYWxsCiAgZnJvbSByYW5rZWQKICBvcmRlciBieSByYW5rX2FsbCBhc2M7CgogIGdldCBkaWFnbm9zdGljcyB2X2luc2VydGVk' ||
    'X3Jvd3MgPSByb3dfY291bnQ7CgogIGlmIHZfcHJldmlvdXNfc25hcHNob3RfZGF0ZSBpcyBub3QgbnVsbCB0aGVuCiAgICBzZWxlY3QgY291bnQoKikKICAg' ||
    'ICAgaW50byB2X2NhcnJpZWRfY29tcGxleF9jb3VudAogICAgZnJvbSBwdWJsaWMuY29tcGxleF9yYW5rX2hpc3RvcnkgaAogICAgd2hlcmUgaC5zbmFwc2hv' ||
    'dF9kYXRlID0gcF9ydW5fZGF0ZQogICAgICBhbmQgbm90IGV4aXN0cyAoCiAgICAgICAgc2VsZWN0IDEKICAgICAgICBmcm9tIHB1YmxpYy5zdGFnaW5nX21h' ||
    'cmtldF9yYXcgcwogICAgICAgIHdoZXJlIHMuY29tcGxleF9pZCA9IGguY29tcGxleF9pZAogICAgICAgICAgYW5kIHMuZGVhbF9hbW91bnRfa3J3IGlzIG5v' ||
    'dCBudWxsCiAgICAgICAgICBhbmQgY29hbGVzY2Uocy5ob3VzZWhvbGRfY291bnQsIDApID4gMAogICAgICAgICAgYW5kIHMudHJhZGVfZGF0ZSA8PSBwX3J1' ||
    'bl9kYXRlCiAgICAgICk7CiAgZWxzZQogICAgdl9jYXJyaWVkX2NvbXBsZXhfY291bnQgOj0gMDsKICBlbmQgaWY7CgogIHJldHVybiBqc29uYl9idWlsZF9v' ||
    'YmplY3QoCiAgICAncHJldmlvdXNfc25hcHNob3RfZGF0ZScsIHZfcHJldmlvdXNfc25hcHNob3RfZGF0ZSwKICAgICd0cmFkZV9jb21wbGV4X2NvdW50Jywg' ||
    'dl90cmFkZV9jb21wbGV4X2NvdW50LAogICAgJ2NhcnJpZWRfY29tcGxleF9jb3VudCcsIHZfY2FycmllZF9jb21wbGV4X2NvdW50LAogICAgJ2RlbGV0ZWRf' ||
    'cm93cycsIHZfZGVsZXRlZF9yb3dzLAogICAgJ2luc2VydGVkX3Jvd3MnLCB2X2luc2VydGVkX3Jvd3MKICApOwplbmQ7CiRmdW5jdGlvbiQKOwo=',
    'base64'
  ),'UTF8');

  if upper(pg_catalog.encode(pg_catalog.sha256(
       pg_catalog.convert_to(v_ddl,'UTF8')
     ),'hex'))<>'95A426D928EF646720AE7F81E1B919D619703AF981CE124D2CE1CE6280D4892F' then
    raise exception 'AUTHORITY_UNRESOLVED: captured pre-904 append DDL byte digest drift';
  end if;
  execute v_ddl;
end;
$restore_exact_pre904_append$;

alter function public.append_daily_rank_history(date) owner to postgres;
revoke all on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role,
       koaptix_rank_authority_owner,koaptix_rank_publication_owner,
       koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;

drop function public.koaptix_revoke_rank_input_manifest(jsonb);
drop function public.koaptix_seal_rank_input_manifest(jsonb);
drop function public.koaptix_compute_rank_input_authority(date);

do $postconditions$
begin
  if pg_catalog.to_regprocedure('public.koaptix_compute_rank_input_authority(date)') is not null
     or pg_catalog.to_regprocedure('public.koaptix_seal_rank_input_manifest(jsonb)') is not null
     or pg_catalog.to_regprocedure('public.koaptix_revoke_rank_input_manifest(jsonb)') is not null then
    raise exception 'Migration-904-created routine remains after rollback';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc proc
    join pg_catalog.pg_language language on language.oid=proc.prolang
    where proc.oid=pg_catalog.to_regprocedure('public.append_daily_rank_history(date)')
      and pg_catalog.pg_get_userbyid(proc.proowner)='postgres'
      and proc.prokind='f'
      and pg_catalog.pg_get_function_identity_arguments(proc.oid)='p_run_date date'
      and language.lanname='plpgsql'
      and proc.provolatile='v' and proc.proparallel='u'
      and not proc.proisstrict and not proc.proleakproof and proc.prosecdef
      and coalesce(proc.proconfig,array[]::text[]) is not distinct from array['search_path=public']
      and pg_catalog.pg_get_function_result(proc.oid)='jsonb'
      and not proc.proretset
      and upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
            pg_catalog.regexp_replace(
              pg_catalog.regexp_replace(
                pg_catalog.replace(
                  pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
                  E'\r',E'\n'
                ),
                E'[ \t]+(\n|$)',E'\\1','g'
              ),
              E'\n*$', ''
            ) || E'\n','UTF8'
          )),'hex'))='0EDA4A6EE8F755375AD841A07926AC85B3CFD964687D06D059B1BE26C90497EC'
  ) then
    raise exception 'AUTHORITY_UNRESOLVED: exact pre-904 append definition was not restored';
  end if;

  if exists (
    select 1
    from (values
      ('public.append_daily_rank_history(date)'),
      ('public.capture_koaptix_daily_snapshot()'),
      ('public.refresh_koaptix_front_views_legacy()'),
      ('public.refresh_koaptix_latest_rank_board()'),
      ('public.run_daily_market_pipeline(date)'),
      ('public.run_daily_market_pipeline_legacy(date)'),
      ('public.run_koaptix_safe_finalize(date)'),
      ('public.sync_rank_snapshot_from_history(date)')
    ) protected(routine_identity)
    left join pg_catalog.pg_proc proc
      on proc.oid=pg_catalog.to_regprocedure(protected.routine_identity)
    left join lateral pg_catalog.aclexplode(
      coalesce(proc.proacl,pg_catalog.acldefault('f',proc.proowner))
    ) acl on true
    where proc.oid is null
       or (acl.privilege_type='EXECUTE' and acl.grantee<>proc.proowner)
  ) then
    raise exception 'Migration-900 protected-writer owner-only closure changed during rollback';
  end if;

  if exists (
    select 1
    from koaptix_rollback_904_nonwriter_baseline baseline
    left join pg_catalog.pg_proc proc on proc.oid=baseline.oid
    where proc.oid is null
       or proc.proowner is distinct from baseline.proowner
       or proc.proacl is distinct from baseline.proacl
       or upper(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
            pg_catalog.regexp_replace(
              pg_catalog.regexp_replace(
                pg_catalog.replace(
                  pg_catalog.replace(pg_catalog.pg_get_functiondef(proc.oid),E'\r\n',E'\n'),
                  E'\r',E'\n'
                ),
                E'[ \t]+(\n|$)',E'\\1','g'
              ),
              E'\n*$', ''
            ) || E'\n','UTF8'
          )),'hex')) is distinct from baseline.definition_sha256
  ) then
    raise exception 'accepted Migration-900 nonwriter changed during rollback';
  end if;

  if exists (
    select 1
    from koaptix_rollback_904_relation_baseline baseline
    left join pg_catalog.pg_class relation_row on relation_row.oid=baseline.oid
    where relation_row.oid is null
       or relation_row.relowner is distinct from baseline.relowner
       or relation_row.relacl is distinct from baseline.relacl
  ) then
    raise exception 'Migration-901/902/903 relation owner or ACL changed during rollback';
  end if;

  if pg_catalog.to_regclass('public.koaptix_rank_input_authority_manifest') is null
     or pg_catalog.to_regclass('public.koaptix_rank_input_manifest_revocation') is null
     or pg_catalog.to_regclass('public.v_koaptix_canonical_rank_input_u') is null
     or pg_catalog.to_regclass('public.v_koaptix_rank_membership_authority_u') is null
     or pg_catalog.to_regclass('public.koaptix_latest_board_generation') is null
     or pg_catalog.to_regclass('public.koaptix_latest_board_publication') is null
     or pg_catalog.to_regprocedure('public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)') is null
     or pg_catalog.to_regprocedure('public.koaptix_build_rank_publication_generation(jsonb)') is null
     or pg_catalog.to_regprocedure('public.koaptix_publish_latest_board_generation(jsonb)') is null
     or pg_catalog.to_regprocedure('public.koaptix_rollback_latest_board_publication(jsonb)') is null then
    raise exception 'Migration-901/902/903 object was removed by Migration-904 rollback';
  end if;
end;
$postconditions$;

commit;
