-- S1 additive definition candidate. Applying this file requires a separate lane.
-- KOAPTIX_S1_IDEMPOTENT_FORWARD_PUBLICATION / 1.0.0
-- Contract: 74EC0431ECD2FEE2D50AA6DC93D9464AC074EDD7DF2C5213CA0605D479BE3050
-- Projection: DCE7FA4FB351BD21DA1AB9B941234205A84108CA029FFE89A2B7A88D421D360A
-- Query: 3DA412DFFD746141B505E5B7D1877618852443C5FA3FD0B7C5C0073C52EDD6E5
-- M900-M906 definitions and historical rows remain authoritative.
begin;

-- pg_trgm is an accepted external baseline prerequisite.  Bind its schema
-- explicitly so matching never depends on the invoking session's search_path.
do $pg_trgm$
declare v_schema name;
begin
  select n.nspname into v_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid=e.extnamespace
  where e.extname='pg_trgm';

  if v_schema is null then
    raise exception using
      errcode='55000',
      message='S1 prerequisite missing: pg_trgm must be installed in schema public';
  end if;
  if v_schema<>'public' then
    raise exception using
      errcode='55000',
      message=pg_catalog.format(
        'S1 prerequisite incompatible: pg_trgm is installed in schema %I, expected public',v_schema);
  end if;
  if pg_catalog.to_regprocedure('public.similarity(text,text)') is null then
    raise exception using
      errcode='55000',
      message='S1 prerequisite missing: public.similarity(text,text)';
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_depend d
    join pg_catalog.pg_extension e on e.oid=d.refobjid
    where e.extname='pg_trgm'
      and d.classid='pg_catalog.pg_proc'::pg_catalog.regclass
      and d.objid=pg_catalog.to_regprocedure('public.similarity(text,text)')::pg_catalog.oid
      and d.deptype='e'
  ) then
    raise exception using
      errcode='55000',
      message='S1 prerequisite incompatible: public.similarity(text,text) is not managed by pg_trgm';
  end if;
end;
$pg_trgm$;

-- These roles are provisioned in the separately approved installation. This
-- definition never supplies passwords or creates runtime administrative edges.
do $roles$
begin
  if not exists (select from pg_roles where rolname='koaptix_s1_owner'
      and not rolcanlogin and not rolsuper and not rolbypassrls
      and not rolcreaterole and not rolcreatedb and not rolreplication)
     or not exists (select from pg_roles where rolname='koaptix_publication_writer'
      and rolcanlogin and not rolsuper and not rolbypassrls
      and not rolcreaterole and not rolcreatedb and not rolreplication and rolconnlimit=2)
     or not exists (select from pg_roles where rolname='koaptix_publication_verifier'
      and rolcanlogin and not rolsuper and not rolbypassrls
      and not rolcreaterole and not rolcreatedb and not rolreplication and rolconnlimit=1)
  then raise exception 'S1 exact provisioned role prerequisites required'; end if;
  if exists (select from pg_auth_members m join pg_roles r on r.oid=m.member
             where r.rolname in ('koaptix_publication_writer','koaptix_publication_verifier'))
  then raise exception 'S1 runtime role membership is forbidden'; end if;
end;
$roles$;

create schema koaptix_s1 authorization koaptix_s1_owner;
set local role koaptix_s1_owner;
revoke all on schema koaptix_s1 from public;
grant usage on schema koaptix_s1 to koaptix_publication_writer,koaptix_publication_verifier;
reset role;
grant usage on schema public to koaptix_s1_owner;
-- The accepted source enables RLS on these relations without an S1-owner
-- policy. Add only this NOLOGIN owner's required row visibility/INSERT path;
-- W/V still have neither table grants nor a policy usable as their own roles.
create policy koaptix_s1_owner_read on public.apt_complex for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_read on public.apt_market_cap_snapshot for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_read on public.complex_eligibility_snapshot for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_read on public.complex_name_alias for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_read on public.region_dim for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_read on public.koaptix_rank_snapshot for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_insert on public.koaptix_rank_snapshot for insert to koaptix_s1_owner with check (true);
create policy koaptix_s1_owner_read on public.koaptix_index_snapshot for select to koaptix_s1_owner using (true);
create policy koaptix_s1_owner_insert on public.koaptix_index_snapshot for insert to koaptix_s1_owner with check (true);
set local role koaptix_rank_authority_owner;
do $owner_rows_authority$
declare t text;
begin
  foreach t in array array['koaptix_rank_input_authority_manifest','koaptix_rank_input_manifest_revocation'] loop
    execute format('create policy koaptix_s1_owner_read on public.%I for select to koaptix_s1_owner using (true)',t);
  end loop;
  execute 'create policy koaptix_s1_owner_insert on public.koaptix_rank_input_authority_manifest for insert to koaptix_s1_owner with check (true)';
end;
$owner_rows_authority$;
grant select on public.koaptix_rank_input_authority_manifest,
  public.koaptix_rank_input_manifest_revocation to koaptix_s1_owner;
grant insert on public.koaptix_rank_input_authority_manifest to koaptix_s1_owner;
grant execute on function public.koaptix_text_array_is_distinct_nonblank(text[]) to koaptix_s1_owner;
reset role;
set local role koaptix_rank_publication_owner;
do $owner_rows_publication$
declare t text;
begin
  foreach t in array array['koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
    'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
    'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
    'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
    'koaptix_latest_board_publication'] loop
    execute format('create policy koaptix_s1_owner_read on public.%I for select to koaptix_s1_owner using (true)',t);
  end loop;
  execute 'create policy koaptix_s1_owner_insert on public.koaptix_latest_board_publication_event for insert to koaptix_s1_owner with check (true)';
end;
$owner_rows_publication$;
create policy koaptix_s1_owner_pointer on public.koaptix_latest_board_publication
  for update to koaptix_s1_owner using (true) with check (true);
grant select on public.v_koaptix_canonical_rank_input_u,
  public.v_koaptix_rank_membership_authority_u,
  public.koaptix_latest_board_generation,public.koaptix_latest_board_generation_surface,
  public.koaptix_latest_board_generation_universe,public.koaptix_latest_board_generation_row,
  public.koaptix_latest_board_generation_global_row,public.koaptix_rank_publication_history_stage,
  public.koaptix_rank_publication_snapshot_stage,public.koaptix_latest_board_publication_event,
  public.koaptix_latest_board_publication to koaptix_s1_owner;
grant insert on public.koaptix_latest_board_publication_event to koaptix_s1_owner;
grant update(active_event_id,active_generation_id,previous_generation_id,publication_version,published_at)
  on public.koaptix_latest_board_publication to koaptix_s1_owner;
grant references(event_id,publication_version,to_generation_id,recorded_at)
  on public.koaptix_latest_board_publication_event to koaptix_s1_owner;
grant execute on function public.koaptix_compute_rank_input_authority(date),
  public.koaptix_assert_rank_input_authority(text,date,jsonb),
  public.koaptix_verify_latest_board_generation(uuid),
  public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)
  to koaptix_s1_owner;
reset role;
-- Temporary installation-only CREATE; revoked at the end of this transaction.
grant create on schema public to koaptix_s1_owner;
grant select on public.staging_market_raw,public.complex_name_alias,public.apt_complex,
  public.koaptix_complex_region_map,public.region_dim,public.apt_market_cap_snapshot,
  public.complex_eligibility_snapshot,public.v_koaptix_universe_membership_u,
  public.complex_rank_history,public.koaptix_rank_snapshot,public.koaptix_market_daily_summary,
  public.koaptix_index_snapshot to koaptix_s1_owner;
grant update(complex_id,apt_name_ko,sigungu_name,legal_dong_name,household_count,build_year,approval_year,
  building_count,parking_count,recovery_52w,market_cap_krw,universe_code) on public.staging_market_raw to koaptix_s1_owner;
grant insert,update on public.koaptix_complex_region_map to koaptix_s1_owner;
grant insert on public.complex_rank_history,public.koaptix_rank_snapshot,
  public.koaptix_market_daily_summary,public.koaptix_index_snapshot to koaptix_s1_owner;
do $sequence$
declare v_sequence regclass;
begin
  v_sequence:=pg_get_serial_sequence('public.complex_rank_history','id')::regclass;
  if v_sequence is not null then execute format('grant usage on sequence %s to koaptix_s1_owner',v_sequence); end if;
end;
$sequence$;

set local role koaptix_s1_owner;
alter default privileges in schema koaptix_s1 revoke execute on functions from public;

create function koaptix_s1.canonical(p_value jsonb) returns text
language plpgsql immutable strict parallel safe
set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v text;
begin
  case jsonb_typeof(p_value)
  when 'object' then
    select '{'||coalesce(string_agg(to_jsonb(key)::text||':'||koaptix_s1.canonical(value),
                                  ',' order by key collate "C"),'')||'}' into v
    from jsonb_each(p_value);
  when 'array' then
    select '['||coalesce(string_agg(koaptix_s1.canonical(value),',' order by ordinal),'')||']'
      into v from jsonb_array_elements(p_value) with ordinality a(value,ordinal);
  else v:=p_value::text;
  end case;
  return v;
end;
$body$;

create function koaptix_s1.digest(p_value jsonb) returns text
language sql immutable strict parallel safe
set search_path=pg_catalog,public,koaptix_s1 as $body$
  select upper(encode(sha256(convert_to(koaptix_s1.canonical(p_value),'UTF8')),'hex'));
$body$;

create function koaptix_s1.utc(p_value timestamptz) returns text
language sql immutable strict parallel safe
set search_path=pg_catalog,public,koaptix_s1 as $body$
  select to_char(p_value at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$body$;

create table koaptix_s1.policy (
  singleton boolean primary key default true check(singleton),
  contract_name text not null check(contract_name='KOAPTIX_S1_IDEMPOTENT_FORWARD_PUBLICATION'),
  contract_version text not null check(contract_version='1.0.0'),
  contract_sha text not null check(contract_sha='74EC0431ECD2FEE2D50AA6DC93D9464AC074EDD7DF2C5213CA0605D479BE3050'),
  projection_identity text not null check(projection_identity='DCE7FA4FB351BD21DA1AB9B941234205A84108CA029FFE89A2B7A88D421D360A'),
  publication_track text not null check(publication_track='KOAPTIX_OFFICIAL_DAILY'),
  activation_boundary date not null check(activation_boundary>=date '2026-09-03'),
  first_scheduled_tick timestamptz not null,
  source_binding jsonb not null check(jsonb_typeof(source_binding)='object'),
  manual_override_allowed boolean not null,
  max_phase_invocations smallint not null default 2 check(max_phase_invocations=2),
  max_w_starts smallint not null default 2 check(max_w_starts=2),
  occurrence_seconds integer not null default 300 check(occurrence_seconds=300)
);
-- No policy row is fabricated here. Activation/source binding belongs to Q5.

create table koaptix_s1.plan_segment (
  publication_track text not null check(publication_track='KOAPTIX_OFFICIAL_DAILY'),
  d date not null check(d>date '2026-09-03'),
  segment_kind text not null check(segment_kind in ('PREPARATION','PUBLICATION')),
  plan_id text not null check(plan_id ~ '^[0-9A-F]{64}$'),
  root_kind text not null default 'PREPARATION' check(root_kind='PREPARATION'),
  preparation_segment_sha text,
  segment_sha text not null unique check(segment_sha ~ '^[0-9A-F]{64}$'),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  created_at timestamptz not null default transaction_timestamp(),
  primary key(publication_track,d,segment_kind),
  unique(plan_id,segment_kind),
  foreign key(plan_id,root_kind) references koaptix_s1.plan_segment(plan_id,segment_kind)
    deferrable initially deferred,
  foreign key(preparation_segment_sha) references koaptix_s1.plan_segment(segment_sha),
  check(segment_sha=koaptix_s1.digest(payload)),
  check((segment_kind='PREPARATION' and preparation_segment_sha is null)
     or (segment_kind='PUBLICATION' and preparation_segment_sha is not null))
);

create table koaptix_s1.phase_record (
  plan_id text not null,
  root_kind text not null default 'PREPARATION' check(root_kind='PREPARATION'),
  phase text not null check(phase in ('W_START','P','S','A','V','B','D','R_P','R_S','R_A','R_B','R_D')),
  record_kind text not null check(record_kind in ('ADMIT','COMPLETE','VERDICT','OBSERVE')),
  ordinal smallint not null,
  phase_identity text not null check(phase_identity ~ '^[0-9A-F]{64}$'),
  actor name not null check(actor in ('koaptix_publication_writer','koaptix_publication_verifier')),
  backend_pid integer not null default pg_backend_pid(),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  recorded_at timestamptz not null default transaction_timestamp(),
  primary key(plan_id,phase,record_kind,ordinal),
  foreign key(plan_id,root_kind) references koaptix_s1.plan_segment(plan_id,segment_kind),
  check((record_kind in ('ADMIT','OBSERVE') and ordinal in (1,2))
     or (record_kind in ('COMPLETE','VERDICT') and ordinal=0)),
  check(record_kind<>'VERDICT' or (phase='V' and actor='koaptix_publication_verifier')),
  check(record_kind<>'ADMIT' or
    (actor='koaptix_publication_writer' and phase in ('W_START','P','S','A','B','D')) or
    (actor='koaptix_publication_verifier' and phase in ('V','R_P','R_S','R_A','R_B','R_D')))
);

create table koaptix_s1.publication_slot (
  publication_track text not null check(publication_track='KOAPTIX_OFFICIAL_DAILY'),
  d date not null,
  slot_code text not null check(slot_code='GLOBAL' or slot_code ~ '^U:[A-Z0-9_]+$'),
  plan_id text not null,
  publication_kind text not null default 'PUBLICATION' check(publication_kind='PUBLICATION'),
  event_id uuid not null,
  publication_version bigint not null,
  generation_id uuid not null,
  recorded_at timestamptz not null,
  primary key(publication_track,d,slot_code),
  foreign key(plan_id,publication_kind) references koaptix_s1.plan_segment(plan_id,segment_kind),
  foreign key(event_id,publication_version,generation_id,recorded_at)
    references public.koaptix_latest_board_publication_event(event_id,publication_version,to_generation_id,recorded_at)
    deferrable initially deferred
);

create function koaptix_s1.reject_mutation() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,koaptix_s1 as $body$
begin raise exception 'immutable S1 state cannot be updated, deleted or truncated'; end;
$body$;

create trigger s1_plan_immutable before update or delete on koaptix_s1.plan_segment
for each row execute function koaptix_s1.reject_mutation();
create trigger s1_phase_immutable before update or delete on koaptix_s1.phase_record
for each row execute function koaptix_s1.reject_mutation();
create trigger s1_slot_immutable before update or delete on koaptix_s1.publication_slot
for each row execute function koaptix_s1.reject_mutation();
create trigger s1_policy_immutable before update or delete on koaptix_s1.policy
for each row execute function koaptix_s1.reject_mutation();
create trigger s1_plan_no_truncate before truncate on koaptix_s1.plan_segment
for each statement execute function koaptix_s1.reject_mutation();
create trigger s1_phase_no_truncate before truncate on koaptix_s1.phase_record
for each statement execute function koaptix_s1.reject_mutation();
create trigger s1_slot_no_truncate before truncate on koaptix_s1.publication_slot
for each statement execute function koaptix_s1.reject_mutation();
create trigger s1_policy_no_truncate before truncate on koaptix_s1.policy
for each statement execute function koaptix_s1.reject_mutation();

create function koaptix_s1.require_actor(p_actor text) returns void
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
begin
  if (p_actor='W' and session_user<>'koaptix_publication_writer') or
     (p_actor='V' and session_user<>'koaptix_publication_verifier') or
     (p_actor='BOTH' and session_user not in ('koaptix_publication_writer','koaptix_publication_verifier')) or
     p_actor not in ('W','V','BOTH') then raise exception 'S1 actual session identity denied'; end if;
end;
$body$;

create function koaptix_s1.require_serializable() returns void
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
begin
  if current_setting('transaction_isolation')<>'serializable' or current_setting('transaction_read_only')<>'off'
     or current_setting('TimeZone')<>'UTC' then
    raise exception 'S1 mutation requires SERIALIZABLE READ WRITE and UTC';
  end if;
end;
$body$;


create function koaptix_s1.koaptix_norm_apt_name(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(coalesce(trim(p_text), '')),
          '(아파트|맨션|빌라|주택)$',
          '',
          'g'
        ),
        '(\(|\)|\[|\]|\{|\})',
        '',
        'g'
      ),
      '[^0-9a-z가-힣]+',
      '',
      'g'
    ),
    ''
  );
$function$;

create function koaptix_s1.koaptix_norm_text(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
  select nullif(
    regexp_replace(lower(coalesce(trim(p_text), '')), '[^0-9a-z가-힣]+', '', 'g'),
    ''
  );
$function$;

create function koaptix_s1.koaptix_pick_column(p_schema text, p_table text, p_candidates text[])
 RETURNS text
 LANGUAGE sql
 STABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
  select c.column_name
  from information_schema.columns c
  where c.table_schema = p_schema
    and c.table_name = p_table
    and c.column_name = any (p_candidates)
  order by array_position(p_candidates, c.column_name)
  limit 1;
$function$;

create function koaptix_s1.koaptix_get_master_relation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
begin
  -- Force full nationwide master first.
  if to_regclass('public.apt_complex') is not null then
    return 'public.apt_complex';
  elsif to_regclass('public.v_koaptix_complex_detail_sheet') is not null then
    return 'public.v_koaptix_complex_detail_sheet';
  elsif to_regclass('public.koaptix_complex_detail_sheet') is not null then
    return 'public.koaptix_complex_detail_sheet';
  else
    return null;
  end if;
end;
$function$;

create function koaptix_s1.koaptix_get_household_relation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
begin
  if to_regclass('public.kapt_area') is not null then
    return 'public.kapt_area';

  elsif to_regclass('public.kapt_complex_area') is not null then
    return 'public.kapt_complex_area';

  elsif to_regclass('public.kapt_complex_household') is not null then
    return 'public.kapt_complex_household';

  elsif to_regclass('public.apt_complex') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'apt_complex'
        and column_name = 'complex_id'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'apt_complex'
        and column_name in ('household_count', 'total_household_count')
    )
  then
    return 'public.apt_complex';

  else
    return null;
  end if;
end;
$function$;

create function koaptix_s1.koaptix_build_master_source_sql()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
SET search_path=pg_catalog,public,koaptix_s1
AS $function$
declare
  v_relation text;
  v_schema text;
  v_table text;
  v_area_relation text;
  v_area_schema text;
  v_area_table text;

  v_complex_id_col text;
  v_apt_col text;
  v_sigungu_col text;
  v_dong_col text;
  v_lawd_col text;
  v_sgg_col text;
  v_umd_col text;
  v_household_col text;
  v_total_household_col text;
  v_build_year_col text;
  v_approval_year_col text;
  v_building_count_col text;
  v_parking_count_col text;
  v_recovery_col text;

  v_area_complex_id_col text;
  v_area_household_col text;
  v_area_total_household_col text;

  v_complex_id_expr text;
  v_apt_expr text;
  v_sigungu_expr text;
  v_dong_expr text;
  v_lawd_expr text;
  v_sgg_expr text;
  v_umd_expr text;
  v_household_expr text;
  v_total_household_expr text;
  v_build_year_expr text;
  v_approval_year_expr text;
  v_building_count_expr text;
  v_parking_count_expr text;
  v_recovery_expr text;

  v_area_sql text := 'select null::bigint as complex_id, null::integer as household_count, null::integer as total_household_count where false';
  v_area_household_agg text;
  v_area_total_household_agg text;
