-- TRACKED DATABASE DEFINITION. DOES NOT AUTHORIZE OR EXECUTE DEPLOYMENT.
-- Migration 900: inert recovery roles, legacy-writer ACL hardening, and six owner-only RLS policies.
-- Apply only under the separately approved ROLE_GRANT_DEFINITION boundary.

begin;

-- These are new capability principals. Any pre-existing same-named role is a
-- collision and aborts the whole migration before grants or ownership changes;
-- an existing role is never adopted merely because its attributes look safe.
create role koaptix_rank_authority_owner nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_publication_owner nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_authority_reader nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_manifest_sealer nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_manifest_revoker nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_bootstrap_seeder nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_generation_builder nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_generation_publisher nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
create role koaptix_rank_publication_rollback nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;

do $block$
begin
  if exists (
    select 1 from pg_catalog.pg_roles
    where rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
      and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit
        or rolreplication or rolbypassrls)
  ) then
    raise exception 'rank recovery prerequisite role has unsafe attributes';
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
    )
       or member_role.rolname in (
         'koaptix_rank_authority_owner','koaptix_rank_publication_owner',
         'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
         'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
         'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
         'koaptix_rank_publication_rollback'
       )
  ) then
    raise exception 'rank recovery roles must have zero inbound and outbound memberships at definition deployment';
  end if;
end;
$block$;

grant usage on schema public to koaptix_rank_authority_owner,
  koaptix_rank_publication_owner,koaptix_rank_authority_reader,
  koaptix_rank_manifest_sealer,koaptix_rank_manifest_revoker,
  koaptix_rank_bootstrap_seeder,koaptix_rank_generation_builder,
  koaptix_rank_generation_publisher,koaptix_rank_publication_rollback;

