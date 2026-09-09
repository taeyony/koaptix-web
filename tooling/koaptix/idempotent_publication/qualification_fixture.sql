-- Q2 synthetic fixture only. NEVER execute during Q1.
-- Prerequisite: a separately provisioned, isolated local PostgreSQL database
-- containing the exact relevant M901-M906 definitions and C01 candidate.
-- Those implementation functions/constraints are asserted below, never stubbed,
-- weakened or replaced by this fixture. No production data or connection string.
-- C05 --inert-dsn-env S1_INERT_DSN installs this fixture only after its explicit
-- loopback/database fence. Full two-session Q2 scenarios remain separate tests;
-- installing fixture data is not a claim that those scenarios passed.
begin;
set local timezone='UTC';
do $fence$
begin
  if current_database() !~ '^koaptix_s1_inert_[a-z0-9_]+$'
    or inet_server_addr() is null
    or not (inet_server_addr() << inet '127.0.0.0/8' or inet_server_addr()=inet '::1')
    or to_regnamespace('koaptix_s1_qualification') is not null
  then raise exception 'isolated, unused loopback Q2 fixture database required'; end if;
  if to_regnamespace('koaptix_s1') is null
    or to_regprocedure('koaptix_s1.publish(text,smallint)') is null
    or to_regprocedure('koaptix_s1.read_evidence(text,text)') is null
  then raise exception 'install the exact approved implementation before the synthetic fixture'; end if;
  if exists(select from public.apt_complex) or exists(select from public.staging_market_raw)
    or exists(select from public.apt_market_cap_snapshot) or exists(select from public.complex_eligibility_snapshot)
    or exists(select from public.koaptix_complex_region_map)
  then raise exception 'fixture requires empty source tables, not copied application data'; end if;
end;
$fence$;

create schema koaptix_s1_qualification;
revoke all on schema koaptix_s1_qualification from public;
create table koaptix_s1_qualification.baseline_function (
  signature text primary key, source_body_sha256 text not null, source_migration text not null
);
insert into koaptix_s1_qualification.baseline_function values
 ('public.koaptix_text_array_is_distinct_nonblank(text[])','F12C5EC8AA37CE810993165F2AADA474379A959592593A80527A694223B21F33','202607310901_rank_canonical_input_contract.sql'),
 ('public.koaptix_reject_rank_input_manifest_mutation()','397B243AAB3182934B2370CF64B2ED9080919445D5E172367340373ACA2470ED','202607310901_rank_canonical_input_contract.sql'),
 ('public.koaptix_assert_rank_input_authority(text,date,jsonb)','156A1D77E935DD36EE4543538F365FD6157D57DCA0DE77C19089F73ED48A90C0','202607310903_latest_board_atomic_generation.sql'),
 ('public.koaptix_insert_latest_board_generation_packet(jsonb,text,text,text,date,text[],boolean)','9B357E313E03578157D53BB248882F90130DFDBFE039635B3A14114A07903C77','202607310903_latest_board_atomic_generation.sql'),
 ('public.koaptix_require_publication_event_pointer_commit()','2B4755D983D6C92EE09F44BD8BF4B1319B5A0403B549DECBD5B2FA90B5C96E69','202607310903_latest_board_atomic_generation.sql'),
 ('public.koaptix_reject_latest_board_immutable_mutation()','B1DE819DD18C3FFCB17B4F5280637A34A714ECDDD614530FA81DF77D327480C0','202607310903_latest_board_atomic_generation.sql'),
 ('public.koaptix_compute_rank_input_authority(date)','B3438D327AB22615883CD69D446AA6D57F1A457B5155627E0628B445FE860732','202607310904_rank_canonical_publisher_binding.sql'),
 ('public.koaptix_verify_latest_board_generation(uuid)','F07B4052FD151EA52E1EDDE71CE6B51902734A251FBCDF7538597AF8452747E6','202607310906_bootstrap_v2_compatibility_definition.sql'),
 ('public.koaptix_assert_generation_authority(uuid)','A69E3E02A25980E0B6DD87BF7824C64D50592DD3783AB11E216832B64E4D6FED','202607310906_bootstrap_v2_compatibility_definition.sql'),
 ('public.koaptix_guard_latest_board_publication_pointer()','E7551AD719E533B44F2E17A11BFA9C5E88BCBD4B131712087C475332377DE9DC','202607310906_bootstrap_v2_compatibility_definition.sql');

do $baseline$
declare x record; body text;
begin
  for x in select * from koaptix_s1_qualification.baseline_function loop
    select replace(prosrc,chr(13),'') into strict body from pg_proc where oid=x.signature::regprocedure;
    if upper(encode(sha256(convert_to(body,'UTF8')),'hex'))<>x.source_body_sha256
    then raise exception 'Q2 baseline function differs: %',x.signature; end if;
  end loop;
  if exists(select from pg_trigger where tgrelid in (
    'public.koaptix_latest_board_publication'::regclass,
    'public.koaptix_latest_board_publication_event'::regclass,
    'public.koaptix_latest_board_generation'::regclass,
    'public.koaptix_rank_input_authority_manifest'::regclass,
    'koaptix_s1.publication_slot'::regclass) and tgenabled='D')
  then raise exception 'fixture must exercise enabled implementation triggers'; end if;
  if not exists(select from pg_constraint where conrelid='koaptix_s1.publication_slot'::regclass and contype='p')
    or not exists(select from pg_constraint where conrelid='public.koaptix_latest_board_publication'::regclass
      and contype='f' and cardinality(conkey)=4)
  then raise exception 'actual slot PK/four-column pointer FK required'; end if;
end;
$baseline$;