begin
  v_relation := koaptix_s1.koaptix_get_master_relation();
  if v_relation is null then
    return null;
  end if;

  v_schema := split_part(v_relation, '.', 1);
  v_table := split_part(v_relation, '.', 2);

  v_complex_id_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['complex_id', 'id']);
  v_apt_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['apt_name_ko', 'apt_nm', 'apt_name', 'name']);
  v_sigungu_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['sigungu_name', 'sgg_nm', 'district_name']);
  v_dong_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['legal_dong_name', 'umd_nm', 'dong_name', 'dong']);
  v_lawd_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['lawd_cd', 'lawd_code', 'legal_dong_code']);
  v_sgg_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['sgg_cd', 'sigungu_code']);
  v_umd_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['umd_cd', 'dong_code']);
  v_household_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['household_count']);
  v_total_household_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['total_household_count']);
  v_build_year_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['build_year']);
  v_approval_year_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['approval_year', 'completion_year']);
  v_building_count_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['building_count']);
  v_parking_count_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['parking_count']);
  v_recovery_col := koaptix_s1.koaptix_pick_column(v_schema, v_table, array['recovery_52w', 'recovery_rate_52w']);

  if v_complex_id_col is null then
    return null;
  end if;

  v_complex_id_expr := format('c.%I::bigint', v_complex_id_col);
  v_apt_expr := case when v_apt_col is not null then format('c.%I::text', v_apt_col) else 'null::text' end;
  v_sigungu_expr := case when v_sigungu_col is not null then format('c.%I::text', v_sigungu_col) else 'rm.sigungu_name::text' end;
  v_dong_expr := case when v_dong_col is not null then format('coalesce(c.%I::text, rm.umd_nm::text)', v_dong_col) else 'rm.umd_nm::text' end;
  v_lawd_expr := case when v_lawd_col is not null then format('coalesce(c.%I::text, rm.lawd_cd::text)', v_lawd_col) else 'rm.lawd_cd::text' end;
  v_sgg_expr := case when v_sgg_col is not null then format('coalesce(c.%I::text, rm.sgg_cd::text)', v_sgg_col) else 'rm.sgg_cd::text' end;
  v_umd_expr := case when v_umd_col is not null then format('coalesce(c.%I::text, rm.umd_cd::text)', v_umd_col) else 'rm.umd_cd::text' end;
  v_household_expr := case when v_household_col is not null then format('c.%I::integer', v_household_col) else 'null::integer' end;
  v_total_household_expr := case when v_total_household_col is not null then format('c.%I::integer', v_total_household_col) else 'null::integer' end;
  v_build_year_expr := case when v_build_year_col is not null then format('c.%I::integer', v_build_year_col) else 'null::integer' end;
  v_approval_year_expr := case when v_approval_year_col is not null then format('c.%I::integer', v_approval_year_col) else 'null::integer' end;
  v_building_count_expr := case when v_building_count_col is not null then format('c.%I::integer', v_building_count_col) else 'null::integer' end;
  v_parking_count_expr := case when v_parking_count_col is not null then format('c.%I::integer', v_parking_count_col) else 'null::integer' end;
  v_recovery_expr := case when v_recovery_col is not null then format('c.%I::numeric', v_recovery_col) else 'null::numeric' end;

  v_area_relation := koaptix_s1.koaptix_get_household_relation();
  if v_area_relation is not null then
    v_area_schema := split_part(v_area_relation, '.', 1);
    v_area_table := split_part(v_area_relation, '.', 2);

    v_area_complex_id_col := koaptix_s1.koaptix_pick_column(v_area_schema, v_area_table, array['complex_id', 'id']);
    v_area_household_col := koaptix_s1.koaptix_pick_column(v_area_schema, v_area_table, array['household_count']);
    v_area_total_household_col := koaptix_s1.koaptix_pick_column(v_area_schema, v_area_table, array['total_household_count']);

    if v_area_complex_id_col is not null and (v_area_household_col is not null or v_area_total_household_col is not null) then
      v_area_total_household_agg := case
        when v_area_total_household_col is not null then format('max(%I)::integer', v_area_total_household_col)
        when v_area_household_col is not null then format('sum(%I)::integer', v_area_household_col)
        else 'null::integer'
      end;

      v_area_household_agg := case
        when v_area_household_col is not null then format('sum(%I)::integer', v_area_household_col)
        when v_area_total_household_col is not null then format('max(%I)::integer', v_area_total_household_col)
        else 'null::integer'
      end;

      v_area_sql := format(
        $area$
          select
            %I::bigint as complex_id,
            %s as household_count,
            %s as total_household_count
          from %s
          where %I is not null
          group by 1
        $area$,
        v_area_complex_id_col,
        v_area_household_agg,
        v_area_total_household_agg,
        v_area_relation,
        v_area_complex_id_col
      );
    end if;
  end if;

  return format(
    $fmt$
      with area as (
        %s
      )
      select
        %s as complex_id,
        %s as apt_name_ko,
        %s as sigungu_name,
        %s as legal_dong_name,
        %s as lawd_cd,
        %s as sgg_cd,
        %s as umd_cd,
        coalesce(area.total_household_count, area.household_count, %s, %s)::integer as household_count,
        coalesce(area.total_household_count, area.household_count, %s, %s)::integer as total_household_count,
        coalesce(%s, %s)::integer as build_year,
        coalesce(%s, %s)::integer as approval_year,
        %s as building_count,
        %s as parking_count,
        %s as recovery_52w
      from %s c
      left join area
        on area.complex_id = %s
      left join public.koaptix_complex_region_map rm
        on rm.complex_id = %s
    $fmt$,
    v_area_sql,
    v_complex_id_expr,
    v_apt_expr,
    v_sigungu_expr,
    v_dong_expr,
    v_lawd_expr,
    v_sgg_expr,
    v_umd_expr,
    v_total_household_expr,
    v_household_expr,
    v_total_household_expr,
    v_household_expr,
    v_build_year_expr,
    v_approval_year_expr,
    v_approval_year_expr,
    v_build_year_expr,
    v_building_count_expr,
    v_parking_count_expr,
    v_recovery_expr,
    v_relation,
    v_complex_id_expr,
    v_complex_id_expr
  );
end;
$function$;

create function koaptix_s1.match_rows(
  p_stage jsonb,p_master jsonb,p_alias jsonb,p_as_of date
) returns jsonb language sql stable
set search_path=pg_catalog,public,koaptix_s1 as $match$

      with stage as (
        select
          s.id,
          koaptix_s1.koaptix_norm_apt_name(coalesce(s.apt_nm, s.apt_name_ko)) as norm_apt,
          koaptix_s1.koaptix_norm_text(coalesce(s.umd_nm, s.legal_dong_name)) as norm_dong,
          coalesce(s.build_year, s.approval_year) as raw_build_year,
          s.lawd_cd,
          coalesce(s.sgg_cd, left(s.lawd_cd, 5)) as sgg_cd,
          s.umd_cd,
          s.deal_amount_krw
        from jsonb_populate_recordset(null::public.staging_market_raw,$1) s
        where s.run_date = $4
          and coalesce(s.apt_nm, s.apt_name_ko) is not null
          and s.deal_amount_krw is not null
          and coalesce(s.source_dataset, 'molit-apt-trade-detail') = 'molit-apt-trade-detail'
      ),
      master as (
        select
          m.*,
          koaptix_s1.koaptix_norm_apt_name(m.apt_name_ko) as norm_apt,
          koaptix_s1.koaptix_norm_text(m.legal_dong_name) as norm_dong,
          coalesce(m.sgg_cd, left(m.lawd_cd, 5)) as norm_sgg_cd,
          coalesce(m.build_year, m.approval_year) as norm_build_year
        from (
          select * from jsonb_to_recordset($2) as m(
          complex_id bigint, apt_name_ko text, sigungu_name text, legal_dong_name text,
          lawd_cd text, sgg_cd text, umd_cd text, household_count integer,
          total_household_count integer, build_year integer, approval_year integer,
          building_count integer, parking_count integer, recovery_52w numeric)
        ) m
      ),
      strict_exact as (
        select
          s.id,
          m.complex_id,
          m.apt_name_ko,
          m.sigungu_name,
          m.legal_dong_name,
          m.lawd_cd,
          m.sgg_cd,
          m.umd_cd,
          m.household_count,
          m.total_household_count,
          m.build_year,
          m.approval_year,
          m.building_count,
          m.parking_count,
          m.recovery_52w,
          1 as strategy_priority,
          1.0::numeric as apt_similarity,
          abs(coalesce(m.norm_build_year, s.raw_build_year) - coalesce(s.raw_build_year, m.norm_build_year, 0)) as build_gap
        from stage s
        join master m
          on m.norm_apt = s.norm_apt
        where s.norm_apt is not null
          and (
            (s.norm_dong is not null and m.norm_dong = s.norm_dong)
            or (s.lawd_cd is not null and m.lawd_cd is not null and left(s.lawd_cd, 5) = left(m.lawd_cd, 5))
            or (s.sgg_cd is not null and m.norm_sgg_cd is not null and s.sgg_cd = m.norm_sgg_cd)
          )
          and (
            s.raw_build_year is null
            or m.norm_build_year is null
            or abs(m.norm_build_year - s.raw_build_year) <= 1
          )
      ),
      exact_unique as (
        select
          s.id,
          m.complex_id,
          m.apt_name_ko,
          m.sigungu_name,
          m.legal_dong_name,
          m.lawd_cd,
          m.sgg_cd,
          m.umd_cd,
          m.household_count,
          m.total_household_count,
          m.build_year,
          m.approval_year,
          m.building_count,
          m.parking_count,
          m.recovery_52w,
          2 as strategy_priority,
          1.0::numeric as apt_similarity,
          abs(coalesce(m.norm_build_year, s.raw_build_year) - coalesce(s.raw_build_year, m.norm_build_year, 0)) as build_gap
        from stage s
        join master m
          on m.norm_apt = s.norm_apt
        where s.norm_apt is not null
          and not exists (
            select 1 from strict_exact e where e.id = s.id
          )
          and (
            s.raw_build_year is null
            or m.norm_build_year is null
            or abs(m.norm_build_year - s.raw_build_year) <= 1
          )
          and 1 = (
            select count(*)
            from master mx
            where mx.norm_apt = s.norm_apt
              and (
                s.raw_build_year is null
                or mx.norm_build_year is null
                or abs(mx.norm_build_year - s.raw_build_year) <= 1
              )
          )
      ),
      fuzzy_dong as (
        select
          s.id,
          m.complex_id,
          m.apt_name_ko,
          m.sigungu_name,
          m.legal_dong_name,
          m.lawd_cd,
          m.sgg_cd,
          m.umd_cd,
          m.household_count,
          m.total_household_count,
          m.build_year,
          m.approval_year,
          m.building_count,
          m.parking_count,
          m.recovery_52w,
          3 as strategy_priority,
          public.similarity(m.norm_apt, s.norm_apt) as apt_similarity,
          abs(coalesce(m.norm_build_year, s.raw_build_year) - coalesce(s.raw_build_year, m.norm_build_year, 0)) as build_gap
        from stage s
        join master m
          on s.norm_dong is not null
         and m.norm_dong = s.norm_dong
         and s.norm_apt is not null
         and public.similarity(m.norm_apt, s.norm_apt) >= 0.74
        where not exists (
            select 1 from strict_exact e where e.id = s.id
          )
          and not exists (
            select 1 from exact_unique e where e.id = s.id
          )
          and (
            s.raw_build_year is null
            or m.norm_build_year is null
            or abs(m.norm_build_year - s.raw_build_year) <= 2
          )
      ),
      fuzzy_region as (
        select
          s.id,
          m.complex_id,
          m.apt_name_ko,
          m.sigungu_name,
          m.legal_dong_name,
          m.lawd_cd,
          m.sgg_cd,
          m.umd_cd,
          m.household_count,
          m.total_household_count,
          m.build_year,
          m.approval_year,
          m.building_count,
          m.parking_count,
          m.recovery_52w,
          4 as strategy_priority,
          public.similarity(m.norm_apt, s.norm_apt) as apt_similarity,
          abs(coalesce(m.norm_build_year, s.raw_build_year) - coalesce(s.raw_build_year, m.norm_build_year, 0)) as build_gap
        from stage s
        join master m
          on s.norm_apt is not null
         and public.similarity(m.norm_apt, s.norm_apt) >= 0.80
         and (
              (s.sgg_cd is not null and m.norm_sgg_cd is not null and s.sgg_cd = m.norm_sgg_cd)
              or (s.lawd_cd is not null and m.lawd_cd is not null and left(s.lawd_cd, 5) = left(m.lawd_cd, 5))
            )
        where not exists (
            select 1 from strict_exact e where e.id = s.id
          )
          and not exists (
            select 1 from exact_unique e where e.id = s.id
          )
          and not exists (
            select 1 from fuzzy_dong e where e.id = s.id
          )
          and (
            s.raw_build_year is null
            or m.norm_build_year is null
            or abs(m.norm_build_year - s.raw_build_year) <= 2
          )
      ),
      alias_lawd_candidates as (
        select distinct
          s.id,
          m.complex_id,
          m.apt_name_ko,
          m.sigungu_name,
          m.legal_dong_name,
          m.lawd_cd,
          m.sgg_cd,
          m.umd_cd,
          m.household_count,
          m.total_household_count,
          m.build_year,
          m.approval_year,
          m.building_count,
          m.parking_count,
          m.recovery_52w,
          5 as strategy_priority,
          0.95::numeric as apt_similarity,
          abs(coalesce(m.norm_build_year, s.raw_build_year) - coalesce(s.raw_build_year, m.norm_build_year, 0)) as build_gap
        from stage s
        join jsonb_populate_recordset(null::public.complex_name_alias,$3) cna
          on coalesce(cna.alias_name_norm, koaptix_s1.koaptix_norm_apt_name(cna.alias_name)) = s.norm_apt
         and (cna.valid_to is null or cna.valid_to >= $4)
        join master m
          on m.complex_id = cna.complex_id
         and m.lawd_cd = s.lawd_cd
        where s.norm_apt is not null
          and s.lawd_cd is not null
          and left(s.lawd_cd, 2) <> '11'
          and not exists (
            select 1 from strict_exact e where e.id = s.id
          )
          and not exists (
            select 1 from exact_unique e where e.id = s.id
          )
          and not exists (
            select 1 from fuzzy_dong e where e.id = s.id
          )
          and not exists (
            select 1 from fuzzy_region e where e.id = s.id
          )
          and (
            s.raw_build_year is null
            or m.norm_build_year is null
            or abs(m.norm_build_year - s.raw_build_year) <= 2
          )
      ),
      alias_lawd_unique as (
        select
          z.id,
          z.complex_id,
          z.apt_name_ko,
          z.sigungu_name,
          z.legal_dong_name,
          z.lawd_cd,
          z.sgg_cd,
          z.umd_cd,
          z.household_count,
          z.total_household_count,
          z.build_year,
          z.approval_year,
          z.building_count,
          z.parking_count,
          z.recovery_52w,
          z.strategy_priority,
          z.apt_similarity,
          z.build_gap
        from (
          select
            c.*,
            count(*) over (
              partition by c.id
            ) as alias_candidate_count,
            row_number() over (
              partition by c.id
              order by
                c.build_gap asc,
                coalesce(c.total_household_count, c.household_count) desc nulls last,
                c.complex_id asc
            ) as alias_rn
          from alias_lawd_candidates c
        ) z
        where z.alias_candidate_count = 1
          and z.alias_rn = 1
      ),
      candidates as (
        select * from strict_exact
        union all
        select * from exact_unique
        union all
        select * from fuzzy_dong
        union all
        select * from fuzzy_region
        union all
        select * from alias_lawd_unique
      ),
      ranked as (
        select
          c.*,
          dense_rank() over (
            partition by c.id
            order by
              c.strategy_priority asc,
              c.apt_similarity desc nulls last,
              c.build_gap asc,
              coalesce(c.total_household_count, c.household_count) desc nulls last,
              c.complex_id asc
          ) as rn,
          count(*) over (
            partition by c.id, c.strategy_priority
          ) as same_strategy_count
        from candidates c
      ),
      best as (
        select *
        from ranked
        where rn = 1
          and (
            strategy_priority <= 2
            or same_strategy_count = 1
          )
      )

      select coalesce(jsonb_agg(to_jsonb(b)-'rn'-'same_strategy_count' order by id),'[]'::jsonb)
      from best b
$match$;

