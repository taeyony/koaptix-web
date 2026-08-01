-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 901: immutable canonical rank-input authority base only.
-- Membership-bound compute/seal/revoke/helper definitions remain ordered after 902/903 in migration 904.

begin;

-- Prerequisite roles are provisioned only under a separate role/grant approval:
-- Seven single-entrypoint NOLOGIN action roles are provisioned with the two
-- never-activated owner roles. Each future membership uses INHERIT FALSE.

create or replace function public.koaptix_text_array_is_distinct_nonblank(p_values text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path=pg_catalog,public
as $function$
  select cardinality(p_values)>0
     and not exists (
       select 1 from unnest(p_values) v(value)
       where value is null or btrim(value)=''
     )
     and cardinality(p_values)=(select count(distinct value) from unnest(p_values) v(value));
$function$;

create table public.koaptix_rank_input_authority_manifest (
  snapshot_date date not null,
  run_id text not null unique check (btrim(run_id)<>''),
  scope_code text not null check (scope_code = 'KOREA_FULL'),
  authority_status text not null check (authority_status = 'SEALED'),
  market_cap_snapshot_date date not null,
  eligibility_snapshot_date date not null,
  canonical_query_version text not null,
  membership_contract_version text not null,
  market_cap_source_ids text[] not null,
  eligibility_source_ids text[] not null,
  membership_source_ids text[] not null,
  expected_market_cap_rows integer not null check (expected_market_cap_rows > 0),
  expected_eligibility_rows integer not null check (expected_eligibility_rows > 0),
  expected_join_rows integer not null check (expected_join_rows > 0),
  expected_qualified_rows integer not null check (expected_qualified_rows > 0),
  expected_jeonbuk_membership_rows integer not null
    check (expected_jeonbuk_membership_rows > 0),
  expected_sgg_52111_membership_rows integer not null
    check (expected_sgg_52111_membership_rows > 0),
  expected_sgg_52111_qualified_rows integer not null
    check (expected_sgg_52111_qualified_rows > 0),
  membership_duplicate_pairs integer not null check (membership_duplicate_pairs=0),
  membership_fail_closed_qualified_rows integer not null
    check (membership_fail_closed_qualified_rows=0),
  affected_universe_codes text[] not null,
  affected_universe_manifest jsonb not null
    check (jsonb_typeof(affected_universe_manifest)='array'),
  market_cap_calculation_versions text[] not null,
  eligibility_rule_versions text[] not null,
  manual_override_allowed boolean not null,
  blocking_review_rule_version text not null,
  blocking_review_rows integer not null check (blocking_review_rows = 0),
  blocking_review_sha256 text not null check (blocking_review_sha256 ~ '^[0-9A-F]{64}$'),
  market_cap_set_sha256 text not null check (market_cap_set_sha256 ~ '^[0-9A-F]{64}$'),
  eligibility_set_sha256 text not null check (eligibility_set_sha256 ~ '^[0-9A-F]{64}$'),
  source_set_sha256 text not null check (source_set_sha256 ~ '^[0-9A-F]{64}$'),
  selected_input_sha256 text not null check (selected_input_sha256 ~ '^[0-9A-F]{64}$'),
  membership_set_sha256 text not null check (membership_set_sha256 ~ '^[0-9A-F]{64}$'),
  affected_universe_set_sha256 text not null
    check (affected_universe_set_sha256 ~ '^[0-9A-F]{64}$'),
  authority_contract_version text not null,
  sealed_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(snapshot_date,authority_contract_version),
  check (public.koaptix_text_array_is_distinct_nonblank(market_cap_calculation_versions)),
  check (public.koaptix_text_array_is_distinct_nonblank(eligibility_rule_versions)),
  check (public.koaptix_text_array_is_distinct_nonblank(market_cap_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(eligibility_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(membership_source_ids)),
  check (public.koaptix_text_array_is_distinct_nonblank(affected_universe_codes)),
  check (market_cap_snapshot_date=snapshot_date),
  check (eligibility_snapshot_date=snapshot_date),
  check (snapshot_date>date '2026-05-31'),
  check (canonical_query_version='canonical-rank-input-v1'),
  check (membership_contract_version='membership-map-first-45-52-v1'),
  check (authority_contract_version='rank-input-v1'),
  check (market_cap_source_ids=array[
    'relation:public.apt_market_cap_snapshot',
    'set-sha256:'||market_cap_set_sha256
  ]::text[]),
  check (eligibility_source_ids=array[
    'relation:public.complex_eligibility_snapshot',
    'set-sha256:'||eligibility_set_sha256
  ]::text[]),
  check (membership_source_ids=array[
    'relation:public.v_koaptix_rank_membership_authority_u',
    'relation:public.v_koaptix_universe_membership_u',
    'set-sha256:'||membership_set_sha256
  ]::text[]),
  check (blocking_review_rule_version='NO_DIRECT_RANK_REVIEW_AUTHORITY_V1'),
  check (blocking_review_sha256='4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945'),
  check (sealed_at=created_at),
  check (expected_market_cap_rows = expected_eligibility_rows),
  check (expected_market_cap_rows = expected_join_rows),
  check (expected_qualified_rows <= expected_join_rows),
  check (cardinality(affected_universe_codes)=jsonb_array_length(affected_universe_manifest))
);

revoke all on public.koaptix_rank_input_authority_manifest from public, anon, authenticated, service_role,
  koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
  koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
  koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
  koaptix_rank_publication_rollback;
grant select on public.koaptix_rank_input_authority_manifest
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;
revoke all on function public.koaptix_text_array_is_distinct_nonblank(text[])
  from public,anon,authenticated,service_role,
       koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant execute on function public.koaptix_text_array_is_distinct_nonblank(text[])
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;

create or replace function public.koaptix_reject_rank_input_manifest_mutation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $function$
begin
  raise exception 'sealed rank input manifest rows are immutable';
end;
$function$;

revoke all on function public.koaptix_reject_rank_input_manifest_mutation()
  from public,anon,authenticated,service_role;

create trigger trg_koaptix_rank_input_manifest_immutable
before update or delete on public.koaptix_rank_input_authority_manifest
for each row execute function public.koaptix_reject_rank_input_manifest_mutation();

create table public.koaptix_rank_input_manifest_revocation (
  manifest_run_id text primary key check (btrim(manifest_run_id)<>'')
    references public.koaptix_rank_input_authority_manifest(run_id),
  revocation_run_id text not null unique check (btrim(revocation_run_id)<>''),
  reason_code text not null check (btrim(reason_code)<>''),
  revoked_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (revoked_at=created_at)
);

revoke all on public.koaptix_rank_input_manifest_revocation from public,anon,authenticated,service_role,
  koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
  koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
  koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
  koaptix_rank_publication_rollback;
grant select on public.koaptix_rank_input_manifest_revocation
  to koaptix_rank_authority_owner,koaptix_rank_publication_owner;

create trigger trg_koaptix_rank_input_manifest_revocation_immutable
before update or delete on public.koaptix_rank_input_manifest_revocation
for each row execute function public.koaptix_reject_rank_input_manifest_mutation();

create view public.v_koaptix_canonical_rank_input_u as
select
  m.snapshot_date,
  m.complex_id,
  m.market_cap_krw,
  m.coverage_status,
  m.calculation_version as market_cap_calculation_version,
  e.eligibility_status,
  e.rule_version as eligibility_rule_version,
  e.manual_override
from public.apt_market_cap_snapshot m
join public.complex_eligibility_snapshot e
  on e.snapshot_date = m.snapshot_date
 and e.complex_id = m.complex_id
join public.apt_complex a
  on a.complex_id = m.complex_id
where m.market_cap_krw > 0
  and m.coverage_status = 'full'
  and e.is_rank_eligible is true
  and e.eligibility_status = 'eligible'
  and a.is_active is true
  and a.master_status = 'active'
  and a.merged_into_complex_id is null;

revoke all on public.v_koaptix_canonical_rank_input_u from public, anon, authenticated, service_role;
revoke all on public.v_koaptix_canonical_rank_input_u
  from koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;
grant select on public.v_koaptix_canonical_rank_input_u to koaptix_rank_publication_owner;

alter function public.koaptix_text_array_is_distinct_nonblank(text[])
  owner to koaptix_rank_authority_owner;
alter function public.koaptix_reject_rank_input_manifest_mutation()
  owner to koaptix_rank_authority_owner;
alter table public.koaptix_rank_input_authority_manifest
  owner to koaptix_rank_authority_owner;
alter table public.koaptix_rank_input_manifest_revocation
  owner to koaptix_rank_authority_owner;
alter view public.v_koaptix_canonical_rank_input_u
  owner to koaptix_rank_publication_owner;

-- Membership-bound compute/seal/revoke/helper functions are intentionally deferred until 902 membership and 903 generation/pointer definitions exist.

commit;
