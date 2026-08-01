-- TRACKED STAGE-4-ONLY ROLE/ACL ROLLBACK DEFINITION. DOES NOT AUTHORIZE EXECUTION.
-- Valid only after migration 900 and before any 901+ definition or recovery action/data.
-- Restores captured legacy ACLs and therefore remains permanently prohibited after later stages.

begin;

do $preconditions$
begin
  if to_regclass('public.koaptix_rank_input_authority_manifest') is not null
     or to_regclass('public.v_koaptix_rank_membership_authority_u') is not null
     or to_regclass('public.koaptix_latest_board_generation') is not null then
    raise exception 'stage-4-only rollback is prohibited after any 901+ definition';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    where granted_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    ) or member_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'all inbound and outbound recovery-role memberships must be zero';
  end if;
end;
$preconditions$;

drop policy koaptix_rank_publication_owner_select on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_insert on public.koaptix_rank_snapshot;
drop policy koaptix_rank_publication_owner_select_apt_complex on public.apt_complex;
drop policy koaptix_rank_publication_owner_select_market_cap on public.apt_market_cap_snapshot;
drop policy koaptix_rank_publication_owner_select_eligibility on public.complex_eligibility_snapshot;
drop policy koaptix_rank_publication_owner_select_region_dim on public.region_dim;

revoke select,insert on public.complex_rank_history from koaptix_rank_publication_owner;
revoke select on public.complex_rank_history from koaptix_rank_authority_owner;
revoke select,insert on public.koaptix_rank_snapshot from koaptix_rank_publication_owner;
revoke select on public.koaptix_latest_board_read_model from koaptix_rank_publication_owner;
revoke select on public.apt_market_cap_snapshot,public.complex_eligibility_snapshot,
  public.apt_complex,public.region_dim,public.koaptix_complex_region_map
  from koaptix_rank_publication_owner;
revoke select on public.v_koaptix_universe_membership_u,
  public.v_koaptix_universe_membership,
  public.v_koaptix_universe_rank_history_dynamic
  from koaptix_rank_publication_owner;

revoke all on table public.complex_rank_history from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.complex_rank_history to service_role;

revoke all on table public.koaptix_rank_snapshot from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_rank_snapshot to service_role;

revoke all on table public.koaptix_latest_board_read_model from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.koaptix_latest_board_read_model to service_role;

revoke all on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role;
revoke all on function public.sync_rank_snapshot_from_history(date)
  from public,anon,authenticated,service_role;
revoke all on function public.refresh_koaptix_latest_rank_board()
  from public,anon,authenticated,service_role;
revoke all on function public.run_daily_market_pipeline(date)
  from public,anon,authenticated,service_role;
revoke all on function public.run_daily_market_pipeline_legacy(date)
  from public,anon,authenticated,service_role;
revoke all on function public.run_koaptix_safe_finalize(date)
  from public,anon,authenticated,service_role;
grant execute on function public.append_daily_rank_history(date) to service_role;
grant execute on function public.sync_rank_snapshot_from_history(date) to service_role;
grant execute on function public.refresh_koaptix_latest_rank_board() to service_role;
grant execute on function public.run_daily_market_pipeline(date) to service_role;
grant execute on function public.run_daily_market_pipeline_legacy(date) to service_role;
grant execute on function public.run_koaptix_safe_finalize(date) to service_role;

revoke usage on schema public from koaptix_rank_authority_owner,
  koaptix_rank_publication_owner,koaptix_rank_authority_reader,
  koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
  koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
  koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

drop role koaptix_rank_authority_reader;
drop role koaptix_rank_manifest_sealer;
drop role koaptix_rank_manifest_revoker;
drop role koaptix_rank_bootstrap_seeder;
drop role koaptix_rank_generation_builder;
drop role koaptix_rank_generation_publisher;
drop role koaptix_rank_publication_rollback;
drop role koaptix_rank_authority_owner;
drop role koaptix_rank_publication_owner;

commit;