-- Exact C04 body; only SQL function parameter plumbing is added.
create function koaptix_s1.capture_projection(date,timestamptz,text,timestamptz)
returns jsonb language sql stable
set search_path=pg_catalog,public,koaptix_s1 as $projection$
-- PROSPECTIVE EXPLICIT RECONSTRUCTION. LOCAL CANDIDATE ONLY.
-- One read-only statement; no application UDF and no current-D official output input.
-- PostgreSQL prepared parameters: $1 target date, $2 fixed generated_at timestamptz,
-- $3 fixed execution_run_id text, $4 fixed stage created_at timestamptz.
-- Only the PUBLISHED_NEW_STATE branch consumes this projection. Verified no-change
-- and no-input days produce a separate reference and no fabricated target-D rows.
WITH input AS MATERIALIZED (
  SELECT $1::date AS d, $2::timestamptz AS generated_at,
         $3::text AS execution_run_id, $4::timestamptz AS created_at
), authority AS MATERIALIZED (
  with m as (
    select * from public.apt_market_cap_snapshot where snapshot_date=(SELECT d FROM input)
  ), e as (
    select * from public.complex_eligibility_snapshot where snapshot_date=(SELECT d FROM input)
  ), paired as (
    select coalesce(m.complex_id,e.complex_id) as complex_id,
           m.complex_id as m_id,e.complex_id as e_id,
           m.market_cap_krw,m.coverage_status,m.calculation_version,
           e.is_rank_eligible,e.eligibility_status,e.rule_version,e.manual_override,
           a.is_active,a.master_status,a.merged_into_complex_id
    from m full join e using(snapshot_date,complex_id)
    left join public.apt_complex a on a.complex_id=coalesce(m.complex_id,e.complex_id)
  ), market_hashes as (
    select complex_id,encode(sha256(convert_to(jsonb_build_array(
      complex_id,market_cap_krw,coverage_status,calculation_version,
      total_household_count,priced_household_count,priced_household_ratio,
      total_cluster_count,priced_cluster_count
    )::text,'UTF8')),'hex') as row_hash from m
  ), eligibility_hashes as (
    select complex_id,encode(sha256(convert_to(jsonb_build_array(
      complex_id,is_rank_eligible,eligibility_status,rule_version,manual_override,
      total_household_count,priced_household_count,total_cluster_count,priced_cluster_count
    )::text,'UTF8')),'hex') as row_hash from e
  ), combined_hashes as (
    select complex_id,encode(sha256(convert_to(jsonb_build_array(
      complex_id,m_id,e_id,market_cap_krw,coverage_status,calculation_version,
      is_rank_eligible,eligibility_status,rule_version,manual_override,
      is_active,master_status,merged_into_complex_id
    )::text,'UTF8')),'hex') as row_hash from paired
  ), qualified as (
    select m.complex_id,m.market_cap_krw,m.coverage_status,m.calculation_version,
           e.eligibility_status,e.rule_version,e.manual_override
    from m join e using(snapshot_date,complex_id)
    join public.apt_complex a on a.complex_id=m.complex_id
    where m.market_cap_krw>0 and m.coverage_status='full'
      and e.is_rank_eligible is true and e.eligibility_status='eligible'
      and a.is_active is true and a.master_status='active'
      and a.merged_into_complex_id is null
  ), selected_hashes as (
    select complex_id,encode(sha256(convert_to(jsonb_build_array(
      complex_id,market_cap_krw,coverage_status,calculation_version,
      eligibility_status,rule_version,manual_override
    )::text,'UTF8')),'hex') as row_hash from qualified
  ), qualified_membership as (
    select q.complex_id,u.universe_code
    from qualified q
    join public.v_koaptix_universe_membership_u u on u.complex_id=q.complex_id
  ), membership_hashes as (
    select complex_id,universe_code,
           encode(sha256(convert_to(jsonb_build_array(
             complex_id,universe_code
           )::text,'UTF8')),'hex') as row_hash
    from qualified_membership
  ), universe_rollup as (
    select universe_code,count(*)::bigint as row_count,
           upper(encode(sha256(convert_to(
             string_agg(complex_id::text,',' order by complex_id),'UTF8'
           )),'hex')) as row_set_sha256
    from qualified_membership group by universe_code
  ), universe_hashes as (
    select universe_code,row_count,row_set_sha256,
           encode(sha256(convert_to(jsonb_build_array(
             universe_code,row_count,row_set_sha256
           )::text,'UTF8')),'hex') as universe_hash
    from universe_rollup
  ), universe_manifest as (
    select jsonb_agg(jsonb_build_object(
             'universe_code',universe_code,'row_count',row_count,
             'row_set_sha256',row_set_sha256
           ) order by universe_code) as manifest,
           to_jsonb(array_agg(universe_code order by universe_code)) as codes,
           upper(encode(sha256(convert_to(
             string_agg(universe_hash,'' order by universe_code),'UTF8'
           )),'hex')) as set_sha256
    from universe_hashes
  ), digests as (
    select
      (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from market_hashes) as market_cap_set_sha256,
      (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from eligibility_hashes) as eligibility_set_sha256,
      (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from combined_hashes) as source_set_sha256,
      (select upper(encode(sha256(convert_to(string_agg(row_hash,'' order by complex_id),'UTF8')),'hex')) from selected_hashes) as selected_input_sha256,
      (select upper(encode(sha256(convert_to(string_agg(
         row_hash,'' order by universe_code,complex_id
       ),'UTF8')),'hex')) from membership_hashes) as membership_set_sha256
  )
  select jsonb_build_object(
    'snapshot_date',(SELECT d FROM input),
    'market_cap_rows',(select count(*) from m),
    'eligibility_rows',(select count(*) from e),
    'join_rows',(select count(*) from paired where m_id is not null and e_id is not null),
    'market_cap_only_rows',(select count(*) from paired where m_id is not null and e_id is null),
    'eligibility_only_rows',(select count(*) from paired where m_id is null and e_id is not null),
    'qualified_rows',(select count(*) from qualified),
    'manual_override_rows',(select count(*) from e where manual_override is true),
    'invalid_source_contract_rows',
      (select count(*) from m where calculation_version is null or btrim(calculation_version)=''
         or coverage_status is null or btrim(coverage_status)='')
      +(select count(*) from e where rule_version is null or btrim(rule_version)=''
         or eligibility_status is null or btrim(eligibility_status)=''
         or is_rank_eligible is null or manual_override is null),
    'market_cap_calculation_versions',coalesce((
      select to_jsonb(array_agg(distinct calculation_version order by calculation_version))
      from m where calculation_version is not null
    ),'[]'::jsonb),
    'eligibility_rule_versions',coalesce((
      select to_jsonb(array_agg(distinct rule_version order by rule_version))
      from e where rule_version is not null
    ),'[]'::jsonb),
    'market_cap_source_ids',jsonb_build_array(
      'relation:public.apt_market_cap_snapshot','set-sha256:'||digests.market_cap_set_sha256),
    'eligibility_source_ids',jsonb_build_array(
      'relation:public.complex_eligibility_snapshot','set-sha256:'||digests.eligibility_set_sha256),
    'membership_source_ids',jsonb_build_array(
      'relation:public.v_koaptix_rank_membership_authority_u',
      'relation:public.v_koaptix_universe_membership_u',
      'set-sha256:'||digests.membership_set_sha256),
    'jeonbuk_membership_rows',(select count(*) from public.v_koaptix_universe_membership_u where universe_code='JEONBUK_ALL'),
    'sgg_52111_membership_rows',(select count(*) from public.v_koaptix_universe_membership_u where universe_code='SGG_52111'),
    'sgg_52111_qualified_rows',(select count(*) from qualified_membership where universe_code='SGG_52111'),
    'membership_duplicate_pairs',(select count(*) from (
      select complex_id,universe_code from public.v_koaptix_universe_membership_u
      group by complex_id,universe_code having count(*)<>1
    ) duplicate_pairs),
    'membership_fail_closed_qualified_rows',(select count(*)
      from qualified q left join public.v_koaptix_rank_membership_authority_u a
        on a.complex_id=q.complex_id
      where a.resolution_status is distinct from 'RESOLVED'),
    'affected_universe_codes',(select codes from universe_manifest),
    'affected_universe_manifest',(select manifest from universe_manifest),
    'market_cap_set_sha256',digests.market_cap_set_sha256,
    'eligibility_set_sha256',digests.eligibility_set_sha256,
    'source_set_sha256',digests.source_set_sha256,
    'selected_input_sha256',digests.selected_input_sha256,
    'membership_set_sha256',digests.membership_set_sha256,
    'affected_universe_set_sha256',(select set_sha256 from universe_manifest),
    'blocking_review_rule_version','NO_DIRECT_RANK_REVIEW_AUTHORITY_V1',
    'blocking_review_rows',0,
    'blocking_review_sha256','4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'
  )
  from digests
), market_d AS MATERIALIZED (
  SELECT m.* FROM public.apt_market_cap_snapshot m
  CROSS JOIN input i WHERE m.snapshot_date=i.d
), eligibility_d AS MATERIALIZED (
  SELECT e.* FROM public.complex_eligibility_snapshot e
  CROSS JOIN input i WHERE e.snapshot_date=i.d
), qualified AS MATERIALIZED (
  SELECT m.*,e.is_rank_eligible,e.eligibility_status
  FROM market_d m JOIN eligibility_d e USING(snapshot_date,complex_id)
  JOIN public.apt_complex c USING(complex_id)
  WHERE m.market_cap_krw>0 AND m.coverage_status='full'
    AND e.is_rank_eligible IS TRUE AND e.eligibility_status='eligible'
    AND c.is_active IS TRUE AND c.master_status='active'
    AND c.merged_into_complex_id IS NULL
), members AS MATERIALIZED (
  SELECT q.complex_id,u.universe_code,u.universe_name,u.universe_scope
  FROM qualified q JOIN public.v_koaptix_universe_membership_u u USING(complex_id)
), canonical_metadata AS MATERIALIZED (
  SELECT q.complex_id,c.apt_name_ko,c.address_road,c.address_jibun,
         coalesce(rm.umd_nm,c.legal_dong_name) AS legal_dong_name,
         c.build_year,coalesce(rm.sgg_cd,left(rm.lawd_cd,5)) AS sigungu_code,
         rm.sigungu_name AS global_sigungu_name,
         coalesce(nullif(rm.sigungu_name,''),rd.region_name_ko,'') AS service_sigungu_name,
         coalesce(c.household_count,c.total_household_count) AS household_count,
         c.latitude,c.longitude
  FROM qualified q JOIN public.apt_complex c USING(complex_id)
  LEFT JOIN public.koaptix_complex_region_map rm USING(complex_id)
  LEFT JOIN public.region_dim rd ON rd.region_id=c.region_id AND rd.region_type='sigungu'
), global_previous_date AS MATERIALIZED (
  SELECT max(h.snapshot_date) AS previous_date
  FROM public.complex_rank_history h CROSS JOIN input i WHERE h.snapshot_date<i.d
), global_previous AS MATERIALIZED (
  SELECT h.complex_id,h.rank_all
  FROM public.complex_rank_history h
  JOIN global_previous_date p ON h.snapshot_date=p.previous_date
), global_ranked AS MATERIALIZED (
  SELECT q.*,row_number() OVER(ORDER BY q.market_cap_krw DESC,q.complex_id ASC)::integer AS rank_all,
         sum(q.market_cap_krw::numeric) OVER() AS universe_total_market_cap_krw
  FROM qualified q
), common_global AS MATERIALIZED (
  SELECT r.*,p.previous_date,pr.rank_all AS previous_rank_all,
         pr.rank_all-r.rank_all AS rank_delta,
         CASE WHEN pr.rank_all IS NULL THEN 'NEW'
              WHEN pr.rank_all>r.rank_all THEN 'UP'
              WHEN pr.rank_all<r.rank_all THEN 'DOWN' ELSE 'SAME' END AS rank_movement,
         round(r.market_cap_krw::numeric/1000000000000.0,4) AS market_cap_trillion_krw,
         round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0),8) AS market_cap_share,
         round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0)*100::numeric,4) AS market_cap_share_pct
  FROM global_ranked r CROSS JOIN global_previous_date p
  LEFT JOIN global_previous pr USING(complex_id)
), universe_previous_dates AS MATERIALIZED (
  SELECT u.universe_code,
         CASE WHEN u.universe_code='KOREA_ALL' THEN (SELECT previous_date FROM global_previous_date)
              ELSE (SELECT max(s.snapshot_date) FROM public.koaptix_rank_snapshot s
                    CROSS JOIN input i WHERE s.universe_code=u.universe_code AND s.snapshot_date<i.d)
         END AS previous_date
  FROM (SELECT DISTINCT universe_code FROM members) u
), service_ranked AS MATERIALIZED (
  SELECT q.*,m.universe_code,m.universe_name,m.universe_scope,
         row_number() OVER(PARTITION BY m.universe_code
                           ORDER BY q.market_cap_krw DESC,q.complex_id ASC)::integer AS rank_all,
         sum(q.market_cap_krw::numeric) OVER(PARTITION BY m.universe_code) AS universe_total_market_cap_krw
  FROM qualified q JOIN members m USING(complex_id)
), service_previous AS MATERIALIZED (
  SELECT p.universe_code,p.previous_date,s.complex_id,s.rank_all
  FROM universe_previous_dates p
  JOIN public.koaptix_rank_snapshot s
    ON s.universe_code=p.universe_code AND s.snapshot_date=p.previous_date
  WHERE p.universe_code<>'KOREA_ALL'
), service_values AS MATERIALIZED (
  SELECT r.*,p.previous_date,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.previous_rank_all ELSE pr.rank_all END AS previous_rank_all,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.rank_delta ELSE pr.rank_all-r.rank_all END AS rank_delta_w,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.rank_movement
              WHEN pr.rank_all IS NULL THEN 'NEW' WHEN pr.rank_all>r.rank_all THEN 'UP'
              WHEN pr.rank_all<r.rank_all THEN 'DOWN' ELSE 'SAME' END AS rank_movement,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_trillion_krw
              ELSE round(r.market_cap_krw::numeric/1000000000000.0,4) END AS market_cap_trillion_krw,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_share
              ELSE round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0),8) END AS market_cap_share,
         CASE WHEN r.universe_code='KOREA_ALL' THEN g.market_cap_share_pct
              ELSE round(r.market_cap_krw::numeric/nullif(r.universe_total_market_cap_krw,0)*100::numeric,4) END AS market_cap_share_pct
  FROM service_ranked r JOIN universe_previous_dates p USING(universe_code)
  JOIN common_global g USING(complex_id)
  LEFT JOIN service_previous pr ON pr.universe_code=r.universe_code AND pr.complex_id=r.complex_id
), global_rows AS MATERIALIZED (
  SELECT g.snapshot_date,'KOREA_ALL'::text AS universe_code,g.complex_id,
         m.apt_name_ko,m.address_road,m.address_jibun,m.legal_dong_name,m.build_year,
         m.sigungu_code,m.global_sigungu_name AS sigungu_name,g.rank_all,
         NULL::text AS tier_code,NULL::text AS tier_label,NULL::integer AS tier_sort,
         g.market_cap_krw,g.market_cap_trillion_krw,g.market_cap_share,g.market_cap_share_pct,
         g.previous_rank_all,g.rank_delta AS rank_delta_1d,g.rank_movement,
         g.rank_all<=1000 AS is_top1000,g.total_household_count,m.household_count,
         g.priced_household_count,g.priced_household_ratio,g.total_cluster_count,g.priced_cluster_count,
         g.coverage_status,g.is_rank_eligible,g.eligibility_status,m.latitude,m.longitude,
         NULL::text AS recovery_52w
  FROM common_global g JOIN canonical_metadata m USING(complex_id)
), service_rows AS MATERIALIZED (
  SELECT s.snapshot_date,s.universe_code,s.universe_name,s.universe_scope,s.complex_id,
         m.apt_name_ko,m.service_sigungu_name AS sigungu_name,m.legal_dong_name,m.build_year,
         m.household_count,s.total_household_count,NULL::text AS recovery_52w,
         s.rank_all,s.previous_rank_all,s.rank_delta_w,s.rank_movement,s.market_cap_krw,
         s.market_cap_trillion_krw,s.market_cap_share,s.market_cap_share_pct,
         NULL::text AS tier_code,NULL::text AS tier_label,NULL::integer AS tier_sort,
         s.rank_all<=1000 AS is_top1000,s.previous_date AS source_previous_snapshot_date,
         to_char(i.generated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS generated_at,i.execution_run_id AS refresh_run_id
  FROM service_values s JOIN canonical_metadata m USING(complex_id) CROSS JOIN input i
), history_stage_rows AS MATERIALIZED (
  SELECT snapshot_date,complex_id,market_cap_krw,rank_all,market_cap_krw AS total_market_cap
  FROM common_global
), snapshot_stage_rows AS MATERIALIZED (
  SELECT s.snapshot_date,s.universe_code,s.complex_id,s.rank_all,s.market_cap_krw,
         s.market_cap_share::numeric(12,8) AS market_cap_share,s.previous_rank_all,
         s.rank_delta_w AS rank_delta_1d,s.is_top1000,
         'market_cap_desc'::text AS rank_method,'v1'::text AS calculation_version,
         to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
  FROM service_rows s CROSS JOIN input i
), checks AS MATERIALIZED (
  SELECT
    (SELECT d IS NOT NULL AND generated_at IS NOT NULL AND created_at IS NOT NULL
       AND execution_run_id IS NOT NULL AND btrim(execution_run_id)<>'' FROM input)
    AND (SELECT count(*)>0 FROM qualified)
    AND NOT EXISTS(SELECT complex_id FROM market_d GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS(SELECT complex_id FROM eligibility_d GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS((SELECT complex_id FROM market_d EXCEPT SELECT complex_id FROM eligibility_d)
                   UNION ALL
                   (SELECT complex_id FROM eligibility_d EXCEPT SELECT complex_id FROM market_d))
    AND NOT EXISTS(SELECT complex_id FROM canonical_metadata GROUP BY complex_id HAVING count(*)<>1)
    AND (SELECT count(*) FROM canonical_metadata)=(SELECT count(*) FROM qualified)
    AND NOT EXISTS(SELECT complex_id,universe_code FROM members
                   GROUP BY complex_id,universe_code HAVING count(*)<>1)
    AND (SELECT count(*) FROM members WHERE universe_code='KOREA_ALL')=(SELECT count(*) FROM qualified)
    AND NOT EXISTS(SELECT complex_id FROM global_previous GROUP BY complex_id HAVING count(*)<>1)
    AND NOT EXISTS(SELECT universe_code,complex_id FROM service_previous
                   GROUP BY universe_code,complex_id HAVING count(*)<>1)
    AND NOT EXISTS(
      SELECT 1 FROM qualified q LEFT JOIN public.v_koaptix_rank_membership_authority_u a USING(complex_id)
      WHERE a.resolution_status IS DISTINCT FROM 'RESOLVED')
    AND NOT EXISTS(
      SELECT 1 FROM qualified
      WHERE total_household_count IS NULL OR priced_household_count IS NULL
         OR priced_household_ratio IS NULL OR total_cluster_count IS NULL OR priced_cluster_count IS NULL
         OR total_household_count<0 OR priced_household_count<0 OR priced_household_count>total_household_count
         OR total_cluster_count<0 OR priced_cluster_count<0 OR priced_cluster_count>total_cluster_count
         OR priced_household_ratio<0 OR priced_household_ratio>1
         OR priced_household_ratio::text IN ('NaN','Infinity','-Infinity'))
    AND NOT EXISTS(
      SELECT 1 FROM market_d WHERE calculation_version IS NULL OR btrim(calculation_version)=''
        OR coverage_status IS NULL OR btrim(coverage_status)='')
    AND NOT EXISTS(
      SELECT 1 FROM eligibility_d WHERE rule_version IS NULL OR btrim(rule_version)=''
        OR eligibility_status IS NULL OR btrim(eligibility_status)=''
        OR is_rank_eligible IS NULL OR manual_override IS NULL)
    AS valid
), fail_closed AS MATERIALIZED (
  SELECT 1 / CASE WHEN valid IS TRUE THEN 1 ELSE 0 END AS assertion FROM checks
)
SELECT jsonb_build_object(
  'target_rank_date',i.d,
  'global_previous_snapshot_date',(SELECT previous_date FROM global_previous_date),
  'input_authority',(SELECT * FROM authority),
  'global_rows',(SELECT jsonb_agg(to_jsonb(g) ORDER BY g.snapshot_date,g.rank_all,g.complex_id) FROM global_rows g),
  'service_rows',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.snapshot_date,s.universe_code COLLATE "C",s.rank_all,s.complex_id) FROM service_rows s),
  'history_stage_rows',(SELECT jsonb_agg(to_jsonb(h) ORDER BY h.snapshot_date,h.rank_all,h.complex_id) FROM history_stage_rows h),
  'snapshot_stage_rows',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.snapshot_date,t.universe_code COLLATE "C",t.rank_all,t.complex_id) FROM snapshot_stage_rows t)
) AS projection
FROM input i CROSS JOIN fail_closed f
WHERE f.assertion=1;
$projection$;

create function koaptix_s1.capture_inputs(p_d date) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_master jsonb; v_sql text; v_binding jsonb; v_result jsonb; v_policy koaptix_s1.policy%rowtype;
begin
  select * into strict v_policy from koaptix_s1.policy where singleton;
  v_sql:=koaptix_s1.koaptix_build_master_source_sql();
  v_binding:=jsonb_build_object('master_relation',koaptix_s1.koaptix_get_master_relation(),
    'household_relation',koaptix_s1.koaptix_get_household_relation(),'master_sql',v_sql);
  if v_binding is distinct from v_policy.source_binding then
    raise exception 'BLOCK_CONFLICT: installed source relation/column binding changed'; end if;
  -- SQL text originates exclusively in the finite, private selector above.
  execute 'select coalesce(jsonb_agg(to_jsonb(m) order by m.complex_id),''[]''::jsonb) from ('||v_sql||') m'
    into v_master;
  v_result:=jsonb_build_object(
    'binding',v_binding,'master',v_master,
    'staging',(select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb)
               from public.staging_market_raw s where s.run_date=p_d),
    'aliases',(select coalesce(jsonb_agg(to_jsonb(a) order by to_jsonb(a)::text collate "C"),'[]'::jsonb)
               from public.complex_name_alias a),
    'map',(select coalesce(jsonb_agg(to_jsonb(m) order by m.complex_id),'[]'::jsonb)
           from public.koaptix_complex_region_map m),
    'market',(select coalesce(jsonb_agg(to_jsonb(m) order by m.complex_id),'[]'::jsonb)
              from public.apt_market_cap_snapshot m where m.snapshot_date=p_d),
    'eligibility',(select coalesce(jsonb_agg(to_jsonb(e) order by e.complex_id),'[]'::jsonb)
                   from public.complex_eligibility_snapshot e where e.snapshot_date=p_d),
    'active_master',(select coalesce(jsonb_agg(to_jsonb(a) order by a.complex_id),'[]'::jsonb)
                     from public.apt_complex a),
    'regions',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),'[]'::jsonb)
               from public.region_dim r),
    'membership',(select coalesce(jsonb_agg(to_jsonb(m) order by to_jsonb(m)::text collate "C"),'[]'::jsonb)
                  from public.v_koaptix_universe_membership_u m),
    'membership_authority',(select coalesce(jsonb_agg(to_jsonb(m) order by to_jsonb(m)::text collate "C"),'[]'::jsonb)
                            from public.v_koaptix_rank_membership_authority_u m),
    'prior_history',(select coalesce(jsonb_agg(to_jsonb(h) order by h.complex_id),'[]'::jsonb)
                     from public.complex_rank_history h where h.snapshot_date=(
                       select max(snapshot_date) from public.complex_rank_history where snapshot_date<p_d)),
    'prior_snapshots',(select coalesce(jsonb_agg(to_jsonb(s) order by s.universe_code collate "C",s.complex_id),'[]'::jsonb)
                       from public.koaptix_rank_snapshot s
                       join (
                         select x.universe_code,max(x.snapshot_date) as snapshot_date
                         from public.koaptix_rank_snapshot x
                         where x.snapshot_date<p_d
                         group by x.universe_code
                       ) latest on latest.universe_code=s.universe_code
                               and latest.snapshot_date=s.snapshot_date),
    'index_dependencies',(select coalesce(jsonb_agg(to_jsonb(i) order by i.universe_code collate "C",i.snapshot_date,i.index_code),'[]'::jsonb)
                          from public.koaptix_index_snapshot i where
                           i.snapshot_date=(select min(x.snapshot_date) from public.koaptix_index_snapshot x where x.universe_code=i.universe_code)
                           or i.snapshot_date=(select max(x.snapshot_date) from public.koaptix_index_snapshot x
                                                where x.universe_code=i.universe_code and x.snapshot_date<p_d))
  );
  -- Full source inventory through this business date, with all source fields.
  -- Official outputs/index are not input-ingestion identity. They remain
  -- separately frozen and checked by P/Projection/D.
  return v_result||jsonb_build_object('source_inventory',
    (v_result-array['prior_history','prior_snapshots','index_dependencies'])||jsonb_build_object(
      'staging',(select coalesce(jsonb_agg(to_jsonb(t) order by t.run_date,t.id),'[]'::jsonb)
                  from public.staging_market_raw t where t.run_date<=p_d),
      'market',(select coalesce(jsonb_agg(to_jsonb(t) order by t.snapshot_date,t.complex_id),'[]'::jsonb)
                 from public.apt_market_cap_snapshot t where t.snapshot_date<=p_d),
      'eligibility',(select coalesce(jsonb_agg(to_jsonb(t) order by t.snapshot_date,t.complex_id),'[]'::jsonb)
                      from public.complex_eligibility_snapshot t where t.snapshot_date<=p_d)));
end;
$body$;