-- Typed synthetic source rows use the accepted source schema. Jeonju/52111
-- exercises M901's nonzero Jeonbuk/52111 contract through the real M902 views.
-- Future dates make accidental confusion with failed historical dates impossible.
insert into public.region_dim(region_id,region_type,region_code,region_name_ko,full_name_ko)
  overriding system value values(900000001,'sigungu','52111','Q2 synthetic Jeonju','Q2 synthetic Jeonju');
insert into public.apt_complex(complex_id,region_id,apt_name_ko,legal_dong_name,build_year,
  total_household_count,household_count,master_source,master_status,is_active)
  overriding system value values(900000001,900000001,'Q2 synthetic complex','Q2 synthetic dong',2000,100,100,'manual','active',true);
insert into public.apt_market_cap_snapshot(snapshot_date,complex_id,market_cap_krw,total_household_count,
  priced_household_count,priced_household_ratio,total_cluster_count,priced_cluster_count,coverage_status,calculation_version)
  select d,900000001,1000000000000,100,100,1.0000,1,1,'full','v1'
  from (values(date '2099-01-01'),(date '2099-01-02'),(date '2099-01-03')) dates(d);
insert into public.complex_eligibility_snapshot(snapshot_date,complex_id,is_rank_eligible,eligibility_status,
  required_priced_household_ratio,actual_priced_household_ratio,total_household_count,priced_household_count,
  total_cluster_count,priced_cluster_count,manual_override,rule_version)
  select d,900000001,true,'eligible',0.8000,1.0000,100,100,1,1,false,'v1'
  from (values(date '2099-01-01'),(date '2099-01-02'),(date '2099-01-03')) dates(d);
insert into public.staging_market_raw(id,run_date,source_dataset,lawd_cd,sgg_cd,umd_cd,umd_nm,
  apt_nm,trade_date,deal_amount_krw,complex_id,apt_name_ko,legal_dong_name,household_count)
  select u,d,'molit_apt_trade','52111','52111','10100','Q2 synthetic dong','Q2 synthetic complex',
    d,10000000000,900000001,'Q2 synthetic complex','Q2 synthetic dong',100
  from (values(uuid '00000000-0000-4000-8000-000000000001',date '2099-01-01'),
              (uuid '00000000-0000-4000-8000-000000000002',date '2099-01-02'),
              (uuid '00000000-0000-4000-8000-000000000003',date '2099-01-03')) rows(u,d);

-- One fixture catalog records the bounded scenarios and their real harm; it is
-- not a substitute state model or a ledger used by either worker.
create table koaptix_s1_qualification.scenario (
  case_code text primary key, operation text not null, expected_result text not null, harmful_outcome text not null
);
insert into koaptix_s1_qualification.scenario values
 ('S_REPEAT','repeat actual seal with unchanged frozen plan','full stored manifest/clock equality, zero writes','duplicate or retimed daily manifest'),
 ('S_CONFLICT','same rank-input-v1 date with changed manifest meaning','BLOCK_CONFLICT','conflicting canonical source authority'),
 ('A_EQUALITY','repeat real build; then remove/alter each full-row class in a separate corrupt fixture','existing exact or BLOCK_PARTIAL/CONFLICT','partial or altered G accepted'),
 ('V_ISOLATION','use actual separate W/V logins, copied PASS and peer/owner SET ROLE attempts','permission denied; protected V-only verdict','writer forges approval or verifier publishes'),
 ('SLOT_RACE','two real sessions, same GLOBAL/U identity and competing immutable content','one committed meaning; loser exact existing/abort/conflict','two official meanings for one date'),
 ('PREDECESSOR_CAS','advance real head before submitting delayed same-plan B','BLOCK_PREDECESSOR','current publication regresses'),
 ('B_ATOMIC_CUTS','abort real B at each semantic write boundary and inspect from fresh V snapshot','all new rows roll back together','partial event/slots/official rows declared committed'),
 ('B_REPEAT','repeat actual B while current and after a later legitimate descendant','CURRENT or NOT_CURRENT; no pointer write','duplicate event or pointer rewind'),
 ('D_NO_REGRESSION','repeat real derive; change baseline/conflict row; fail D after successful B','exact existing or block; B remains published','dated output rewritten or publication lost'),
 ('DURABLE_BUDGET','actual admissions 1,2,3 including restart and lost COMMIT response','third denied; original ACK remains unknown','hidden third business invocation'),
 ('REFERENCE','actual V comparison with missing inventory/row/vector and valid complete inventory','missing/changed proof blocked; valid reference skips S/A/B/D','fabricated fresh publication or false no-change reference');

-- Fixed read-only population assertion. Q2 cut-point/concurrency tests use the
-- real implementation evidence API separately. This assertion never fakes a V
-- result and is deliberately unavailable to both runtime roles.
create function koaptix_s1_qualification.assert_source_fixture() returns void
language plpgsql set search_path=pg_catalog,public,koaptix_s1_qualification as $body$
begin
  if (select count(*) from public.apt_market_cap_snapshot where complex_id=900000001)<>3
     or (select count(*) from public.complex_eligibility_snapshot where complex_id=900000001)<>3
     or exists(select from public.apt_market_cap_snapshot where complex_id<>900000001)
     or exists(select from public.complex_eligibility_snapshot where complex_id<>900000001)
  then raise exception 'synthetic fixture population differs'; end if;
end;
$body$;
revoke all on all tables in schema koaptix_s1_qualification from public,koaptix_publication_writer,koaptix_publication_verifier;
revoke all on all functions in schema koaptix_s1_qualification from public,koaptix_publication_writer,koaptix_publication_verifier;
select koaptix_s1_qualification.assert_source_fixture();
commit;