-- Remove every observed broad helper route from service_role before a new
-- canonical definition can be activated. No replacement helper is executed.
revoke execute on function public.append_daily_rank_history(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.sync_rank_snapshot_from_history(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.refresh_koaptix_latest_rank_board()
  from public,anon,authenticated,service_role;
revoke execute on function public.run_daily_market_pipeline(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.run_daily_market_pipeline_legacy(date)
  from public,anon,authenticated,service_role;
revoke execute on function public.run_koaptix_safe_finalize(date)
  from public,anon,authenticated,service_role;

-- Remove every direct mutation-capable privilege from all application roles on
-- the three observed legacy write surfaces. This is load-bearing because history
-- and the physical read model have RLS disabled. Application SELECT is unchanged.
revoke insert,update,delete,truncate,references,trigger
  on public.complex_rank_history from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger
  on public.koaptix_rank_snapshot from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger
  on public.koaptix_latest_board_read_model from public,anon,authenticated,service_role;

-- Each action role is execute-only for exactly one entrypoint and receives no
-- direct table privilege. The per-membership INHERIT FALSE option additionally
-- prevents use before the approved connection executes SET ROLE.
revoke all on public.complex_rank_history,public.koaptix_rank_snapshot,
  public.koaptix_latest_board_read_model
  from koaptix_rank_authority_reader,koaptix_rank_manifest_sealer,
       koaptix_rank_manifest_revoker,koaptix_rank_bootstrap_seeder,
       koaptix_rank_generation_builder,koaptix_rank_generation_publisher,
       koaptix_rank_publication_rollback;

-- Only the never-activated SECURITY DEFINER owner can touch existing source
-- tables. Operational roles are not members of either owner role.
grant select,insert on public.complex_rank_history to koaptix_rank_publication_owner;
grant select on public.complex_rank_history to koaptix_rank_authority_owner;
grant select,insert on public.koaptix_rank_snapshot to koaptix_rank_publication_owner;
grant select on public.koaptix_latest_board_read_model to koaptix_rank_publication_owner;
grant select on public.apt_market_cap_snapshot,public.complex_eligibility_snapshot,
  public.apt_complex,public.region_dim,public.koaptix_complex_region_map
  to koaptix_rank_publication_owner;
grant select on public.v_koaptix_universe_membership_u,
  public.v_koaptix_universe_membership,
  public.v_koaptix_universe_rank_history_dynamic
  to koaptix_rank_publication_owner;

-- koaptix_rank_snapshot has RLS enabled and fresh evidence found no policies.
-- These narrowly named policies make only the never-login SECURITY DEFINER owner
-- usable; all seven action roles and application roles remain without DML.
create policy koaptix_rank_publication_owner_select
  on public.koaptix_rank_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_insert
  on public.koaptix_rank_snapshot for insert
  to koaptix_rank_publication_owner with check (true);

-- Four canonical source tables also have RLS enabled with zero current policies.
-- The never-login publication owner receives SELECT-only policies so its reviewed
-- SECURITY DEFINER compute/build entrypoints can see the canonical rows.
create policy koaptix_rank_publication_owner_select_apt_complex
  on public.apt_complex for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_market_cap
  on public.apt_market_cap_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_eligibility
  on public.complex_eligibility_snapshot for select
  to koaptix_rank_publication_owner using (true);
create policy koaptix_rank_publication_owner_select_region_dim
  on public.region_dim for select
  to koaptix_rank_publication_owner using (true);

-- None of the nine NOLOGIN roles is granted to a login principal here. Any action
-- role membership or SET LOCAL ROLE path requires a later exact approval.

do $assertions$
declare
  v_role text;
  v_table text;
  v_privilege text;
  v_column record;
begin
  foreach v_role in array array[
    'anon','authenticated','service_role',
    'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
    'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
    'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
    'koaptix_rank_publication_rollback'
  ] loop
    foreach v_table in array array[
      'public.complex_rank_history','public.koaptix_rank_snapshot',
      'public.koaptix_latest_board_read_model'
    ] loop
      foreach v_privilege in array array[
        'INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] loop
        if has_table_privilege(v_role,v_table,v_privilege) then
          raise exception 'effective write privilege remains: role %, table %, privilege %',
            v_role,v_table,v_privilege;
        end if;
      end loop;
      for v_column in
        select a.attname
        from pg_catalog.pg_attribute a
        where a.attrelid=v_table::regclass
          and a.attnum>0 and not a.attisdropped
      loop
        foreach v_privilege in array array['INSERT','UPDATE','REFERENCES'] loop
          if has_column_privilege(v_role,v_table,v_column.attname,v_privilege) then
            raise exception 'effective column write privilege remains: role %, table %, column %, privilege %',
              v_role,v_table,v_column.attname,v_privilege;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  if exists (
    select 1 from pg_catalog.pg_auth_members am
    join pg_catalog.pg_roles granted_role on granted_role.oid=am.roleid
    join pg_catalog.pg_roles member_role on member_role.oid=am.member
    where granted_role.rolname in (
      'koaptix_rank_authority_owner','koaptix_rank_publication_owner'
    ) and member_role.rolname in (
      'koaptix_rank_authority_reader','koaptix_rank_manifest_sealer',
      'koaptix_rank_manifest_revoker','koaptix_rank_bootstrap_seeder',
      'koaptix_rank_generation_builder','koaptix_rank_generation_publisher',
      'koaptix_rank_publication_rollback'
    )
  ) then
    raise exception 'action role must not be a SECURITY DEFINER owner member';
  end if;

  if exists (
    with recursive funcs as (
      select p.oid,p.proname,p.prosecdef,
             lower(pg_get_functiondef(p.oid)) as body
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname not in ('pg_catalog','information_schema')
        and n.nspname not like 'pg_toast%'
        and p.prokind in ('f','p')
    ), direct_or_dynamic_rank_writers as (
      select f.oid
      from funcs f
      where (
        f.body ~ '(insert[[:space:]]+into|merge[[:space:]]+into|update|delete[[:space:]]+from|truncate|execute)'
        and f.body ~ '(complex_rank_history|koaptix_rank_snapshot|koaptix_latest_board_read_model)'
      ) or (
        f.prosecdef and f.body ~ '\mexecute\M'
        and f.body ~ '(rank|snapshot|latest_board|market_pipeline)'
      )
    ), writer_closure(oid) as (
      select oid from direct_or_dynamic_rank_writers
      union
      select caller.oid
      from funcs caller
      join funcs callee
        on caller.body ~ (
          '(^|[^a-z0-9_])'||lower(callee.proname)||'[[:space:]]*\('
        )
      join writer_closure prior on prior.oid=callee.oid
    )
    select 1
    from writer_closure w
    where has_function_privilege('anon',w.oid,'EXECUTE')
       or has_function_privilege('authenticated',w.oid,'EXECUTE')
       or has_function_privilege('service_role',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_authority_reader',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_manifest_sealer',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_manifest_revoker',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_bootstrap_seeder',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_generation_builder',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_generation_publisher',w.oid,'EXECUTE')
       or has_function_privilege('koaptix_rank_publication_rollback',w.oid,'EXECUTE')
  ) then
    raise exception 'an effective direct, dynamic or nested executable rank writer remains';
  end if;
end;
$assertions$;

commit;