create function koaptix_s1.preview_patch(p_inputs jsonb,p_d date,p_clock timestamptz)
returns jsonb language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_matches jsonb; v_stage jsonb; v_history jsonb; v_maps jsonb; v_ids bigint[]; v_conflicts boolean;
begin
  v_matches:=koaptix_s1.match_rows(p_inputs->'staging',p_inputs->'master',p_inputs->'aliases',p_d);
  if exists(select from jsonb_array_elements(v_matches) r group by r->>'id' having count(*)<>1)
  then raise exception 'BLOCK_CONFLICT: unordered distinct best matches'; end if;
  with before_rows as (
    select * from jsonb_populate_recordset(null::public.staging_market_raw,p_inputs->'staging')
  ), matches as (
    select * from jsonb_to_recordset(v_matches) b(id uuid,complex_id bigint,apt_name_ko text,
      sigungu_name text,legal_dong_name text,household_count integer,total_household_count integer,
      build_year integer,approval_year integer,building_count integer,parking_count integer,recovery_52w numeric)
  )
  select coalesce(jsonb_agg(case when b.id is null then to_jsonb(s) else
    to_jsonb(s)||jsonb_build_object(
      'complex_id',b.complex_id,'apt_name_ko',coalesce(s.apt_name_ko,b.apt_name_ko),
      'sigungu_name',coalesce(s.sigungu_name,b.sigungu_name),'legal_dong_name',coalesce(s.legal_dong_name,b.legal_dong_name),
      'household_count',coalesce(s.household_count,b.total_household_count,b.household_count),
      'build_year',coalesce(s.build_year,b.build_year),'approval_year',coalesce(s.approval_year,b.approval_year),
      'building_count',coalesce(s.building_count,b.building_count),'parking_count',coalesce(s.parking_count,b.parking_count),
      'recovery_52w',coalesce(s.recovery_52w,b.recovery_52w),
      'market_cap_krw',case when s.deal_amount_krw is not null and coalesce(s.household_count,b.total_household_count,b.household_count,0)>0
          then (s.deal_amount_krw*coalesce(s.household_count,b.total_household_count,b.household_count))::numeric(20,0)
          else s.market_cap_krw end,'universe_code','KOREA_ALL') end order by s.id),'[]'::jsonb)
    into v_stage from before_rows s left join matches b using(id);
  select coalesce(array_agg(distinct (s->>'complex_id')::bigint order by (s->>'complex_id')::bigint),array[]::bigint[])
    into v_ids from jsonb_array_elements(v_stage) s where s->>'complex_id' is not null;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_history
    from public.staging_market_raw s where s.complex_id=any(v_ids) and s.run_date is distinct from p_d;
  -- Full raw history used for dominance is retained in the immutable patch.
  with target as (select * from jsonb_populate_recordset(null::public.staging_market_raw,v_stage)),
  history as (select * from jsonb_populate_recordset(null::public.staging_market_raw,v_history)
              union all select * from target),
  newest as (
    select s.*,dense_rank() over(partition by complex_id order by trade_date desc nulls last,ingested_at desc) priority
    from target s where complex_id is not null and (lawd_cd is not null or sigungu_name is not null or umd_nm is not null)
  ), newest_values as (
    select distinct complex_id,lawd_cd,coalesce(sgg_cd,left(lawd_cd,5)) sgg_cd,umd_cd,
      coalesce(umd_nm,legal_dong_name) umd_nm,sigungu_name,coalesce(source_dataset,'molit-apt-trade-detail') source_dataset
    from newest where priority=1
  ), grouped as (
    select complex_id,lawd_cd,coalesce(sgg_cd,left(lawd_cd,5)) sgg_cd,umd_cd,
      max(sigungu_name) filter(where sigungu_name is not null and btrim(sigungu_name)<>'') sigungu_name,
      max(coalesce(umd_nm,legal_dong_name)) filter(where coalesce(umd_nm,legal_dong_name) is not null
        and btrim(coalesce(umd_nm,legal_dong_name))<>'') umd_nm,
      count(*)::integer source_row_count,min(trade_date) first_seen_trade_date,max(trade_date) last_seen_trade_date
    from history where complex_id=any(v_ids) and lawd_cd is not null group by 1,2,3,4
  ), dominant as (
    select g.*,dense_rank() over(partition by complex_id order by source_row_count desc,last_seen_trade_date desc nulls last,lawd_cd) priority
    from grouped g
  ), chosen as (select * from dominant where priority=1),
  before_map as (select * from jsonb_populate_recordset(null::public.koaptix_complex_region_map,p_inputs->'map')),
  merge_map as (
    select i.complex_id, m.complex_id is not null existed,
      coalesce(n.lawd_cd,m.lawd_cd) lawd_cd,coalesce(n.sgg_cd,m.sgg_cd) sgg_cd,
      coalesce(n.umd_cd,m.umd_cd) umd_cd,coalesce(n.umd_nm,m.umd_nm) umd_nm,
      coalesce(n.sigungu_name,m.sigungu_name) sigungu_name,
      case when n.complex_id is not null then n.source_dataset else m.source_dataset end source_dataset,
      coalesce(m.first_seen_at,p_clock) first_seen_at,
      case when n.complex_id is not null or m.complex_id is null then p_clock else m.last_seen_at end last_seen_at,
      case when n.complex_id is not null and m.complex_id is not null then m.observation_count+1 else coalesce(m.observation_count,1) end observation_count,
      m.source_row_count,m.first_seen_trade_date,m.last_seen_trade_date,
      case when n.complex_id is not null or m.complex_id is null then p_clock else m.updated_at end updated_at,
      n.complex_id is not null merged
    from unnest(v_ids) i(complex_id) left join before_map m using(complex_id) left join newest_values n using(complex_id)
  ), after_map as (
    select m.complex_id,coalesce(c.lawd_cd,m.lawd_cd) lawd_cd,coalesce(c.sgg_cd,m.sgg_cd) sgg_cd,
      coalesce(c.umd_cd,m.umd_cd) umd_cd,coalesce(c.umd_nm,m.umd_nm) umd_nm,
      coalesce(c.sigungu_name,m.sigungu_name) sigungu_name,m.source_dataset,m.first_seen_at,m.last_seen_at,m.observation_count,
      case when c.complex_id is null then m.source_row_count else greatest(coalesce(m.source_row_count,0),coalesce(c.source_row_count,0)) end source_row_count,
      case when c.complex_id is null then m.first_seen_trade_date else least(coalesce(m.first_seen_trade_date,c.first_seen_trade_date),c.first_seen_trade_date) end first_seen_trade_date,
      case when c.complex_id is null then m.last_seen_trade_date else greatest(coalesce(m.last_seen_trade_date,c.last_seen_trade_date),c.last_seen_trade_date) end last_seen_trade_date,
      case when c.complex_id is not null then p_clock else m.updated_at end updated_at
    from merge_map m left join chosen c using(complex_id) where m.existed or m.merged or c.complex_id is not null
  )
  select coalesce((select jsonb_agg(to_jsonb(m) order by m.complex_id) from after_map m),'[]'::jsonb),
    exists(select from newest_values group by complex_id having count(*)>1)
    or exists(select from chosen group by complex_id having count(*)>1)
    into v_maps,v_conflicts;
  if v_conflicts then raise exception 'BLOCK_CONFLICT: unordered geography tie'; end if;
  return jsonb_build_object('affected_complex_ids',to_jsonb(v_ids),'staging_after',v_stage,
    'map_before',(select coalesce(jsonb_agg(m order by (m->>'complex_id')::bigint),'[]'::jsonb)
                   from jsonb_array_elements(p_inputs->'map') m where (m->>'complex_id')::bigint=any(v_ids)),
    'map_after',v_maps,'historical_observations',v_history);
end;
$body$;

create function koaptix_s1.rows_digest(p_rows jsonb,p_keys text[],p_numeric_text text[])
returns text language plpgsql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_material text; v_row jsonb; v_values jsonb; v_key text;
begin
  v_material:=koaptix_s1.canonical(to_jsonb(p_keys))||chr(10);
  for v_row in select value from jsonb_array_elements(p_rows)
    order by value->>'snapshot_date',value->>'universe_code' collate "C",(value->>'rank_all')::bigint,(value->>'complex_id')::bigint
  loop
    if not (v_row ?& p_keys) then raise exception 'BLOCK_PARTIAL: missing digest field'; end if;
    v_values:='[]'::jsonb;
    foreach v_key in array p_keys loop
      v_values:=v_values||jsonb_build_array(case when v_key=any(p_numeric_text) then to_jsonb(v_row->>v_key) else v_row->v_key end);
    end loop;
    v_material:=v_material||koaptix_s1.canonical(v_values)||chr(10);
  end loop;
  return upper(encode(sha256(convert_to(v_material,'UTF8')),'hex'));
end;
$body$;

create function koaptix_s1.component_material(p_component jsonb) returns jsonb
language sql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
 select p_component-array['previous_snapshot_date','component_manifest_sha256'];
$body$;

create function koaptix_s1.preparation(p_plan text) returns jsonb
language sql stable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
 select payload from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PREPARATION';
$body$;

create function koaptix_s1.completion(p_plan text,p_phase text) returns jsonb
language sql stable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
 select payload from koaptix_s1.phase_record where plan_id=p_plan and phase=p_phase and record_kind='COMPLETE' and ordinal=0;
$body$;

create function koaptix_s1.current_head() returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object('D',coalesce(g.affected_rank_date,s.snapshot_date),
   'active_event_id',p.active_event_id,'active_generation_id',p.active_generation_id,
   'previous_generation_id',p.previous_generation_id,'publication_version',p.publication_version,
   'published_at',koaptix_s1.utc(p.published_at))
 from public.koaptix_latest_board_publication p
 join public.koaptix_latest_board_generation g on g.generation_id=p.active_generation_id
 join public.koaptix_latest_board_generation_surface s on s.generation_id=g.generation_id and s.surface_code='GLOBAL_LATEST'
 where p.singleton_id;
$body$;

create function koaptix_s1.lock_plan(p_plan text) returns jsonb
language plpgsql volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v jsonb;
begin
  perform koaptix_s1.require_serializable();
  select payload into strict v from koaptix_s1.plan_segment
    where plan_id=p_plan and segment_kind='PREPARATION' for update nowait;
  if v->>'contract_sha'<>'74EC0431ECD2FEE2D50AA6DC93D9464AC074EDD7DF2C5213CA0605D479BE3050'
     or v->>'plan_id'<>p_plan then raise exception 'BLOCK_CONFLICT: plan identity'; end if;
  return v;
end;
$body$;

create function koaptix_s1.phase_identity(p_plan text,p_phase text) returns text
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; s text; m text; f text; c text;
begin
  p:=koaptix_s1.preparation(p_plan);
  select payload,segment_sha into q,s from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  if p is null then raise exception 'BLOCK_PARTIAL: missing plan'; end if;
  c:=p->>'contract_sha'; m:=q->>'manifest_semantic_sha';
  if p_phase like 'R_%' then
    return koaptix_s1.digest(jsonb_build_array(c,p_plan,p_phase,koaptix_s1.phase_identity(p_plan,substring(p_phase from 3))));
  end if;
  if p_phase='W_START' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,p_phase,2)); end if;
  if p_phase='P' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'P',p->>'preparation_input_sha',p->>'preparation_policy_version')); end if;
  if p_phase='S' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'S',s,m)); end if;
  if p_phase='V' and q is null then
    return koaptix_s1.digest(jsonb_build_array(c,p_plan,'V',p#>>'{predecessor,active_generation_id}',
      null,koaptix_s1.digest(koaptix_s1.reference_material(p_plan)),p->>'verification_policy_version'));
  end if;
  f:=koaptix_s1.generation_fingerprint(p_plan);
  if p_phase='A' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'A',s,m,f)); end if;
  if p_phase='V' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'V',p->>'G',m,f,p->>'verification_policy_version')); end if;
  if p_phase='B' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'B',s,p->>'event_id',p->'predecessor',f)); end if;
  if p_phase='D' then return koaptix_s1.digest(jsonb_build_array(c,p_plan,'D',p->>'event_id',
      (p#>>'{predecessor,publication_version}')::bigint+1,p->>'G',p->>'derivation_policy_version',
      koaptix_s1.digest(p#>'{inputs,index_dependencies}'))); end if;
  raise exception 'unknown S1 phase';
end;
$body$;

create function koaptix_s1.finish_phase(p_plan text,p_phase text,p_payload jsonb) returns jsonb
language plpgsql volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
begin
  insert into koaptix_s1.phase_record(plan_id,phase,record_kind,ordinal,phase_identity,actor,payload)
    values(p_plan,p_phase,'COMPLETE',0,koaptix_s1.phase_identity(p_plan,p_phase),session_user,p_payload);
  return p_payload;
end;
$body$;

create function koaptix_s1.require_admission(p_plan text,p_phase text,p_ordinal smallint) returns jsonb
language plpgsql volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb;
begin
  p:=koaptix_s1.lock_plan(p_plan);
  if clock_timestamp()>=(p->>'admission_deadline')::timestamptz then raise exception 'BLOCK_EXPIRED'; end if;
  if p_ordinal not in (1,2) or not exists(select from koaptix_s1.phase_record r
    where r.plan_id=p_plan and r.phase=p_phase and r.record_kind='ADMIT' and r.ordinal=p_ordinal
      and r.actor=session_user and r.phase_identity=koaptix_s1.phase_identity(p_plan,p_phase))
  then raise exception 'BLOCK_BUDGET: no exact durable phase admission'; end if;
  return p;
end;
$body$;

create function koaptix_s1.manifest_semantics(p_actual jsonb,p_run text,p_manual boolean) returns jsonb
language plpgsql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v jsonb; k text;
begin
  v:=jsonb_build_object('snapshot_date',p_actual->>'snapshot_date','run_id',p_run,'scope_code','KOREA_FULL',
    'authority_status','SEALED','market_cap_snapshot_date',p_actual->>'snapshot_date',
    'eligibility_snapshot_date',p_actual->>'snapshot_date','canonical_query_version','canonical-rank-input-v1',
    'membership_contract_version','membership-map-first-45-52-v1','authority_contract_version','rank-input-v1',
    'manual_override_allowed',p_manual);
  foreach k in array array['market_cap_rows','eligibility_rows','join_rows','qualified_rows','jeonbuk_membership_rows',
    'sgg_52111_membership_rows','sgg_52111_qualified_rows'] loop
    v:=v||jsonb_build_object('expected_'||k,p_actual->k);
  end loop;
  foreach k in array array['market_cap_source_ids','eligibility_source_ids','membership_source_ids',
    'membership_duplicate_pairs','membership_fail_closed_qualified_rows','affected_universe_codes','affected_universe_manifest',
    'market_cap_calculation_versions','eligibility_rule_versions','blocking_review_rule_version','blocking_review_rows',
    'blocking_review_sha256','market_cap_set_sha256','eligibility_set_sha256','source_set_sha256',
    'selected_input_sha256','membership_set_sha256','affected_universe_set_sha256'] loop
    v:=v||jsonb_build_object(k,p_actual->k);
  end loop;
  return v;
end;
$body$;

-- This fixed internal assembly reads only saved P output. No client may submit
-- a substitute packet. W and independent V also execute the accepted C03 pure
-- assembler over that exact saved result and compare all arrays and digests.
create function koaptix_s1.assemble(p_raw jsonb) returns jsonb
language plpgsql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_codes jsonb; v_universes jsonb; v_vector jsonb; v_components jsonb;
  v_global jsonb; v_service jsonb; v_combined jsonb;
begin
  if jsonb_typeof(p_raw->'global_rows') is distinct from 'array'
     or jsonb_typeof(p_raw->'service_rows') is distinct from 'array'
     or jsonb_array_length(p_raw->'global_rows')=0 or jsonb_array_length(p_raw->'service_rows')=0
  then raise exception 'BLOCK_PARTIAL: empty Projection'; end if;
  if exists(select from jsonb_array_elements(p_raw->'service_rows') r
      group by r->>'universe_code',r->>'complex_id' having count(*)<>1)
     or exists(select from jsonb_array_elements(p_raw->'global_rows') r group by r->>'complex_id' having count(*)<>1)
     or exists(select from jsonb_array_elements((p_raw->'global_rows')||(p_raw->'service_rows')) r
       where r->>'tier_code' is not null or r->>'tier_label' is not null or r->>'tier_sort' is not null
       or r->>'recovery_52w' is not null or r->>'snapshot_date' is distinct from p_raw->>'target_rank_date')
  then raise exception 'BLOCK_CONFLICT: Projection keys or closed field policy'; end if;
  with groups as (
    select r->>'universe_code' code,jsonb_agg(r order by (r->>'rank_all')::bigint,(r->>'complex_id')::bigint) rows,
      count(*) n,min(r->>'source_previous_snapshot_date') previous_date
    from jsonb_array_elements(p_raw->'service_rows') r group by r->>'universe_code'
  ) select jsonb_agg(code order by code collate "C"),
    jsonb_agg(jsonb_build_object('universe_code',code,'snapshot_date',p_raw->>'target_rank_date',
      'previous_snapshot_date',previous_date,'expected_row_count',n,
      'row_digest_sha256',koaptix_s1.rows_digest(rows,array['snapshot_date','universe_code','universe_name','universe_scope','complex_id','apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count','total_household_count','recovery_52w','rank_all','previous_rank_all','rank_delta_w','rank_movement','market_cap_krw','market_cap_trillion_krw','market_cap_share','market_cap_share_pct','tier_code','tier_label','tier_sort','is_top1000']::text[],array['market_cap_share','market_cap_share_pct','market_cap_trillion_krw']::text[])) order by code collate "C"),
    jsonb_agg(jsonb_build_object('max_rank',n,'min_rank',1,'previous_date',previous_date,'row_count',n,
      'snapshot_date',p_raw->>'target_rank_date','universe_code',code) order by code collate "C")
    into v_codes,v_universes,v_vector from groups;
  if v_codes is distinct from p_raw#>'{input_authority,affected_universe_codes}'
     or not (v_codes ? 'KOREA_ALL') then raise exception 'BLOCK_CONFLICT: affected set'; end if;
  v_global:=jsonb_build_object('surface_code','GLOBAL_LATEST','snapshot_date',p_raw->>'target_rank_date',
    'previous_snapshot_date',p_raw->>'global_previous_snapshot_date','date_vector_sha256',null,'universe_count',1,
    'row_count',jsonb_array_length(p_raw->'global_rows'),
    'full_row_digest_sha256',koaptix_s1.rows_digest(p_raw->'global_rows',array['snapshot_date','universe_code','complex_id','apt_name_ko','address_road','address_jibun','legal_dong_name','build_year','sigungu_code','sigungu_name','rank_all','tier_code','tier_label','tier_sort','market_cap_krw','market_cap_trillion_krw','market_cap_share','market_cap_share_pct','previous_rank_all','rank_delta_1d','rank_movement','is_top1000','total_household_count','household_count','priced_household_count','priced_household_ratio','total_cluster_count','priced_cluster_count','coverage_status','is_rank_eligible','eligibility_status','latitude','longitude','recovery_52w']::text[],array['latitude','longitude','market_cap_share','market_cap_share_pct','market_cap_trillion_krw','priced_household_ratio']::text[]));
  v_service:=jsonb_build_object('surface_code','UNIVERSE_SERVICE','snapshot_date',null,'previous_snapshot_date',null,
    'date_vector_sha256',koaptix_s1.digest(v_vector),'universe_count',jsonb_array_length(v_codes),
    'row_count',jsonb_array_length(p_raw->'service_rows'),
    'full_row_digest_sha256',koaptix_s1.rows_digest(p_raw->'service_rows',array['snapshot_date','universe_code','universe_name','universe_scope','complex_id','apt_name_ko','sigungu_name','legal_dong_name','build_year','household_count','total_household_count','recovery_52w','rank_all','previous_rank_all','rank_delta_w','rank_movement','market_cap_krw','market_cap_trillion_krw','market_cap_share','market_cap_share_pct','tier_code','tier_label','tier_sort','is_top1000']::text[],array['market_cap_share','market_cap_share_pct','market_cap_trillion_krw']::text[]));
  v_combined:=jsonb_build_array(koaptix_s1.component_material(v_global),koaptix_s1.component_material(v_service));
  v_components:=jsonb_build_array(
    v_global||jsonb_build_object('component_manifest_sha256',koaptix_s1.digest(koaptix_s1.component_material(v_global))),
    v_service||jsonb_build_object('component_manifest_sha256',koaptix_s1.digest(koaptix_s1.component_material(v_service))));
  return jsonb_build_object('affected_universe_codes',v_codes,'surface_components',v_components,
    'service_universes',v_universes,'service_rows',p_raw->'service_rows','global_rows',p_raw->'global_rows',
    'history_stage_rows',p_raw->'history_stage_rows','snapshot_stage_rows',p_raw->'snapshot_stage_rows',
    'combined_surface_manifest_sha256',koaptix_s1.digest(v_combined));
end;
$body$;

create function koaptix_s1.admit_phase(p_plan text,p_phase text) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_done jsonb; v_raw jsonb; v_data jsonb; v_manifest jsonb; v_packet jsonb;
  v_parent_sha text; v_ordinal smallint; v_kind text;
begin
  perform koaptix_s1.require_actor('BOTH'); p:=koaptix_s1.lock_plan(p_plan);
  if not ((session_user='koaptix_publication_writer' and p_phase in ('W_START','P','S','A','B','D'))
    or (session_user='koaptix_publication_verifier' and p_phase in ('V','R_P','R_S','R_A','R_B','R_D')))
  then raise exception 'S1 principal/phase denied'; end if;
  v_kind:=case when p_phase='V' then 'VERDICT' else 'COMPLETE' end;
  select payload into v_done from koaptix_s1.phase_record
    where plan_id=p_plan and phase=p_phase and record_kind=v_kind and ordinal=0;
  if v_done is not null then return jsonb_build_object('plan_id',p_plan,'phase',p_phase,'ordinal',0,'existing',v_done); end if;
  if p_phase not like 'R_%' and clock_timestamp()>=(p->>'admission_deadline')::timestamptz then raise exception 'BLOCK_EXPIRED'; end if;
  if p_phase in ('P','S','A','B','D') and exists(select from koaptix_s1.phase_record
    where plan_id=p_plan and phase='V' and record_kind='VERDICT' and payload->>'mode'='REFERENCE')
  then raise exception 'BLOCK_VERIFICATION: reference occurrence has no new publication phases'; end if;
  if p_phase='S' then
    v_done:=koaptix_s1.completion(p_plan,'P');
    if v_done is null then raise exception 'BLOCK_PARTIAL: P not complete'; end if;
    v_raw:=v_done->'projection';
    if jsonb_typeof(v_raw) is distinct from 'object' then raise exception 'BLOCK_VERIFICATION: reference proof required'; end if;
    v_data:=koaptix_s1.assemble(v_raw);
    v_manifest:=koaptix_s1.manifest_semantics(v_raw->'input_authority',p->>'manifest_run_id',(p->>'manual_override_allowed')::boolean);
    v_packet:=v_data||jsonb_build_object('generation_id',p->>'G','execution_run_id',p->>'A_run_id','plan_run_id',p_plan,
      'required_surface_codes',jsonb_build_array('GLOBAL_LATEST','UNIVERSE_SERVICE'),
      'input_manifest_run_id',p->>'manifest_run_id','target_rank_date',p->>'D',
      'expected_active_generation_id',p#>>'{predecessor,active_generation_id}',
      'expected_publication_version',(p#>>'{predecessor,publication_version}')::bigint,
      'generated_at',p->>'generated_at','verified_at',p->>'verified_at',
      'market_cap_set_sha256',v_manifest->>'market_cap_set_sha256','eligibility_set_sha256',v_manifest->>'eligibility_set_sha256',
      'source_set_sha256',v_manifest->>'source_set_sha256','selected_input_sha256',v_manifest->>'selected_input_sha256',
      'membership_set_sha256',v_manifest->>'membership_set_sha256','affected_universe_set_sha256',v_manifest->>'affected_universe_set_sha256');
    select segment_sha into strict v_parent_sha from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PREPARATION';
    q:=jsonb_build_object('preparation_segment_sha',v_parent_sha,'P_complete_sha',koaptix_s1.digest(v_done),
      'projection',v_raw,'projection_sha',koaptix_s1.digest(v_raw),'data',v_data,'manifest_semantics',v_manifest,
      'manifest_semantic_sha',koaptix_s1.digest(v_manifest),'packet',v_packet,
      'candidate_generation_payload_sha',koaptix_s1.digest(v_packet),
      'build_key',koaptix_s1.digest(jsonb_build_array(p_plan,koaptix_s1.digest(v_manifest),v_packet-'generation_id')),
      'required_universes',v_data->'affected_universe_codes');
    if exists(select from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION' and payload is distinct from q)
    then raise exception 'BLOCK_CONFLICT: immutable PUBLICATION differs'; end if;
    if not exists(select from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION') then
      insert into koaptix_s1.plan_segment(publication_track,d,segment_kind,plan_id,preparation_segment_sha,segment_sha,payload)
        values('KOAPTIX_OFFICIAL_DAILY',(p->>'D')::date,'PUBLICATION',p_plan,v_parent_sha,koaptix_s1.digest(q),q);
    end if;
  elsif p_phase in ('A','B','D') and koaptix_s1.completion(p_plan,case p_phase when 'A' then 'S' when 'B' then 'A' else 'B' end) is null
  then raise exception 'BLOCK_PARTIAL: upstream phase missing'; end if;
  select coalesce(max(ordinal),0)+1 into v_ordinal from koaptix_s1.phase_record
    where plan_id=p_plan and phase=p_phase and record_kind='ADMIT';
  if v_ordinal>2 then raise exception 'BLOCK_BUDGET'; end if;
  insert into koaptix_s1.phase_record(plan_id,phase,record_kind,ordinal,phase_identity,actor,payload)
    values(p_plan,p_phase,'ADMIT',v_ordinal,koaptix_s1.phase_identity(p_plan,p_phase),session_user,
      jsonb_build_object('contract_sha',p->>'contract_sha','original_ack','UNOBSERVED'));
  return jsonb_build_object('plan_id',p_plan,'phase',p_phase,'ordinal',v_ordinal,'phase_identity',koaptix_s1.phase_identity(p_plan,p_phase),
    'admission_deadline',p->>'admission_deadline');
end;
$body$;

create function koaptix_s1.admit_due_occurrence() returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_policy koaptix_s1.policy%rowtype; v_tick timestamptz; v_d date; v_plan text; p jsonb;
  v_inputs jsonb; v_patch jsonb; v_head jsonb; v_clock timestamptz; v_created boolean:=false; v_admit jsonb;
begin
  perform koaptix_s1.require_actor('W'); perform koaptix_s1.require_serializable();
  select * into strict v_policy from koaptix_s1.policy where singleton for update nowait;
  v_clock:=clock_timestamp(); v_tick:=date_trunc('day',v_clock)+interval '15 hours 5 minutes';
  if v_clock<v_tick or v_clock>=v_tick+interval '300 seconds' or v_tick<v_policy.first_scheduled_tick
    then return jsonb_build_object('result','BLOCK_EXPIRED'); end if;
  v_d:=(v_tick at time zone 'Asia/Seoul')::date-1;
  v_plan:=koaptix_s1.digest(jsonb_build_array(v_policy.contract_sha,'KOAPTIX_OFFICIAL_DAILY',v_d::text,koaptix_s1.utc(v_tick)));
  p:=koaptix_s1.preparation(v_plan);
  if p is null then
    v_head:=koaptix_s1.current_head();
    if v_d<=v_policy.activation_boundary or v_head is null or v_d<=(v_head->>'D')::date
       or v_d<=(select max(snapshot_date) from public.complex_rank_history)
    then raise exception 'BLOCK_PREDECESSOR: new occurrence date'; end if;
    v_inputs:=koaptix_s1.capture_inputs(v_d); v_patch:=koaptix_s1.preview_patch(v_inputs,v_d,v_clock);
    p:=jsonb_build_object('plan_version','S1_FROZEN_PLAN_V1','contract_sha',v_policy.contract_sha,'plan_id',v_plan,
      'publication_track','KOAPTIX_OFFICIAL_DAILY','D',v_d,'scheduled_tick_utc',koaptix_s1.utc(v_tick),
      'as_of_date',v_d,'projection_identity',v_policy.projection_identity,
      'preparation_policy_version','S1_AFFECTED_PREPARATION_V1','verification_policy_version','S1_FULL_GENERATION_V1',
      'derivation_policy_version','S1_DERIVED_INDEX_V1','calculation_version','v1',
      'G',gen_random_uuid(),'event_id',gen_random_uuid(),'summary_id',gen_random_uuid(),
      'manifest_run_id','S1:'||v_plan||':S','A_run_id','S1:'||v_plan||':A','B_run_id','S1:'||v_plan||':B',
      'generated_at',koaptix_s1.utc(v_clock),'verified_at',koaptix_s1.utc(v_clock),
      'stage_created_at',koaptix_s1.utc(v_clock),'event_recorded_at',koaptix_s1.utc(v_clock),
      'predecessor',v_head,'inputs',v_inputs,'patch',v_patch,
      'preparation_input_sha',koaptix_s1.digest(jsonb_build_object('inputs',v_inputs,'patch',v_patch)),
      'manual_override_allowed',v_policy.manual_override_allowed,
      'max_phase_invocations',2,'max_W_starts',2,'admission_deadline',koaptix_s1.utc(v_tick+interval '300 seconds'));
    insert into koaptix_s1.plan_segment(publication_track,d,segment_kind,plan_id,segment_sha,payload)
      values('KOAPTIX_OFFICIAL_DAILY',v_d,'PREPARATION',v_plan,koaptix_s1.digest(p),p);
    v_created:=true;
  end if;
  if koaptix_s1.completion(v_plan,'D') is not null or exists(select from koaptix_s1.phase_record
    where plan_id=v_plan and phase='V' and record_kind='VERDICT' and payload->>'mode'='REFERENCE' and payload->>'verdict'='PASS') then
    return jsonb_build_object('plan_id',v_plan,'result','NOOP_ALREADY_COMPLETE'); end if;
  perform koaptix_s1.admit_phase(v_plan,'W_START');
  if v_created then v_admit:=koaptix_s1.admit_phase(v_plan,'P'); end if;
  return jsonb_build_object('plan_id',v_plan,'preparation',p,'new_plan',v_created,'P_admission',v_admit);
end;
$body$;

create function koaptix_s1.prepare(p_plan text,p_ordinal smallint) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; v_done jsonb; v_now jsonb; v_patch jsonb; v_projection jsonb; v_after jsonb; v_inventory jsonb;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan);
  v_done:=koaptix_s1.completion(p_plan,'P');
  if v_done is not null then
    if v_done->'patch' is distinct from p->'patch' or v_done->>'preparation_input_sha' is distinct from p->>'preparation_input_sha'
       or koaptix_s1.digest(v_done->'projection') is distinct from v_done->>'projection_sha'
       or jsonb_typeof(v_done->'source_inventory') is distinct from 'object'
       or koaptix_s1.digest(v_done->'source_inventory') is distinct from v_done->>'source_inventory_sha'
    then raise exception 'BLOCK_PARTIAL: P completion'; end if;
    return v_done;
  end if;
  perform koaptix_s1.require_admission(p_plan,'P',p_ordinal);
  v_now:=koaptix_s1.capture_inputs((p->>'D')::date);
  if v_now is distinct from p->'inputs' or koaptix_s1.digest(v_now) is distinct from koaptix_s1.digest(p->'inputs')
  then raise exception 'BLOCK_CONFLICT: frozen input changed'; end if;
  v_patch:=koaptix_s1.preview_patch(v_now,(p->>'D')::date,(p->>'generated_at')::timestamptz);
  if v_patch is distinct from p->'patch' or koaptix_s1.digest(v_patch) is distinct from koaptix_s1.digest(p->'patch')
  then raise exception 'BLOCK_CONFLICT: frozen patch/history changed'; end if;
  update public.staging_market_raw s set complex_id=n.complex_id,apt_name_ko=n.apt_name_ko,sigungu_name=n.sigungu_name,
    legal_dong_name=n.legal_dong_name,household_count=n.household_count,build_year=n.build_year,approval_year=n.approval_year,
    building_count=n.building_count,parking_count=n.parking_count,recovery_52w=n.recovery_52w,
    market_cap_krw=n.market_cap_krw,universe_code=n.universe_code
  from jsonb_populate_recordset(null::public.staging_market_raw,v_patch->'staging_after') n
  where s.id=n.id and s.run_date=(p->>'D')::date;
  update public.koaptix_complex_region_map m set lawd_cd=n.lawd_cd,sgg_cd=n.sgg_cd,umd_cd=n.umd_cd,
    umd_nm=n.umd_nm,sigungu_name=n.sigungu_name,source_dataset=n.source_dataset,first_seen_at=n.first_seen_at,
    last_seen_at=n.last_seen_at,observation_count=n.observation_count,updated_at=n.updated_at,
    source_row_count=n.source_row_count,first_seen_trade_date=n.first_seen_trade_date,last_seen_trade_date=n.last_seen_trade_date
  from jsonb_populate_recordset(null::public.koaptix_complex_region_map,v_patch->'map_after') n where m.complex_id=n.complex_id;
  insert into public.koaptix_complex_region_map
  select n.* from jsonb_populate_recordset(null::public.koaptix_complex_region_map,v_patch->'map_after') n
  where not exists(select from public.koaptix_complex_region_map m where m.complex_id=n.complex_id);
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_after
    from public.staging_market_raw s where s.run_date=(p->>'D')::date;
  if v_after is distinct from v_patch->'staging_after' then raise exception 'BLOCK_CONFLICT: staging afterimage'; end if;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.complex_id),'[]'::jsonb) into v_after
    from public.koaptix_complex_region_map m where m.complex_id in
      (select (x->>'complex_id')::bigint from jsonb_array_elements(v_patch->'map_after') x);
  if v_after is distinct from v_patch->'map_after' then raise exception 'BLOCK_CONFLICT: map afterimage'; end if;
  v_inventory:=koaptix_s1.capture_inputs((p->>'D')::date)->'source_inventory';
  if jsonb_array_length(p#>'{inputs,market}')=0 and jsonb_array_length(p#>'{inputs,eligibility}')=0 then
    -- Empty current-D input does not fabricate a new Projection. Independent
    -- V must prove full inventory equality with a prior S1 publication.
    v_projection:='null'::jsonb;
  else
    v_projection:=koaptix_s1.capture_projection((p->>'D')::date,(p->>'generated_at')::timestamptz,p->>'A_run_id',(p->>'stage_created_at')::timestamptz);
    if v_projection is null then raise exception 'BLOCK_PARTIAL: Projection capture'; end if;
    perform koaptix_s1.assemble(v_projection);
  end if;
  return koaptix_s1.finish_phase(p_plan,'P',jsonb_build_object('result','PREPARED_FROZEN','patch',v_patch,
    'projection',v_projection,'projection_sha',koaptix_s1.digest(v_projection),'preparation_input_sha',p->>'preparation_input_sha',
    'source_inventory',v_inventory,'source_inventory_sha',koaptix_s1.digest(v_inventory)));
end;
$body$;

create function koaptix_s1.generation_rows(p_g uuid) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object(
'surface_components',(select coalesce(jsonb_agg(jsonb_build_object('surface_code',r.surface_code,'snapshot_date',r.snapshot_date,'previous_snapshot_date',r.previous_snapshot_date,'date_vector_sha256',r.date_vector_sha256,'universe_count',r.universe_count,'row_count',r.row_count,'full_row_digest_sha256',r.full_row_digest_sha256,'component_manifest_sha256',r.component_manifest_sha256) order by r.surface_code),'[]'::jsonb) from public.koaptix_latest_board_generation_surface r where r.generation_id=p_g),
'service_universes',(select coalesce(jsonb_agg(jsonb_build_object('universe_code',r.universe_code,'snapshot_date',r.snapshot_date,'previous_snapshot_date',r.previous_snapshot_date,'expected_row_count',r.expected_row_count,'row_digest_sha256',r.row_digest_sha256) order by r.universe_code collate "C"),'[]'::jsonb) from public.koaptix_latest_board_generation_universe r where r.generation_id=p_g),
'service_rows',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',r.snapshot_date,'universe_code',r.universe_code,'universe_name',r.universe_name,'universe_scope',r.universe_scope,'complex_id',r.complex_id,'apt_name_ko',r.apt_name_ko,'sigungu_name',r.sigungu_name,'legal_dong_name',r.legal_dong_name,'build_year',r.build_year,'household_count',r.household_count,'total_household_count',r.total_household_count,'recovery_52w',r.recovery_52w,'rank_all',r.rank_all,'previous_rank_all',r.previous_rank_all,'rank_delta_w',r.rank_delta_w,'rank_movement',r.rank_movement,'market_cap_krw',r.market_cap_krw,'market_cap_trillion_krw',r.market_cap_trillion_krw,'market_cap_share',r.market_cap_share,'market_cap_share_pct',r.market_cap_share_pct,'tier_code',r.tier_code,'tier_label',r.tier_label,'tier_sort',r.tier_sort,'is_top1000',r.is_top1000,'source_previous_snapshot_date',r.source_previous_snapshot_date,'generated_at',koaptix_s1.utc(r.generated_at),'refresh_run_id',r.refresh_run_id) order by r.universe_code collate "C",r.rank_all,r.complex_id),'[]'::jsonb) from public.koaptix_latest_board_generation_row r where r.generation_id=p_g),
'global_rows',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',r.snapshot_date,'universe_code',r.universe_code,'complex_id',r.complex_id,'apt_name_ko',r.apt_name_ko,'address_road',r.address_road,'address_jibun',r.address_jibun,'legal_dong_name',r.legal_dong_name,'build_year',r.build_year,'sigungu_code',r.sigungu_code,'sigungu_name',r.sigungu_name,'rank_all',r.rank_all,'tier_code',r.tier_code,'tier_label',r.tier_label,'tier_sort',r.tier_sort,'market_cap_krw',r.market_cap_krw,'market_cap_trillion_krw',r.market_cap_trillion_krw,'market_cap_share',r.market_cap_share,'market_cap_share_pct',r.market_cap_share_pct,'previous_rank_all',r.previous_rank_all,'rank_delta_1d',r.rank_delta_1d,'rank_movement',r.rank_movement,'is_top1000',r.is_top1000,'total_household_count',r.total_household_count,'household_count',r.household_count,'priced_household_count',r.priced_household_count,'priced_household_ratio',r.priced_household_ratio,'total_cluster_count',r.total_cluster_count,'priced_cluster_count',r.priced_cluster_count,'coverage_status',r.coverage_status,'is_rank_eligible',r.is_rank_eligible,'eligibility_status',r.eligibility_status,'latitude',r.latitude,'longitude',r.longitude,'recovery_52w',r.recovery_52w) order by r.rank_all,r.complex_id),'[]'::jsonb) from public.koaptix_latest_board_generation_global_row r where r.generation_id=p_g),
'history_stage_rows',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',r.snapshot_date,'complex_id',r.complex_id,'market_cap_krw',r.market_cap_krw,'rank_all',r.rank_all,'total_market_cap',r.total_market_cap) order by r.snapshot_date,r.rank_all,r.complex_id),'[]'::jsonb) from public.koaptix_rank_publication_history_stage r where r.generation_id=p_g),
'snapshot_stage_rows',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',r.snapshot_date,'universe_code',r.universe_code,'complex_id',r.complex_id,'rank_all',r.rank_all,'market_cap_krw',r.market_cap_krw,'market_cap_share',r.market_cap_share,'previous_rank_all',r.previous_rank_all,'rank_delta_1d',r.rank_delta_1d,'is_top1000',r.is_top1000,'rank_method',r.rank_method,'calculation_version',r.calculation_version,'created_at',koaptix_s1.utc(r.created_at)) order by r.snapshot_date,r.universe_code collate "C",r.rank_all,r.complex_id),'[]'::jsonb) from public.koaptix_rank_publication_snapshot_stage r where r.generation_id=p_g),
 'affected_universe_codes',(select to_jsonb(affected_universe_codes) from public.koaptix_latest_board_generation where generation_id=p_g),
 'combined_surface_manifest_sha256',(select combined_surface_manifest_sha256 from public.koaptix_latest_board_generation where generation_id=p_g));
$body$;

create function koaptix_s1.stored_manifest(p_run text) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select to_jsonb(m)||jsonb_build_object('sealed_at',koaptix_s1.utc(m.sealed_at),'created_at',koaptix_s1.utc(m.created_at))
 from public.koaptix_rank_input_authority_manifest m where run_id=p_run;
$body$;

create function koaptix_s1.generation_parent(p_plan text) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object('generation_id',p.payload->>'G','run_id',p.payload->>'A_run_id','plan_run_id',p.plan_id,
   'source_authority_kind','SEALED_RANK_INPUT_MANIFEST','source_authority_key',p.payload->>'manifest_run_id',
   'input_manifest_run_id',p.payload->>'manifest_run_id','affected_rank_date',p.payload->>'D',
   'affected_universe_codes',q.payload#>'{data,affected_universe_codes}',
   'required_surface_codes',jsonb_build_array('GLOBAL_LATEST','UNIVERSE_SERVICE'),'surface_count',2,
   'total_component_row_count',jsonb_array_length(q.payload#>'{data,global_rows}')+jsonb_array_length(q.payload#>'{data,service_rows}'),
   'combined_surface_manifest_sha256',q.payload#>>'{data,combined_surface_manifest_sha256}',
   'generated_at',p.payload->>'generated_at','verified_at',p.payload->>'verified_at')
 from koaptix_s1.plan_segment p join koaptix_s1.plan_segment q using(plan_id)
 where p.plan_id=p_plan and p.segment_kind='PREPARATION' and q.segment_kind='PUBLICATION';
$body$;

create function koaptix_s1.generation_material(p_plan text,p_actual boolean) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; v_parent jsonb; v_data jsonb; v_manifest jsonb;
begin
  p:=koaptix_s1.preparation(p_plan);
  if p_actual then
    select to_jsonb(g)||jsonb_build_object('generated_at',koaptix_s1.utc(g.generated_at),'verified_at',koaptix_s1.utc(g.verified_at))
      into v_parent from public.koaptix_latest_board_generation g where g.generation_id=(p->>'G')::uuid;
    v_data:=koaptix_s1.generation_rows((p->>'G')::uuid);
    v_manifest:=koaptix_s1.stored_manifest(p->>'manifest_run_id');
  else
    v_parent:=koaptix_s1.generation_parent(p_plan);
    select payload->'data' into v_data from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
    v_manifest:=koaptix_s1.completion(p_plan,'S')->'manifest';
  end if;
  return jsonb_build_object('parent',v_parent,'data',v_data,'manifest',v_manifest,
    'contract_sha',p->>'contract_sha','projection_identity',p->>'projection_identity',
    'verification_policy_version',p->>'verification_policy_version','predecessor',p->'predecessor');
end;
$body$;

create function koaptix_s1.generation_fingerprint(p_plan text) returns text
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select koaptix_s1.digest(koaptix_s1.generation_material(p_plan,false));
$body$;

create function koaptix_s1.rows_equal(p_expected jsonb,p_actual jsonb) returns boolean
language sql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_typeof(p_expected)='array' and jsonb_typeof(p_actual)='array'
   and jsonb_array_length(p_expected)=jsonb_array_length(p_actual)
   and not exists(
     (select value from jsonb_array_elements(p_expected) except all select value from jsonb_array_elements(p_actual))
     union all
     (select value from jsonb_array_elements(p_actual) except all select value from jsonb_array_elements(p_expected)));
$body$;

create function koaptix_s1.assert_complete_generation(p_plan text) returns void
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare e jsonb; a jsonb; k text; p jsonb; q jsonb; pc jsonb;
begin
  p:=koaptix_s1.preparation(p_plan); pc:=koaptix_s1.completion(p_plan,'P');
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  if pc is null or q->>'preparation_segment_sha' is distinct from koaptix_s1.digest(p)
    or q->>'P_complete_sha' is distinct from koaptix_s1.digest(pc)
    or q->'projection' is distinct from pc->'projection'
    or q->>'projection_sha' is distinct from koaptix_s1.digest(q->'projection')
    or q->'data' is distinct from koaptix_s1.assemble(q->'projection')
    or q->>'manifest_semantic_sha' is distinct from koaptix_s1.digest(q->'manifest_semantics')
    or q->>'candidate_generation_payload_sha' is distinct from koaptix_s1.digest(q->'packet')
  then raise exception 'BLOCK_CONFLICT: complete P/PUBLICATION lineage'; end if;
  e:=koaptix_s1.generation_material(p_plan,false); a:=koaptix_s1.generation_material(p_plan,true);
  if jsonb_typeof(e->'parent') is distinct from 'object' or jsonb_typeof(e->'manifest') is distinct from 'object'
     or e->'parent' is distinct from a->'parent'
     or e->'manifest' is distinct from a->'manifest'
     or (e->'manifest') - array['sealed_at','created_at'] is distinct from q->'manifest_semantics'
     or e#>'{data,affected_universe_codes}' is distinct from a#>'{data,affected_universe_codes}'
     or e#>'{data,combined_surface_manifest_sha256}' is distinct from a#>'{data,combined_surface_manifest_sha256}'
  then raise exception 'BLOCK_PARTIAL: generation parent/manifest/content'; end if;
  foreach k in array array['surface_components','service_universes','service_rows','global_rows','history_stage_rows','snapshot_stage_rows'] loop
    if koaptix_s1.rows_equal(e#>array['data',k],a#>array['data',k]) is distinct from true
    then raise exception 'BLOCK_PARTIAL: full generation rows %',k; end if;
  end loop;
  if koaptix_s1.digest(e) is distinct from koaptix_s1.digest(a)
  then raise exception 'BLOCK_CONFLICT: full immutable fingerprint'; end if;
end;
$body$;

create function koaptix_s1.seal(p_plan text,p_ordinal smallint) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_expected jsonb; v_stored jsonb; v_done jsonb; v_actual jsonb; v_clock timestamptz;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan);
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  v_expected:=q->'manifest_semantics'; v_stored:=koaptix_s1.stored_manifest(p->>'manifest_run_id');
  v_done:=koaptix_s1.completion(p_plan,'S');
  if v_done is not null or v_stored is not null then
    if v_done is null or v_stored is null or v_done->'manifest' is distinct from v_stored
       or (v_stored-array['sealed_at','created_at']) is distinct from v_expected
       or v_stored->>'sealed_at' is distinct from v_stored->>'created_at'
       or v_stored->>'snapshot_date' is distinct from p->>'D'
    then raise exception 'BLOCK_PARTIAL: exact S manifest/completion'; end if;
    return v_done;
  end if;
  if exists(select from public.koaptix_rank_input_authority_manifest where snapshot_date=(p->>'D')::date and authority_contract_version='rank-input-v1')
  then raise exception 'BLOCK_CONFLICT: natural manifest slot'; end if;
  perform koaptix_s1.require_admission(p_plan,'S',p_ordinal);
  if (p->>'D')::date<=(select max(snapshot_date) from public.complex_rank_history)
  then raise exception 'BLOCK_PREDECESSOR: seal forward date'; end if;
  v_actual:=public.koaptix_compute_rank_input_authority((p->>'D')::date);
  if v_actual is distinct from q#>'{projection,input_authority}'
     or (v_actual->>'market_cap_rows')::bigint<=0
     or (v_actual->>'market_cap_rows')::bigint<>(v_actual->>'eligibility_rows')::bigint
     or (v_actual->>'market_cap_rows')::bigint<>(v_actual->>'join_rows')::bigint
     or (v_actual->>'qualified_rows')::bigint<=0
     or (v_actual->>'market_cap_only_rows')::bigint<>0 or (v_actual->>'eligibility_only_rows')::bigint<>0
     or (v_actual->>'invalid_source_contract_rows')::bigint<>0
     or ((v_actual->>'manual_override_rows')::bigint>0 and not (p->>'manual_override_allowed')::boolean)
  then raise exception 'BLOCK_CONFLICT: same-transaction source authority'; end if;
  v_clock:=transaction_timestamp();
  insert into public.koaptix_rank_input_authority_manifest
    select m.* from jsonb_populate_record(null::public.koaptix_rank_input_authority_manifest,
      v_expected||jsonb_build_object('sealed_at',v_clock,'created_at',v_clock)) m;
  v_stored:=koaptix_s1.stored_manifest(p->>'manifest_run_id');
  return koaptix_s1.finish_phase(p_plan,'S',jsonb_build_object('result','SEALED','manifest',v_stored));
end;
$body$;

create function koaptix_s1.build(p_plan text,p_ordinal smallint) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_packet jsonb; v_done jsonb; v_collisions uuid[]; v_g uuid; v_fp text;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan); v_g:=(p->>'G')::uuid;
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  v_done:=koaptix_s1.completion(p_plan,'A');
  select array_agg(g.generation_id) into v_collisions from public.koaptix_latest_board_generation g
    where g.generation_id=v_g or g.run_id=p->>'A_run_id'
       or (g.source_authority_kind='SEALED_RANK_INPUT_MANIFEST' and g.source_authority_key=p->>'manifest_run_id')
       or g.combined_surface_manifest_sha256=q#>>'{data,combined_surface_manifest_sha256}';
  v_fp:=koaptix_s1.generation_fingerprint(p_plan);
  if v_done is not null or coalesce(cardinality(v_collisions),0)>0 then
    if v_done is null or v_collisions is distinct from array[v_g] or v_done->>'generation_fingerprint' is distinct from v_fp
    then raise exception 'BLOCK_PARTIAL: complete A / unique identities'; end if;
    perform koaptix_s1.assert_complete_generation(p_plan);
    return v_done||jsonb_build_object('lifecycle',case
      when koaptix_s1.current_head()->>'active_generation_id'=p->>'G' then 'PUBLISHED_CURRENT'
      when exists(select from public.koaptix_latest_board_publication_event where to_generation_id=v_g) then 'PUBLISHED_NOT_CURRENT'
      else 'INACTIVE' end);
  end if;
  perform koaptix_s1.require_admission(p_plan,'A',p_ordinal);
  perform 1 from public.koaptix_latest_board_publication where singleton_id for update nowait;
  if koaptix_s1.current_head() is distinct from p->'predecessor'
     or (p->>'D')::date<=(select max(snapshot_date) from public.complex_rank_history)
  then raise exception 'BLOCK_PREDECESSOR'; end if;
  perform public.koaptix_assert_rank_input_authority(p->>'manifest_run_id',(p->>'D')::date,null);
  v_packet:=q->'packet';
  perform public.koaptix_insert_latest_board_generation_packet(v_packet,'SEALED_RANK_INPUT_MANIFEST',
    p->>'manifest_run_id',p->>'manifest_run_id',(p->>'D')::date,
    array(select jsonb_array_elements_text(q#>'{data,affected_universe_codes}')),true);
  perform koaptix_s1.assert_complete_generation(p_plan);
  perform public.koaptix_verify_latest_board_generation(v_g);
  v_done:=koaptix_s1.finish_phase(p_plan,'A',jsonb_build_object('result','COMPLETE_INACTIVE',
    'generation_id',v_g,'generation_fingerprint',v_fp));
  set constraints all immediate;
  return v_done;
end;
$body$;

create function koaptix_s1.observed_identity(p_plan text) returns text
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select koaptix_s1.digest(jsonb_build_array(
   jsonb_build_object('preparation',koaptix_s1.preparation(p_plan),'publication',
     (select payload from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION')),
   koaptix_s1.completion(p_plan,'S'),koaptix_s1.completion(p_plan,'A'),
   koaptix_s1.digest(koaptix_s1.generation_material(p_plan,true))));
$body$;

create function koaptix_s1.record_verification(p_plan text,p_verdict jsonb) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_prior jsonb; v_keys text[]:=array['mode','contract_sha','plan_id','D','G',
  'manifest_run_id','manifest_semantic_sha','projection_identity','generation_fingerprint','verification_policy_version',
  'verifier_session_user','verdict','observed_state_identity','observed_at'];
begin
  perform koaptix_s1.require_actor('V'); p:=koaptix_s1.lock_plan(p_plan);
  select payload into v_prior from koaptix_s1.phase_record where plan_id=p_plan and phase='V' and record_kind='VERDICT';
  if v_prior is not null then
    if (v_prior-'observed_at') is distinct from (p_verdict-'observed_at')
    then raise exception 'BLOCK_VERIFICATION: immutable verdict conflict'; end if;
    return v_prior;
  end if;
  if p_verdict->>'mode'='REFERENCE' then return koaptix_s1.append_reference(p_plan,p_verdict); end if;
  if jsonb_typeof(p_verdict) is distinct from 'object' or not (p_verdict ?& v_keys)
     or p_verdict-v_keys<>'{}'::jsonb then raise exception 'BLOCK_VERIFICATION: exact verdict fields'; end if;
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  if p_verdict->>'mode' is distinct from 'GENERATION'
     or p_verdict->>'contract_sha' is distinct from p->>'contract_sha'
     or p_verdict->>'plan_id' is distinct from p_plan or p_verdict->>'D' is distinct from p->>'D'
     or p_verdict->>'G' is distinct from p->>'G'
     or p_verdict->>'manifest_run_id' is distinct from p->>'manifest_run_id'
     or p_verdict->>'manifest_semantic_sha' is distinct from q->>'manifest_semantic_sha'
     or p_verdict->>'projection_identity' is distinct from p->>'projection_identity'
     or p_verdict->>'verification_policy_version' is distinct from p->>'verification_policy_version'
     or p_verdict->>'generation_fingerprint' is distinct from koaptix_s1.generation_fingerprint(p_plan)
     or p_verdict->>'verifier_session_user' is distinct from session_user::text
     or p_verdict->>'verdict' is null or p_verdict->>'verdict' not in ('PASS','FAIL')
     or p_verdict->>'observed_state_identity' is distinct from koaptix_s1.observed_identity(p_plan)
     or p_verdict->>'observed_at' is distinct from koaptix_s1.utc((p_verdict->>'observed_at')::timestamptz)
     or (p_verdict->>'observed_at')::timestamptz>clock_timestamp()
     or clock_timestamp()>=(p->>'admission_deadline')::timestamptz
     or not exists(select from koaptix_s1.phase_record where plan_id=p_plan and phase='V' and record_kind='ADMIT'
       and actor=session_user and phase_identity=koaptix_s1.phase_identity(p_plan,'V'))
  then raise exception 'BLOCK_VERIFICATION: verdict bindings or actual V admission'; end if;
  if p_verdict->>'verdict'='PASS' then
    perform koaptix_s1.assert_complete_generation(p_plan);
    if koaptix_s1.completion(p_plan,'A') is null then raise exception 'BLOCK_PARTIAL: A completion'; end if;
  end if;
  insert into koaptix_s1.phase_record(plan_id,phase,record_kind,ordinal,phase_identity,actor,payload)
    values(p_plan,'V','VERDICT',0,koaptix_s1.phase_identity(p_plan,'V'),session_user,p_verdict);
  return p_verdict;
end;
$body$;

create function koaptix_s1.official_rows(p_d date) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object(
   'history',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',h.snapshot_date,'complex_id',h.complex_id,
     'market_cap_krw',h.market_cap_krw,'rank_all',h.rank_all,'total_market_cap',h.total_market_cap)
     order by h.snapshot_date,h.rank_all,h.complex_id),'[]'::jsonb) from public.complex_rank_history h where h.snapshot_date=p_d),
   'snapshot',(select coalesce(jsonb_agg(jsonb_build_object('snapshot_date',s.snapshot_date,'universe_code',s.universe_code,
     'complex_id',s.complex_id,'rank_all',s.rank_all,'market_cap_krw',s.market_cap_krw,'market_cap_share',s.market_cap_share,
     'previous_rank_all',s.previous_rank_all,'rank_delta_1d',s.rank_delta_1d,'is_top1000',s.is_top1000,
     'rank_method',s.rank_method,'calculation_version',s.calculation_version,'created_at',koaptix_s1.utc(s.created_at))
     order by s.snapshot_date,s.universe_code collate "C",s.rank_all,s.complex_id),'[]'::jsonb)
     from public.koaptix_rank_snapshot s where s.snapshot_date=p_d));
$body$;

create function koaptix_s1.publication_currentness(p_plan text) returns text
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; h jsonb; v_version bigint; v_target bigint; v_g uuid; v_date date;
  e public.koaptix_latest_board_publication_event%rowtype; v_previous_date date;
begin
  p:=koaptix_s1.preparation(p_plan); h:=koaptix_s1.current_head();
  v_target:=(p#>>'{predecessor,publication_version}')::bigint+1;
  v_version:=(h->>'publication_version')::bigint; v_g:=(h->>'active_generation_id')::uuid; v_date:=(h->>'D')::date;
  if v_version<v_target then raise exception 'BLOCK_PREDECESSOR: head behind completed event'; end if;
  while v_version>v_target loop
    select * into strict e from public.koaptix_latest_board_publication_event where publication_version=v_version;
    select coalesce(g.affected_rank_date,s.snapshot_date) into strict v_previous_date
      from public.koaptix_latest_board_generation g join public.koaptix_latest_board_generation_surface s using(generation_id)
      where g.generation_id=e.from_generation_id and s.surface_code='GLOBAL_LATEST';
    if e.event_type<>'PUBLISH' or e.to_generation_id is distinct from v_g or e.expected_previous_version<>v_version-1
       or v_previous_date>=v_date then raise exception 'BLOCK_PREDECESSOR: incompatible publication ancestry'; end if;
    v_g:=e.from_generation_id; v_version:=e.expected_previous_version; v_date:=v_previous_date;
  end loop;
  select * into strict e from public.koaptix_latest_board_publication_event where publication_version=v_target;
  if v_g is distinct from (p->>'G')::uuid or e.event_id is distinct from (p->>'event_id')::uuid
     or e.to_generation_id is distinct from v_g or v_date is distinct from (p->>'D')::date
  then raise exception 'BLOCK_PREDECESSOR: target is not a continuous ancestor'; end if;
  if h->>'active_event_id'=p->>'event_id' then return 'ALREADY_PUBLISHED_CURRENT'; end if;
  return 'ALREADY_PUBLISHED_NOT_CURRENT';
end;
$body$;

create function koaptix_s1.assert_publication_bundle(p_plan text,p_check_head boolean) returns void
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_rows jsonb; v_slots text[]; v_expected_slots text[]; v_done jsonb; v_verdict jsonb;
  e public.koaptix_latest_board_publication_event%rowtype;
begin
  p:=koaptix_s1.preparation(p_plan);
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  perform koaptix_s1.assert_complete_generation(p_plan);
  v_done:=koaptix_s1.completion(p_plan,'B');
  select payload into strict v_verdict from koaptix_s1.phase_record
    where plan_id=p_plan and phase='V' and record_kind='VERDICT' and actor='koaptix_publication_verifier';
  if v_verdict->>'mode' is distinct from 'GENERATION' or v_verdict->>'verdict' is distinct from 'PASS'
     or v_verdict->>'generation_fingerprint' is distinct from koaptix_s1.generation_fingerprint(p_plan)
     or v_verdict->>'verification_policy_version' is distinct from p->>'verification_policy_version'
     or v_done is null or v_done->>'event_id' is distinct from p->>'event_id'
     or v_done->>'generation_fingerprint' is distinct from koaptix_s1.generation_fingerprint(p_plan)
     or v_done->>'bundle_digest' is distinct from koaptix_s1.digest(jsonb_build_array(q->'data',
       (p->>'event_id')::uuid,(p#>>'{predecessor,publication_version}')::bigint+1,p->'predecessor'))
     or koaptix_s1.completion(p_plan,'A') is null
  then raise exception 'BLOCK_PARTIAL: B completion or protected V PASS'; end if;
  select * into strict e from public.koaptix_latest_board_publication_event where event_id=(p->>'event_id')::uuid;
  if e.event_type<>'PUBLISH' or e.plan_run_id<>p_plan or e.execution_run_id<>p->>'B_run_id'
     or e.to_generation_id<>(p->>'G')::uuid or e.from_generation_id<>(p#>>'{predecessor,active_generation_id}')::uuid
     or e.expected_previous_version<>(p#>>'{predecessor,publication_version}')::bigint
     or e.publication_version<>e.expected_previous_version+1 or e.recorded_at<>(p->>'event_recorded_at')::timestamptz
  then raise exception 'BLOCK_CONFLICT: exact B event tuple'; end if;
  select array_agg(slot_code order by slot_code collate "C") into v_slots from koaptix_s1.publication_slot
    where publication_track='KOAPTIX_OFFICIAL_DAILY' and d=(p->>'D')::date;
  select array_agg(code order by code collate "C") into v_expected_slots from
    (select 'GLOBAL' code union all select 'U:'||jsonb_array_elements_text(q->'required_universes')) s;
  if v_slots is distinct from v_expected_slots or exists(select from koaptix_s1.publication_slot s
    where s.publication_track='KOAPTIX_OFFICIAL_DAILY' and s.d=(p->>'D')::date and
      (s.plan_id<>p_plan or s.event_id<>e.event_id or s.generation_id<>e.to_generation_id
       or s.publication_version<>e.publication_version or s.recorded_at<>e.recorded_at))
  then raise exception 'BLOCK_PARTIAL: GLOBAL/U bundle coverage'; end if;
  v_rows:=koaptix_s1.official_rows((p->>'D')::date);
  if koaptix_s1.rows_equal(q#>'{data,history_stage_rows}',v_rows->'history') is distinct from true
     or koaptix_s1.rows_equal(q#>'{data,snapshot_stage_rows}',v_rows->'snapshot') is distinct from true
  then raise exception 'BLOCK_PARTIAL: whole-date official bundle differs'; end if;
  if p_check_head then perform koaptix_s1.publication_currentness(p_plan); end if;
end;
$body$;

create function koaptix_s1.publish(p_plan text,p_ordinal smallint) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_done jsonb; v_verdict jsonb; v_g uuid; v_event uuid; v_date date;
  v_expected_version bigint; v_fp text; v_changed bigint; v_rows jsonb;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan);
  v_g:=(p->>'G')::uuid; v_event:=(p->>'event_id')::uuid; v_date:=(p->>'D')::date;
  v_expected_version:=(p#>>'{predecessor,publication_version}')::bigint;
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  v_done:=koaptix_s1.completion(p_plan,'B');
  if v_done is not null then
    perform koaptix_s1.assert_publication_bundle(p_plan,true);
    return v_done||jsonb_build_object('result',koaptix_s1.publication_currentness(p_plan));
  end if;
  v_rows:=koaptix_s1.official_rows(v_date);
  if exists(select from koaptix_s1.publication_slot where publication_track='KOAPTIX_OFFICIAL_DAILY' and d=v_date)
     or exists(select from public.koaptix_latest_board_publication_event where event_id=v_event or execution_run_id=p->>'B_run_id' or to_generation_id=v_g)
     or jsonb_array_length(v_rows->'history')>0 or jsonb_array_length(v_rows->'snapshot')>0
  then raise exception 'BLOCK_PARTIAL: B footprint without complete bundle'; end if;
  perform koaptix_s1.require_admission(p_plan,'B',p_ordinal);
  perform 1 from public.koaptix_latest_board_publication where singleton_id for update nowait;
  if koaptix_s1.current_head() is distinct from p->'predecessor' or v_date<=(p#>>'{predecessor,D}')::date
     or v_date<=(select max(snapshot_date) from public.complex_rank_history)
  then raise exception 'BLOCK_PREDECESSOR'; end if;
  perform koaptix_s1.assert_complete_generation(p_plan);
  v_fp:=koaptix_s1.generation_fingerprint(p_plan);
  select payload into v_verdict from koaptix_s1.phase_record where plan_id=p_plan and phase='V' and record_kind='VERDICT'
    and actor='koaptix_publication_verifier' and phase_identity=koaptix_s1.phase_identity(p_plan,'V');
  if v_verdict is null or v_verdict->>'verdict' is distinct from 'PASS' or v_verdict->>'mode' is distinct from 'GENERATION'
     or v_verdict->>'generation_fingerprint' is distinct from v_fp
  then raise exception 'BLOCK_VERIFICATION'; end if;
  -- The retained M904 revoker takes this same singleton lock. Eligibility is
  -- rechecked only after obtaining it, and the lock remains held through COMMIT.
  perform public.koaptix_assert_rank_input_authority(p->>'manifest_run_id',v_date,null);
  perform public.koaptix_verify_latest_board_generation(v_g);
  insert into koaptix_s1.publication_slot(publication_track,d,slot_code,plan_id,event_id,publication_version,generation_id,recorded_at)
    select 'KOAPTIX_OFFICIAL_DAILY',v_date,code,p_plan,v_event,v_expected_version+1,v_g,(p->>'event_recorded_at')::timestamptz
    from (select 'GLOBAL' code union all select 'U:'||jsonb_array_elements_text(q->'required_universes')) s;
  insert into public.complex_rank_history(snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap)
    select snapshot_date,complex_id,market_cap_krw,rank_all,total_market_cap
    from public.koaptix_rank_publication_history_stage where generation_id=v_g order by rank_all;
  insert into public.koaptix_rank_snapshot(snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,
    market_cap_share,previous_rank_all,rank_delta_1d,is_top1000,rank_method,calculation_version,created_at)
    select snapshot_date,universe_code,complex_id,rank_all,market_cap_krw,market_cap_share,previous_rank_all,
      rank_delta_1d,is_top1000,rank_method,calculation_version,created_at
    from public.koaptix_rank_publication_snapshot_stage where generation_id=v_g order by universe_code,rank_all;
  insert into public.koaptix_latest_board_publication_event(publication_version,event_id,event_type,from_generation_id,
    to_generation_id,plan_run_id,execution_run_id,expected_previous_version,recorded_at)
    values(v_expected_version+1,v_event,'PUBLISH',(p#>>'{predecessor,active_generation_id}')::uuid,v_g,p_plan,
      p->>'B_run_id',v_expected_version,(p->>'event_recorded_at')::timestamptz);
  v_done:=koaptix_s1.finish_phase(p_plan,'B',jsonb_build_object('result','PUBLISHED_NEW','event_id',v_event,
    'publication_version',v_expected_version+1,'generation_id',v_g,'generation_fingerprint',v_fp,
    'bundle_digest',koaptix_s1.digest(jsonb_build_array(q->'data',v_event,v_expected_version+1,p->'predecessor'))));
  perform koaptix_s1.assert_publication_bundle(p_plan,false);
  -- LAST official write. Audit, event, every slot and every dated row already
  -- belong to this transaction. Both old deferred guards and S1 guards fire.
  update public.koaptix_latest_board_publication set active_event_id=v_event,active_generation_id=v_g,
    previous_generation_id=(p#>>'{predecessor,active_generation_id}')::uuid,publication_version=v_expected_version+1,
    published_at=(p->>'event_recorded_at')::timestamptz
  where singleton_id and active_event_id=(p#>>'{predecessor,active_event_id}')::uuid
    and active_generation_id=(p#>>'{predecessor,active_generation_id}')::uuid
    and previous_generation_id is not distinct from (p#>>'{predecessor,previous_generation_id}')::uuid
    and publication_version=v_expected_version and published_at=(p#>>'{predecessor,published_at}')::timestamptz;
  get diagnostics v_changed=row_count;
  if v_changed<>1 then raise exception 'BLOCK_PREDECESSOR: pointer CAS'; end if;
  set constraints all immediate;
  return v_done;
end;
$body$;

-- Preserved 16-macro intersection, earliest base, latest prior and round(...,4).
-- Only input plumbing and immutable output construction replace the old UPSERT.
create function koaptix_s1.derive_index_rows(p_d date,p_data jsonb,p_dependencies jsonb,p_clock timestamptz)
returns jsonb language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
  with target_universes as (
    select unnest(array[
      'KOREA_ALL',
      'SEOUL_ALL',
      'BUSAN_ALL',
      'DAEGU_ALL',
      'INCHEON_ALL',
      'GWANGJU_ALL',
      'DAEJEON_ALL',
      'ULSAN_ALL',
      'SEJONG_ALL',
      'GYEONGGI_ALL',
      'CHUNGBUK_ALL',
      'CHUNGNAM_ALL',
      'JEONNAM_ALL',
      'GYEONGBUK_ALL',
      'GYEONGNAM_ALL',
      'JEJU_ALL'
    ]::text[]) as universe_code
  ),
  universe_totals as (
    select
      rs.snapshot_date,
      rs.universe_code,
      sum(coalesce(rs.market_cap_krw, 0))::bigint as total_market_cap_krw,
      count(*)::integer as component_complex_count
    from jsonb_populate_recordset(null::public.koaptix_rank_snapshot,p_data->'snapshot_stage_rows') rs
    join target_universes tu
      on tu.universe_code = rs.universe_code
    where rs.snapshot_date = p_d
    group by rs.snapshot_date, rs.universe_code
  ),
  base_rows as (
    select distinct on (kis.universe_code)
      kis.universe_code,
      kis.base_date,
      kis.base_value,
      kis.base_market_cap_krw
    from jsonb_populate_recordset(null::public.koaptix_index_snapshot,p_dependencies) kis
    join target_universes tu
      on tu.universe_code = kis.universe_code
    order by kis.universe_code, kis.snapshot_date asc
  ),
  prev_rows as (
    select distinct on (kis.universe_code)
      kis.universe_code,
      kis.snapshot_date as prev_snapshot_date,
      kis.index_value as prev_index_value
    from jsonb_populate_recordset(null::public.koaptix_index_snapshot,p_dependencies) kis
    join target_universes tu
      on tu.universe_code = kis.universe_code
    where kis.snapshot_date < p_d
    order by kis.universe_code, kis.snapshot_date desc
  ),
  prepared as (
    select
      ut.snapshot_date,
      case
        when ut.universe_code = 'KOREA_ALL' then 'KOAPTIX_KOREA'
        when ut.universe_code like 'SGG\_%' escape '\' then 'KOAPTIX_' || ut.universe_code
        else 'KOAPTIX_' || replace(ut.universe_code, '_ALL', '')
      end as index_code,
      ut.universe_code,
      case
        when ut.universe_code = 'KOREA_ALL' then 'KOAPTIX KOREA'
        when ut.universe_code like 'SGG\_%' escape '\' then 'KOAPTIX ' || ut.universe_code
        else 'KOAPTIX ' || replace(ut.universe_code, '_ALL', '')
      end as index_name,
      coalesce(br.base_date, ut.snapshot_date) as base_date,
      coalesce(br.base_value, 1000::numeric) as base_value,
      coalesce(br.base_market_cap_krw, ut.total_market_cap_krw)::bigint as base_market_cap_krw,
      ut.total_market_cap_krw,
      ut.component_complex_count,
      pr.prev_snapshot_date,
      pr.prev_index_value
    from universe_totals ut
    left join base_rows br
      on br.universe_code = ut.universe_code
    left join prev_rows pr
      on pr.universe_code = ut.universe_code
  ),
  calculated as (
    select
      p.snapshot_date,
      p.index_code,
      p.universe_code,
      p.index_name,
      p.base_date,
      p.base_value,
      case
        when p.base_market_cap_krw > 0
          then round(
            p.base_value * (p.total_market_cap_krw::numeric / p.base_market_cap_krw::numeric),
            4
          )
        else null
      end as index_value,
      p.base_market_cap_krw,
      p.total_market_cap_krw,
      p.component_complex_count,
      case
        when p.prev_index_value is null then null
        when p.base_market_cap_krw > 0 then round(
          (
            round(
              p.base_value * (p.total_market_cap_krw::numeric / p.base_market_cap_krw::numeric),
              4
            ) - p.prev_index_value
          ),
          4
        )
        else null
      end as change_1d,
      case
        when p.prev_index_value is null or p.prev_index_value = 0 then null
        when p.base_market_cap_krw > 0 then round(
          (
            (
              round(
                p.base_value * (p.total_market_cap_krw::numeric / p.base_market_cap_krw::numeric),
                4
              ) - p.prev_index_value
            ) / p.prev_index_value
          ) * 100,
          4
        )
        else null
      end as change_pct_1d
    from prepared p
  )
  select coalesce(jsonb_agg(to_jsonb(typed)||jsonb_build_object('created_at',koaptix_s1.utc(typed.created_at))
    order by typed.universe_code collate "C",typed.index_code),'[]'::jsonb)
  from calculated c cross join lateral jsonb_populate_record(null::public.koaptix_index_snapshot,
    to_jsonb(c)||jsonb_build_object('index_method','rank_snapshot_aggregate','calculation_version','v1_2026_04_14',
      'calculation_note','Derived from koaptix_rank_snapshot aggregated by universe_code; base continuity reused from earliest koaptix_index_snapshot row when present.',
      'created_at',p_clock)) typed;
$body$;

create function koaptix_s1.index_dependencies(p_d date) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select coalesce(jsonb_agg(to_jsonb(i) order by i.universe_code collate "C",i.snapshot_date,i.index_code),'[]'::jsonb)
 from public.koaptix_index_snapshot i where
   i.snapshot_date=(select min(x.snapshot_date) from public.koaptix_index_snapshot x where x.universe_code=i.universe_code)
   or i.snapshot_date=(select max(x.snapshot_date) from public.koaptix_index_snapshot x where x.universe_code=i.universe_code and x.snapshot_date<p_d);
$body$;

create function koaptix_s1.expected_derivation(p_plan text) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_summary jsonb; v_index jsonb; v_d date;
begin
  p:=koaptix_s1.preparation(p_plan); v_d:=(p->>'D')::date;
  select payload into strict q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  if jsonb_array_length(q#>'{data,history_stage_rows}')=0 then raise exception 'BLOCK_PARTIAL: no B global rows'; end if;
  if exists(
    with deps as (select * from jsonb_populate_recordset(null::public.koaptix_index_snapshot,p#>'{inputs,index_dependencies}')),
    bases as (select * from deps d where snapshot_date=(select min(x.snapshot_date) from deps x where x.universe_code=d.universe_code)),
    priors as (select * from deps d where snapshot_date=(select max(x.snapshot_date) from deps x where x.universe_code=d.universe_code and x.snapshot_date<v_d))
    select from bases group by universe_code having count(distinct jsonb_build_array(base_date,base_value,base_market_cap_krw))>1
    union all select from priors group by universe_code having count(distinct index_value)>1
  ) then raise exception 'BLOCK_CONFLICT: tied earliest/prior index semantics'; end if;
  select jsonb_build_array(jsonb_build_object('id',p->>'summary_id','run_date',v_d,'universe_code','KOREA_ALL',
    'listed_complex_count',count(*)::integer,'total_market_cap',coalesce(sum(market_cap_krw),0)::numeric(20,0),
    'top50_market_cap',coalesce(sum(case when rank_all<=50 then market_cap_krw else 0 end),0)::numeric(20,0),
    'created_at',p->>'generated_at','updated_at',p->>'generated_at')) into v_summary
    from jsonb_populate_recordset(null::public.koaptix_rank_publication_history_stage,q#>'{data,history_stage_rows}');
  v_index:=koaptix_s1.derive_index_rows(v_d,q->'data',p#>'{inputs,index_dependencies}',(p->>'generated_at')::timestamptz);
  if exists(select from jsonb_array_elements(v_index) i where (i->>'base_market_cap_krw')::numeric<=0
    or (i->>'base_value')::numeric<=0 or (i->>'index_value')::numeric<=0 or i->>'index_value' is null
    or (i->>'base_date')::date>v_d)
  then raise exception 'BLOCK_CONFLICT: nonpositive/future index baseline'; end if;
  return jsonb_build_object('summary',v_summary,'index',v_index);
end;
$body$;

create function koaptix_s1.derivation_rows(p_d date) returns jsonb
language sql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object('summary',
   (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('created_at',koaptix_s1.utc(s.created_at),
     'updated_at',koaptix_s1.utc(s.updated_at)) order by s.universe_code),'[]'::jsonb)
    from public.koaptix_market_daily_summary s where s.run_date=p_d),
   'index',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('created_at',koaptix_s1.utc(i.created_at))
     order by i.universe_code collate "C",i.index_code),'[]'::jsonb)
    from public.koaptix_index_snapshot i where i.snapshot_date=p_d));
$body$;

create function koaptix_s1.derive(p_plan text,p_ordinal smallint) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; v_expected jsonb; v_actual jsonb; v_done jsonb; v_d date;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan); v_d:=(p->>'D')::date;
  perform koaptix_s1.assert_publication_bundle(p_plan,true);
  v_expected:=koaptix_s1.expected_derivation(p_plan); v_actual:=koaptix_s1.derivation_rows(v_d);
  v_done:=koaptix_s1.completion(p_plan,'D');
  if v_done is not null or jsonb_array_length(v_actual->'summary')>0 or jsonb_array_length(v_actual->'index')>0 then
    if v_done is null or v_actual is distinct from v_expected or v_done->'outputs' is distinct from v_expected
       or v_done->>'event_id' is distinct from p->>'event_id'
    then raise exception 'BLOCK_PARTIAL: immutable dated output/COMPLETE mismatch'; end if;
    return v_done;
  end if;
  perform koaptix_s1.require_admission(p_plan,'D',p_ordinal);
  if koaptix_s1.index_dependencies(v_d) is distinct from p#>'{inputs,index_dependencies}'
     or exists(select from koaptix_s1.plan_segment prior where prior.segment_kind='PREPARATION' and prior.d<v_d
       and koaptix_s1.completion(prior.plan_id,'B') is not null and koaptix_s1.completion(prior.plan_id,'D') is null)
  then raise exception 'BLOCK_PREDECESSOR: frozen index dependencies / pending prior D'; end if;
  insert into public.koaptix_market_daily_summary
    select * from jsonb_populate_recordset(null::public.koaptix_market_daily_summary,v_expected->'summary');
  insert into public.koaptix_index_snapshot
    select * from jsonb_populate_recordset(null::public.koaptix_index_snapshot,v_expected->'index');
  if koaptix_s1.derivation_rows(v_d) is distinct from v_expected then raise exception 'BLOCK_PARTIAL: D full output'; end if;
  return koaptix_s1.finish_phase(p_plan,'D',jsonb_build_object('result','DERIVATION_COMPLETE','event_id',p->>'event_id',
    'outputs',v_expected,'output_sha',koaptix_s1.digest(v_expected)));
end;
$body$;

create function koaptix_s1.read_evidence(p_plan text,p_mode text) returns jsonb
language plpgsql security definer stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; v_records jsonb; v_event jsonb; v_slots jsonb; v_expected_d jsonb;
  v_p_inputs jsonb; v_p_patch jsonb; v_prior text; v_reference jsonb;
begin
  perform koaptix_s1.require_actor('BOTH');
  if p_mode not in ('PLAN','P','S','A','V','B','D','REFERENCE') then raise exception 'invalid fixed evidence mode'; end if;
  if session_user='koaptix_publication_verifier' and
     (current_setting('transaction_isolation')<>'repeatable read' or current_setting('transaction_read_only')<>'on')
  then raise exception 'V evidence requires a fresh REPEATABLE READ READ ONLY transaction'; end if;
  p:=koaptix_s1.preparation(p_plan);
  if p is null then raise exception 'unknown frozen plan'; end if;
  select payload into q from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION';
  select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('recorded_at',koaptix_s1.utc(r.recorded_at))
    order by r.phase,r.record_kind,r.ordinal),'[]'::jsonb) into v_records from koaptix_s1.phase_record r where r.plan_id=p_plan;
  select to_jsonb(e)||jsonb_build_object('recorded_at',koaptix_s1.utc(e.recorded_at)) into v_event
    from public.koaptix_latest_board_publication_event e where e.event_id=(p->>'event_id')::uuid;
  select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('recorded_at',koaptix_s1.utc(s.recorded_at)) order by s.slot_code collate "C"),'[]'::jsonb)
    into v_slots from koaptix_s1.publication_slot s where s.publication_track='KOAPTIX_OFFICIAL_DAILY' and s.d=(p->>'D')::date;
  if q is not null and p_mode='D' then v_expected_d:=koaptix_s1.expected_derivation(p_plan); end if;
  if p_mode='P' and koaptix_s1.completion(p_plan,'P') is null then
    v_p_inputs:=koaptix_s1.capture_inputs((p->>'D')::date);
    v_p_patch:=koaptix_s1.preview_patch(v_p_inputs,(p->>'D')::date,(p->>'generated_at')::timestamptz);
  end if;
  if p_mode='REFERENCE' then
    select plan_id into v_prior from koaptix_s1.plan_segment where segment_kind='PREPARATION'
      and payload->>'G'=p#>>'{predecessor,active_generation_id}';
    if v_prior is not null then v_reference:=koaptix_s1.read_evidence(v_prior,'B'); end if;
  end if;
  return jsonb_build_object('reference_prior',v_reference,'contract_sha',p->>'contract_sha','mode',p_mode,'session_user',session_user,
    'observed_at',koaptix_s1.utc(statement_timestamp()),'preparation',p,'publication',q,'records',v_records,
    'expected_generation',case when q is not null then koaptix_s1.generation_material(p_plan,false) end,
    'actual_generation',koaptix_s1.generation_material(p_plan,true),
    'generation_fingerprint',case when q is not null then koaptix_s1.generation_fingerprint(p_plan) end,
    'observed_state_identity',koaptix_s1.observed_identity(p_plan),
    'manifest',koaptix_s1.stored_manifest(p->>'manifest_run_id'),
    'manifest_candidates',(select coalesce(jsonb_agg(koaptix_s1.stored_manifest(m.run_id) order by m.run_id),'[]'::jsonb)
      from public.koaptix_rank_input_authority_manifest m where m.run_id=p->>'manifest_run_id'
      or (m.snapshot_date=(p->>'D')::date and m.authority_contract_version='rank-input-v1')),
    'generation_collisions',(select coalesce(jsonb_agg(g.generation_id order by g.generation_id),'[]'::jsonb)
      from public.koaptix_latest_board_generation g where g.generation_id=(p->>'G')::uuid or g.run_id=p->>'A_run_id'
      or (g.source_authority_kind='SEALED_RANK_INPUT_MANIFEST' and g.source_authority_key=p->>'manifest_run_id')
      or g.combined_surface_manifest_sha256=q#>>'{data,combined_surface_manifest_sha256}'),
    'event_candidates',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('recorded_at',koaptix_s1.utc(e.recorded_at))
      order by e.publication_version),'[]'::jsonb) from public.koaptix_latest_board_publication_event e
      where e.event_id=(p->>'event_id')::uuid or e.execution_run_id=p->>'B_run_id' or e.to_generation_id=(p->>'G')::uuid),
    'P_current_inputs',v_p_inputs,'P_current_patch',v_p_patch,
    'revocations',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.koaptix_rank_input_manifest_revocation r where manifest_run_id=p->>'manifest_run_id'),
    'event',v_event,'slots',v_slots,'official',koaptix_s1.official_rows((p->>'D')::date),
    'head',koaptix_s1.current_head(),
    'ancestry',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('recorded_at',koaptix_s1.utc(e.recorded_at),
      'D',coalesce(g.affected_rank_date,s.snapshot_date)) order by e.publication_version),'[]'::jsonb)
      from public.koaptix_latest_board_publication_event e join public.koaptix_latest_board_generation g on g.generation_id=e.to_generation_id
      join public.koaptix_latest_board_generation_surface s on s.generation_id=g.generation_id and s.surface_code='GLOBAL_LATEST'
      where e.publication_version>=(p#>>'{predecessor,publication_version}')::bigint+1),
    'derivation',koaptix_s1.derivation_rows((p->>'D')::date),'expected_derivation',v_expected_d);
end;
$body$;


create function koaptix_s1.business_state(p_data jsonb) returns jsonb
language sql immutable strict set search_path=pg_catalog,public,koaptix_s1 as $body$
 select jsonb_build_object(
  'global_rows',(select jsonb_agg(r-array['snapshot_date','source_previous_snapshot_date','generated_at','refresh_run_id']
    order by r->>'universe_code' collate "C",(r->>'rank_all')::bigint,(r->>'complex_id')::bigint)
    from jsonb_array_elements(p_data->'global_rows') r),
  'service_rows',(select jsonb_agg(r-array['snapshot_date','source_previous_snapshot_date','generated_at','refresh_run_id']
    order by r->>'universe_code' collate "C",(r->>'rank_all')::bigint,(r->>'complex_id')::bigint)
    from jsonb_array_elements(p_data->'service_rows') r));
$body$;

create function koaptix_s1.reference_material(p_plan text) returns jsonb
language plpgsql stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb; prior text; prior_p jsonb; v jsonb; e jsonb; slots jsonb;
begin
  p:=koaptix_s1.preparation(p_plan);
  select plan_id,payload into strict prior,prior_p from koaptix_s1.plan_segment
    where segment_kind='PREPARATION' and payload->>'G'=p#>>'{predecessor,active_generation_id}';
  select payload into strict q from koaptix_s1.plan_segment where plan_id=prior and segment_kind='PUBLICATION';
  select payload into strict v from koaptix_s1.phase_record where plan_id=prior and phase='V' and record_kind='VERDICT';
  select to_jsonb(t)||jsonb_build_object('recorded_at',koaptix_s1.utc(t.recorded_at)) into strict e
    from public.koaptix_latest_board_publication_event t where event_id=(prior_p->>'event_id')::uuid;
  select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('recorded_at',koaptix_s1.utc(t.recorded_at))
    order by t.slot_code collate "C"),'[]'::jsonb) into slots from koaptix_s1.publication_slot t
    where publication_track='KOAPTIX_OFFICIAL_DAILY' and d=(prior_p->>'D')::date;
  return jsonb_build_object('preparation',p,'P_complete',koaptix_s1.completion(p_plan,'P'),
    'prior_preparation',prior_p,'prior_publication',q,'prior_P_complete',koaptix_s1.completion(prior,'P'),
    'prior_S_complete',koaptix_s1.completion(prior,'S'),'prior_A_complete',koaptix_s1.completion(prior,'A'),
    'prior_V_verdict',v,'prior_B_complete',koaptix_s1.completion(prior,'B'),
    'prior_generation',koaptix_s1.generation_material(prior,true),
    'prior_event',e,'prior_slots',slots,'prior_official',koaptix_s1.official_rows((prior_p->>'D')::date));
end;
$body$;

create function koaptix_s1.append_reference(p_plan text,p_verdict jsonb) returns jsonb
language plpgsql volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; material jsonb; r jsonb; current_data jsonb; prior_data jsonb; pc jsonb; prior_pc jsonb;
  prior_plan text; v_class text; v_clock timestamptz; prior_input text; current_input text;
  keys text[]:=array['mode','contract_sha','plan_id','D','projection_identity','verification_policy_version',
    'verifier_session_user','verdict','observed_state_identity','observed_at','reference','comparison_evidence'];
  receipt_keys text[]:=array['expected_kst_day','observed_at','classification','observation_evidence_sha256',
    'source_inventory_complete','prior_generation_id','prior_packet_sha256','prior_projection_contract_sha256',
    'projection_contract_sha256','prior_business_sha256','current_business_sha256','prior_input_identity_sha256',
    'current_input_identity_sha256','affected_universe_set_sha256','prior_date_vector_sha256'];
begin
  perform koaptix_s1.require_actor('V'); p:=koaptix_s1.lock_plan(p_plan);
  if jsonb_typeof(p_verdict) is distinct from 'object' or not(p_verdict ?& keys) or p_verdict-keys<>'{}'::jsonb
  then raise exception 'BLOCK_VERIFICATION: exact reference verdict'; end if;
  material:=koaptix_s1.reference_material(p_plan); pc:=material->'P_complete'; prior_pc:=material->'prior_P_complete';
  prior_plan:=material#>>'{prior_preparation,plan_id}'; r:=p_verdict->'reference';
  v_clock:=(p_verdict->>'observed_at')::timestamptz;
  if jsonb_typeof(r) is distinct from 'object' or not(r ?& receipt_keys) or r-receipt_keys<>'{}'::jsonb
    or p_verdict->>'mode' is distinct from 'REFERENCE' or p_verdict->>'contract_sha' is distinct from p->>'contract_sha'
    or p_verdict->>'plan_id' is distinct from p_plan or p_verdict->>'D' is distinct from p->>'D'
    or p_verdict->>'projection_identity' is distinct from p->>'projection_identity'
    or p_verdict->>'verification_policy_version' is distinct from p->>'verification_policy_version'
    or p_verdict->>'verifier_session_user' is distinct from session_user::text
    or p_verdict->>'verdict' is null or p_verdict->>'verdict' not in ('PASS','FAIL') or p_verdict->'comparison_evidence' is distinct from material
    or p_verdict->>'observed_state_identity' is distinct from koaptix_s1.digest(material)
    or p_verdict->>'observed_at' is distinct from koaptix_s1.utc(v_clock) or v_clock>clock_timestamp()
    or v_clock>=(p->>'admission_deadline')::timestamptz
    or (v_clock at time zone 'Asia/Seoul')::date is distinct from (p->>'D')::date+1
    or not exists(select from koaptix_s1.phase_record where plan_id=p_plan and phase='V' and record_kind='ADMIT'
       and actor=session_user and phase_identity=koaptix_s1.phase_identity(p_plan,'V'))
    or exists(select from koaptix_s1.plan_segment where plan_id=p_plan and segment_kind='PUBLICATION')
    or koaptix_s1.completion(p_plan,'S') is not null or koaptix_s1.completion(p_plan,'A') is not null
    or exists(select from koaptix_s1.publication_slot where publication_track='KOAPTIX_OFFICIAL_DAILY' and d=(p->>'D')::date)
    or koaptix_s1.official_rows((p->>'D')::date)<>jsonb_build_object('history','[]'::jsonb,'snapshot','[]'::jsonb)
  then raise exception 'BLOCK_VERIFICATION: immutable reference bindings'; end if;
  if p_verdict->>'verdict'='PASS' then
    perform koaptix_s1.assert_publication_bundle(prior_plan,true);
    if pc is null or prior_pc is null or jsonb_typeof(pc->'source_inventory') is distinct from 'object'
      or jsonb_typeof(prior_pc->'source_inventory') is distinct from 'object'
      or pc->>'source_inventory_sha' is distinct from koaptix_s1.digest(pc->'source_inventory')
      or prior_pc->>'source_inventory_sha' is distinct from koaptix_s1.digest(prior_pc->'source_inventory')
    then raise exception 'BLOCK_PARTIAL: complete inventory bytes required'; end if;
    prior_data:=material#>'{prior_publication,data}';
    prior_input:=koaptix_s1.digest(prior_pc->'source_inventory'); current_input:=koaptix_s1.digest(pc->'source_inventory');
    if pc->'source_inventory'=prior_pc->'source_inventory' and current_input=prior_input then
      v_class:='NO_NEW_SOURCE_INPUT'; current_data:=prior_data;
    else
      if jsonb_typeof(pc->'projection') is distinct from 'object' then raise exception 'BLOCK_VERIFICATION: no complete current Projection'; end if;
      current_data:=koaptix_s1.assemble(pc->'projection'); v_class:='VERIFIED_NO_OUTPUT_CHANGE';
    end if;
    if koaptix_s1.digest(koaptix_s1.business_state(current_data)) is distinct from koaptix_s1.digest(koaptix_s1.business_state(prior_data))
      or r is distinct from jsonb_build_object('expected_kst_day',((p->>'D')::date+1)::text,
        'observed_at',p_verdict->>'observed_at','classification',v_class,'source_inventory_complete',true,
        'observation_evidence_sha256',koaptix_s1.digest(material),
        'prior_generation_id',material#>>'{prior_preparation,G}',
        'prior_packet_sha256',koaptix_s1.digest(material#>'{prior_publication,packet}'),
        'prior_projection_contract_sha256',material#>>'{prior_preparation,projection_identity}',
        'projection_contract_sha256',p->>'projection_identity',
        'prior_business_sha256',koaptix_s1.digest(koaptix_s1.business_state(prior_data)),
        'current_business_sha256',koaptix_s1.digest(koaptix_s1.business_state(current_data)),
        'prior_input_identity_sha256',prior_input,'current_input_identity_sha256',current_input,
        'affected_universe_set_sha256',material#>>'{prior_publication,manifest_semantics,affected_universe_set_sha256}',
        'prior_date_vector_sha256',prior_data#>>'{surface_components,1,date_vector_sha256}')
    then raise exception 'BLOCK_VERIFICATION: reference is not exact complete evidence'; end if;
  end if;
  insert into koaptix_s1.phase_record(plan_id,phase,record_kind,ordinal,phase_identity,actor,payload)
    values(p_plan,'V','VERDICT',0,koaptix_s1.phase_identity(p_plan,'V'),session_user,p_verdict);
  return p_verdict;
end;
$body$;

create function koaptix_s1.append_observations(p_plan text,p_batch jsonb) returns jsonb
language plpgsql security definer volatile set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; n smallint; v jsonb;
begin
  perform koaptix_s1.require_actor('W'); p:=koaptix_s1.lock_plan(p_plan);
  if jsonb_typeof(p_batch) is distinct from 'object' or not (p_batch ?& array['contract_sha','observations'])
     or p_batch-array['contract_sha','observations']<>'{}'::jsonb then
    raise exception 'exact observation batch required'; end if;
  if p_batch->>'contract_sha' is distinct from p->>'contract_sha' or jsonb_typeof(p_batch->'observations') is distinct from 'array'
     or jsonb_array_length(p_batch->'observations')>8 then raise exception 'bounded observation batch required'; end if;
  for v in select value from jsonb_array_elements(p_batch->'observations') loop
    if not (v ?& array['phase','result','original_ack','reconciliation'])
       or v-array['phase','result','original_ack','reconciliation','finished_at']<>'{}'::jsonb
       or v->>'phase' not in ('P','S','A','V','B','D','W_START')
       or v->>'original_ack' not in ('OBSERVED','UNKNOWN','UNOBSERVED')
       or v->>'result' not in ('SUCCESS_NEW','SUCCESS_EXISTING','RECOVERED_COMMITTED','NOOP_ALREADY_COMPLETE',
         'BLOCK_CONFLICT','BLOCK_PARTIAL','BLOCK_VERIFICATION','BLOCK_PREDECESSOR','BLOCK_BUDGET','BLOCK_EXPIRED','FAIL_PRECOMMIT','ACK_UNKNOWN')
    then raise exception 'invalid sanitized observation'; end if;
    if v ? 'finished_at' and (jsonb_typeof(v->'finished_at') is distinct from 'string'
      or v->>'finished_at' is distinct from koaptix_s1.utc((v->>'finished_at')::timestamptz))
    then raise exception 'invalid observed phase finish clock'; end if;
  end loop;
  select coalesce(max(ordinal),0)+1 into n from koaptix_s1.phase_record where plan_id=p_plan and phase='W_START' and record_kind='OBSERVE';
  if n>2 then raise exception 'BLOCK_BUDGET'; end if;
  insert into koaptix_s1.phase_record(plan_id,phase,record_kind,ordinal,phase_identity,actor,payload)
    values(p_plan,'W_START','OBSERVE',n,koaptix_s1.phase_identity(p_plan,'W_START'),session_user,p_batch);
  return jsonb_build_object('observation_ordinal',n);
end;
$body$;

create function public.koaptix_s1_check_dated_write(p_caller name,p_old date,p_new date,p_op text)
returns void language plpgsql security definer stable set search_path=pg_catalog,public,koaptix_s1 as $body$
declare v_boundary date;
begin
  select activation_boundary into v_boundary from koaptix_s1.policy where singleton;
  if p_op='TRUNCATE' then
    if exists(select from koaptix_s1.plan_segment) then raise exception 'S1 dated relations cannot be truncated'; end if;
    return;
  end if;
  if p_old>v_boundary or p_new>v_boundary then
    if p_op<>'INSERT' or p_caller<>'koaptix_s1_owner' or not exists(select from koaptix_s1.plan_segment
      where d=p_new and segment_kind='PREPARATION')
    then raise exception 'S1 dated output is immutable and has one fixed writer'; end if;
  end if;
end;
$body$;

create function public.koaptix_s1_guard_dated_write() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $body$
declare v_old date; v_new date; v_caller name:=current_user;
begin
  if tg_op='TRUNCATE' then
    perform public.koaptix_s1_check_dated_write(v_caller,null,null,tg_op); return null;
  end if;
  if tg_op<>'INSERT' then v_old:=coalesce(to_jsonb(old)->>'snapshot_date',to_jsonb(old)->>'run_date')::date; end if;
  if tg_op<>'DELETE' then v_new:=coalesce(to_jsonb(new)->>'snapshot_date',to_jsonb(new)->>'run_date')::date; end if;
  -- Invoker captures the actual effective writer before the private-owner check.
  -- Direct calls to the check return no data and confer no mutation capability.
  perform public.koaptix_s1_check_dated_write(v_caller,v_old,v_new,tg_op);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$body$;
revoke all on function public.koaptix_s1_guard_dated_write() from public;
revoke all on function public.koaptix_s1_check_dated_write(name,date,date,text) from public;
-- Intentional safe PUBLIC interface for invoker triggers on legacy/historical
-- DML routes. This function only rejects/returns void; it never performs DML.
grant execute on function public.koaptix_s1_check_dated_write(name,date,date,text) to public;

create function koaptix_s1.require_bundle_commit() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,koaptix_s1 as $body$
declare p jsonb; q jsonb;
begin
  if new.slot_code='GLOBAL' then perform koaptix_s1.assert_publication_bundle(new.plan_id,true);
  else
    p:=koaptix_s1.preparation(new.plan_id);
    select payload into strict q from koaptix_s1.plan_segment where plan_id=new.plan_id and segment_kind='PUBLICATION';
    if new.d is distinct from (p->>'D')::date or not (q->'required_universes' ? substring(new.slot_code from 3))
       or not exists(select from koaptix_s1.publication_slot g where g.publication_track=new.publication_track and g.d=new.d
         and g.slot_code='GLOBAL' and g.plan_id=new.plan_id and g.event_id=new.event_id and g.generation_id=new.generation_id
         and g.publication_version=new.publication_version and g.recorded_at=new.recorded_at)
       or koaptix_s1.completion(new.plan_id,'B') is null
    then raise exception 'BLOCK_PARTIAL: universe slot is not in the exact complete bundle'; end if;
  end if;
  return null;
end;
$body$;
create constraint trigger s1_bundle_complete after insert on koaptix_s1.publication_slot
deferrable initially deferred for each row execute function koaptix_s1.require_bundle_commit();

revoke all on all tables in schema koaptix_s1 from public,koaptix_publication_writer,koaptix_publication_verifier;
revoke all on all functions in schema koaptix_s1 from public,koaptix_publication_writer,koaptix_publication_verifier;
grant execute on function koaptix_s1.admit_due_occurrence(),koaptix_s1.prepare(text,smallint),
  koaptix_s1.seal(text,smallint),koaptix_s1.build(text,smallint),koaptix_s1.publish(text,smallint),
  koaptix_s1.derive(text,smallint),koaptix_s1.append_observations(text,jsonb) to koaptix_publication_writer;
grant execute on function koaptix_s1.admit_phase(text,text),koaptix_s1.read_evidence(text,text)
  to koaptix_publication_writer,koaptix_publication_verifier;
grant execute on function koaptix_s1.record_verification(text,jsonb) to koaptix_publication_verifier;

grant execute on function public.koaptix_s1_guard_dated_write() to postgres;
reset role;
revoke create on schema public from koaptix_s1_owner;

create trigger s1_history_immutable before insert or update or delete on public.complex_rank_history
for each row execute function public.koaptix_s1_guard_dated_write();
create trigger s1_snapshot_immutable before insert or update or delete on public.koaptix_rank_snapshot
for each row execute function public.koaptix_s1_guard_dated_write();
create trigger s1_summary_immutable before insert or update or delete on public.koaptix_market_daily_summary
for each row execute function public.koaptix_s1_guard_dated_write();
create trigger s1_index_immutable before insert or update or delete on public.koaptix_index_snapshot
for each row execute function public.koaptix_s1_guard_dated_write();
create trigger s1_history_no_truncate before truncate on public.complex_rank_history
for each statement execute function public.koaptix_s1_guard_dated_write();
create trigger s1_snapshot_no_truncate before truncate on public.koaptix_rank_snapshot
for each statement execute function public.koaptix_s1_guard_dated_write();
create trigger s1_summary_no_truncate before truncate on public.koaptix_market_daily_summary
for each statement execute function public.koaptix_s1_guard_dated_write();
create trigger s1_index_no_truncate before truncate on public.koaptix_index_snapshot
for each statement execute function public.koaptix_s1_guard_dated_write();
set local role koaptix_s1_owner;
revoke execute on function public.koaptix_s1_guard_dated_write() from postgres;
grant usage on schema koaptix_s1 to postgres;
grant execute on function koaptix_s1.koaptix_get_household_relation() to postgres;
reset role;

-- Grant only the selected finite household source. No caller-selected relation.
do $household$
declare v_relation text;
begin
  v_relation:=koaptix_s1.koaptix_get_household_relation();
  if v_relation is not null then
    if v_relation not in ('public.kapt_area','public.kapt_complex_area','public.kapt_complex_household','public.apt_complex')
    then raise exception 'unexpected household source'; end if;
    execute format('grant select on table %s to koaptix_s1_owner',v_relation::regclass);
  end if;
end;
$household$;

set local role koaptix_s1_owner;
revoke execute on function koaptix_s1.koaptix_get_household_relation() from postgres;
revoke usage on schema koaptix_s1 from postgres;
reset role;
-- Accepted prospective NULL-tier prerequisite; no M908/M909 runtime dependency.
set local role koaptix_rank_publication_owner;
ALTER TABLE public.koaptix_latest_board_generation_row
  ALTER COLUMN tier_code DROP NOT NULL,
  ALTER COLUMN tier_sort DROP NOT NULL;

-- Existing S-E/range checks still constrain historical compatibility values.
-- Newly inserted all-NULL compatibility triples are structurally admitted.
ALTER TABLE public.koaptix_latest_board_generation_row
  ADD CONSTRAINT koaptix_generation_service_tier_compatibility_check
  CHECK (
    (tier_code IS NULL AND tier_label IS NULL AND tier_sort IS NULL)
    OR (tier_code IS NOT NULL AND tier_sort IS NOT NULL)
  ) NOT VALID;

-- The existing writer inserts child rows before their deferred parent.
-- This parent-insert guard sees the complete new generation and does not
-- replace a hash-bound sealed writer or revalidate/rewrite historical rows.
CREATE FUNCTION public.koaptix_require_forward_projection_null_tiers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.source_authority_kind = 'SEALED_RANK_INPUT_MANIFEST' THEN
    IF EXISTS (
      SELECT 1
      FROM public.koaptix_latest_board_generation_row r
      WHERE r.generation_id = NEW.generation_id
        AND (r.tier_code IS NOT NULL OR r.tier_label IS NOT NULL OR r.tier_sort IS NOT NULL)
    ) OR EXISTS (
      SELECT 1
      FROM public.koaptix_latest_board_generation_global_row r
      WHERE r.generation_id = NEW.generation_id
        AND (r.tier_code IS NOT NULL OR r.tier_label IS NOT NULL OR r.tier_sort IS NOT NULL)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'PD01_FORWARD_GENERATION_REQUIRES_NULL_TIER_TRIPLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.koaptix_require_forward_projection_null_tiers()
  OWNER TO koaptix_rank_publication_owner;
REVOKE ALL ON FUNCTION public.koaptix_require_forward_projection_null_tiers() FROM PUBLIC;

CREATE TRIGGER koaptix_forward_projection_null_tiers
BEFORE INSERT ON public.koaptix_latest_board_generation
FOR EACH ROW
EXECUTE FUNCTION public.koaptix_require_forward_projection_null_tiers();
reset role;


-- Effective runtime privileges, including inherited PUBLIC database/schema
-- privileges, are checked at installation. Do not broaden other roles here.
do $runtime_acl$
declare r text; t regclass; f oid;
begin
  foreach r in array array['koaptix_publication_writer','koaptix_publication_verifier'] loop
    if has_database_privilege(r,current_database(),'TEMPORARY')
       or has_schema_privilege(r,'public','CREATE') or has_schema_privilege(r,'koaptix_s1','CREATE')
    then raise exception 'S1 runtime has forbidden inherited TEMP/CREATE privilege'; end if;
    for t in select c.oid::regclass from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where (n.nspname='koaptix_s1' or (n.nspname='public' and c.relname=any(array[
        'staging_market_raw','complex_name_alias','apt_complex','koaptix_complex_region_map',
        'region_dim','apt_market_cap_snapshot','complex_eligibility_snapshot','complex_rank_history',
        'koaptix_rank_snapshot','koaptix_market_daily_summary','koaptix_index_snapshot',
        'koaptix_rank_input_authority_manifest','koaptix_rank_input_manifest_revocation',
        'koaptix_latest_board_generation','koaptix_latest_board_generation_surface',
        'koaptix_latest_board_generation_universe','koaptix_latest_board_generation_row',
        'koaptix_latest_board_generation_global_row','koaptix_rank_publication_history_stage',
        'koaptix_rank_publication_snapshot_stage','koaptix_latest_board_publication_event',
        'koaptix_latest_board_publication'])))
      and c.relkind in ('r','p','v')
    loop
      if has_table_privilege(r,t,'INSERT,UPDATE,DELETE,TRUNCATE')
         or has_any_column_privilege(r,t,'INSERT,UPDATE')
      then raise exception 'S1 runtime has forbidden direct canonical DML'; end if;
    end loop;
    -- Finite old publication namespaces are catalog-inspected only. None is
    -- called, redefined, or granted to either runtime by this migration.
    for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and (p.proname in ('run_koaptix_safe_finalize',
        'append_rank_history_from_staging','merge_market_source_to_master',
        'sync_market_daily_aggregates','refresh_koaptix_index_snapshot',
        'backfill_koaptix_complex_region_map','refresh_total_market_cap_history')
        or p.proname like 'koaptix%publication%' or p.proname like 'koaptix%generation%'
        or p.proname like 'koaptix%rank_input%')
    loop
      if has_function_privilege(r,f,'EXECUTE')
      then raise exception 'S1 runtime has forbidden effective legacy helper EXECUTE'; end if;
    end loop;
  end loop;
end;
$runtime_acl$;

commit;
