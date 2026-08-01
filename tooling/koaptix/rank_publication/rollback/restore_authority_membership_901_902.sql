-- TRACKED STAGE-5-ONLY AUTHORITY/MEMBERSHIP ROLLBACK DEFINITION. DOES NOT AUTHORIZE EXECUTION.
-- Valid only while 901/902 authority tables are empty, no recovery-role membership exists, and 903+ is absent.
-- Stage-4 role/ACL hardening and its six RLS policies intentionally remain in force.

begin;

do $preconditions$
begin
  if to_regclass('public.koaptix_latest_board_generation') is not null
     or to_regclass('public.v_koaptix_home_public_service_payload_published') is not null
     or to_regprocedure('public.koaptix_compute_rank_input_authority(date)') is not null
     or to_regprocedure('public.koaptix_seal_rank_input_manifest(jsonb)') is not null
     or to_regprocedure('public.koaptix_revoke_rank_input_manifest(jsonb)') is not null then
    raise exception 'stage-5-only rollback is prohibited after any 903/904/905 definition';
  end if;
  -- The two compatibility views are the only planned dependents of the shared
  -- 902 authority view at this rollback boundary.  CREATE OR REPLACE below
  -- detaches them before the authority view is dropped; any third dependent is
  -- an unreviewed later definition and must stop the stage-specific rollback.
  if exists (
    select 1
    from pg_catalog.pg_depend d
    join pg_catalog.pg_rewrite rw on rw.oid=d.objid
    join pg_catalog.pg_class dependent on dependent.oid=rw.ev_class
    join pg_catalog.pg_namespace dependent_ns
      on dependent_ns.oid=dependent.relnamespace
    where d.refobjid='public.v_koaptix_rank_membership_authority_u'::regclass
      and dependent.oid<>d.refobjid
      and not (
        dependent_ns.nspname='public'
        and dependent.relname in (
          'v_koaptix_universe_membership',
          'v_koaptix_universe_membership_u'
        )
      )
  ) then
    raise exception 'stage-5-only rollback found an unexpected membership-authority dependent';
  end if;
  if exists (select 1 from public.koaptix_rank_input_authority_manifest)
     or exists (select 1 from public.koaptix_rank_input_manifest_revocation) then
    raise exception 'stage-5-only rollback requires empty authority tables';
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

-- Restore the dependent compatibility view first, then its _u source.
create or replace view public.v_koaptix_universe_membership as
 WITH base AS (
         SELECT r.complex_id,
            NULLIF(r.lawd_cd, ''::text) AS lawd_cd,
            NULLIF(r.sgg_cd, ''::text) AS sgg_cd,
            NULLIF(r.sigungu_name, ''::text) AS sigungu_name,
            NULLIF(r.umd_nm, ''::text) AS umd_nm,
            "left"(NULLIF(r.lawd_cd, ''::text), 2) AS sido_prefix,
            COALESCE(NULLIF(r.sgg_cd, ''::text), "left"(NULLIF(r.lawd_cd, ''::text), 5)) AS normalized_sgg_cd
           FROM v_koaptix_complex_region_resolved r
        ), metro AS (
         SELECT base.complex_id,
                CASE base.sido_prefix
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '27'::text THEN 'DAEGU_ALL'::text
                    WHEN '28'::text THEN 'INCHEON_ALL'::text
                    WHEN '29'::text THEN 'GWANGJU_ALL'::text
                    WHEN '30'::text THEN 'DAEJEON_ALL'::text
                    WHEN '31'::text THEN 'ULSAN_ALL'::text
                    WHEN '36'::text THEN 'SEJONG_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    WHEN '42'::text THEN 'GANGWON_ALL'::text
                    WHEN '43'::text THEN 'CHUNGBUK_ALL'::text
                    WHEN '44'::text THEN 'CHUNGNAM_ALL'::text
                    WHEN '45'::text THEN 'JEONBUK_ALL'::text
                    WHEN '46'::text THEN 'JEONNAM_ALL'::text
                    WHEN '47'::text THEN 'GYEONGBUK_ALL'::text
                    WHEN '48'::text THEN 'GYEONGNAM_ALL'::text
                    WHEN '50'::text THEN 'JEJU_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE base.sido_prefix
                    WHEN '11'::text THEN '서울 전체'::text
                    WHEN '26'::text THEN '부산 전체'::text
                    WHEN '27'::text THEN '대구 전체'::text
                    WHEN '28'::text THEN '인천 전체'::text
                    WHEN '29'::text THEN '광주 전체'::text
                    WHEN '30'::text THEN '대전 전체'::text
                    WHEN '31'::text THEN '울산 전체'::text
                    WHEN '36'::text THEN '세종 전체'::text
                    WHEN '41'::text THEN '경기 전체'::text
                    WHEN '42'::text THEN '강원 전체'::text
                    WHEN '43'::text THEN '충북 전체'::text
                    WHEN '44'::text THEN '충남 전체'::text
                    WHEN '45'::text THEN '전북 전체'::text
                    WHEN '46'::text THEN '전남 전체'::text
                    WHEN '47'::text THEN '경북 전체'::text
                    WHEN '48'::text THEN '경남 전체'::text
                    WHEN '50'::text THEN '제주 전체'::text
                    ELSE NULL::text
                END AS universe_name,
            1 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.sido_prefix IS NOT NULL
        ), sgg AS (
         SELECT base.complex_id,
            'SGG_'::text || base.normalized_sgg_cd AS universe_code,
            COALESCE(base.sigungu_name, '시군구 미상'::text) AS universe_name,
            2 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.normalized_sgg_cd IS NOT NULL
        ), all_rows AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '대한민국 전체'::text AS universe_name,
            0 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
        UNION ALL
         SELECT metro.complex_id,
            metro.universe_code,
            metro.universe_name,
            metro.universe_level,
            metro.lawd_cd,
            metro.sgg_cd,
            metro.sigungu_name,
            metro.umd_nm
           FROM metro
          WHERE metro.universe_code IS NOT NULL
        UNION ALL
         SELECT sgg.complex_id,
            sgg.universe_code,
            sgg.universe_name,
            sgg.universe_level,
            sgg.lawd_cd,
            sgg.sgg_cd,
            sgg.sigungu_name,
            sgg.umd_nm
           FROM sgg
        )
 SELECT DISTINCT ON (complex_id, universe_code) complex_id,
    universe_code,
    universe_name,
    universe_level,
    lawd_cd,
    sgg_cd,
    sigungu_name,
    umd_nm
   FROM all_rows
  ORDER BY complex_id, universe_code;;
alter view public.v_koaptix_universe_membership owner to postgres;
revoke all on table public.v_koaptix_universe_membership from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership to service_role;

create or replace view public.v_koaptix_universe_membership_u as
 WITH base AS (
         SELECT v_koaptix_complex_region_resolved_u.complex_id,
            v_koaptix_complex_region_resolved_u.lawd_cd,
            v_koaptix_complex_region_resolved_u.sgg_cd,
            v_koaptix_complex_region_resolved_u.sigungu_name,
            v_koaptix_complex_region_resolved_u.legal_dong_name
           FROM v_koaptix_complex_region_resolved_u
        ), membership AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '전국'::text AS universe_name,
            'NATION'::text AS universe_scope
           FROM base
        UNION ALL
         SELECT base.complex_id,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN '서울'::text
                    WHEN '26'::text THEN '부산'::text
                    WHEN '41'::text THEN '경기'::text
                    ELSE NULL::text
                END AS universe_name,
            'PROVINCE'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2) = ANY (ARRAY['11'::text, '26'::text, '41'::text])
        UNION ALL
         SELECT base.complex_id,
            'SGG_'::text || "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) AS universe_code,
            COALESCE(base.sigungu_name, "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5)) AS universe_name,
            'SGG'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) <> ''::text
        )
 SELECT DISTINCT complex_id,
    universe_code,
    universe_name,
    universe_scope
   FROM membership
  WHERE universe_code IS NOT NULL;;
alter view public.v_koaptix_universe_membership_u owner to postgres;
revoke all on table public.v_koaptix_universe_membership_u from public,anon,authenticated,service_role;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to anon;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to authenticated;
grant delete,insert,references,select,trigger,truncate,update on table public.v_koaptix_universe_membership_u to service_role;

drop view public.v_koaptix_rank_membership_authority_u;

do $post_membership_restore$
declare
  v_name text;
begin
  if to_regclass('public.v_koaptix_rank_membership_authority_u') is not null then
    raise exception 'new membership authority view survived rollback';
  end if;
  if pg_get_viewdef('public.v_koaptix_universe_membership'::regclass, true)
       is distinct from $captured_membership$ WITH base AS (
         SELECT r.complex_id,
            NULLIF(r.lawd_cd, ''::text) AS lawd_cd,
            NULLIF(r.sgg_cd, ''::text) AS sgg_cd,
            NULLIF(r.sigungu_name, ''::text) AS sigungu_name,
            NULLIF(r.umd_nm, ''::text) AS umd_nm,
            "left"(NULLIF(r.lawd_cd, ''::text), 2) AS sido_prefix,
            COALESCE(NULLIF(r.sgg_cd, ''::text), "left"(NULLIF(r.lawd_cd, ''::text), 5)) AS normalized_sgg_cd
           FROM v_koaptix_complex_region_resolved r
        ), metro AS (
         SELECT base.complex_id,
                CASE base.sido_prefix
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '27'::text THEN 'DAEGU_ALL'::text
                    WHEN '28'::text THEN 'INCHEON_ALL'::text
                    WHEN '29'::text THEN 'GWANGJU_ALL'::text
                    WHEN '30'::text THEN 'DAEJEON_ALL'::text
                    WHEN '31'::text THEN 'ULSAN_ALL'::text
                    WHEN '36'::text THEN 'SEJONG_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    WHEN '42'::text THEN 'GANGWON_ALL'::text
                    WHEN '43'::text THEN 'CHUNGBUK_ALL'::text
                    WHEN '44'::text THEN 'CHUNGNAM_ALL'::text
                    WHEN '45'::text THEN 'JEONBUK_ALL'::text
                    WHEN '46'::text THEN 'JEONNAM_ALL'::text
                    WHEN '47'::text THEN 'GYEONGBUK_ALL'::text
                    WHEN '48'::text THEN 'GYEONGNAM_ALL'::text
                    WHEN '50'::text THEN 'JEJU_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE base.sido_prefix
                    WHEN '11'::text THEN '서울 전체'::text
                    WHEN '26'::text THEN '부산 전체'::text
                    WHEN '27'::text THEN '대구 전체'::text
                    WHEN '28'::text THEN '인천 전체'::text
                    WHEN '29'::text THEN '광주 전체'::text
                    WHEN '30'::text THEN '대전 전체'::text
                    WHEN '31'::text THEN '울산 전체'::text
                    WHEN '36'::text THEN '세종 전체'::text
                    WHEN '41'::text THEN '경기 전체'::text
                    WHEN '42'::text THEN '강원 전체'::text
                    WHEN '43'::text THEN '충북 전체'::text
                    WHEN '44'::text THEN '충남 전체'::text
                    WHEN '45'::text THEN '전북 전체'::text
                    WHEN '46'::text THEN '전남 전체'::text
                    WHEN '47'::text THEN '경북 전체'::text
                    WHEN '48'::text THEN '경남 전체'::text
                    WHEN '50'::text THEN '제주 전체'::text
                    ELSE NULL::text
                END AS universe_name,
            1 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.sido_prefix IS NOT NULL
        ), sgg AS (
         SELECT base.complex_id,
            'SGG_'::text || base.normalized_sgg_cd AS universe_code,
            COALESCE(base.sigungu_name, '시군구 미상'::text) AS universe_name,
            2 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
          WHERE base.normalized_sgg_cd IS NOT NULL
        ), all_rows AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '대한민국 전체'::text AS universe_name,
            0 AS universe_level,
            base.lawd_cd,
            base.normalized_sgg_cd AS sgg_cd,
            base.sigungu_name,
            base.umd_nm
           FROM base
        UNION ALL
         SELECT metro.complex_id,
            metro.universe_code,
            metro.universe_name,
            metro.universe_level,
            metro.lawd_cd,
            metro.sgg_cd,
            metro.sigungu_name,
            metro.umd_nm
           FROM metro
          WHERE metro.universe_code IS NOT NULL
        UNION ALL
         SELECT sgg.complex_id,
            sgg.universe_code,
            sgg.universe_name,
            sgg.universe_level,
            sgg.lawd_cd,
            sgg.sgg_cd,
            sgg.sigungu_name,
            sgg.umd_nm
           FROM sgg
        )
 SELECT DISTINCT ON (complex_id, universe_code) complex_id,
    universe_code,
    universe_name,
    universe_level,
    lawd_cd,
    sgg_cd,
    sigungu_name,
    umd_nm
   FROM all_rows
  ORDER BY complex_id, universe_code;$captured_membership$ then
    raise exception 'legacy membership compatibility view definition was not restored exactly';
  end if;
  if pg_get_viewdef('public.v_koaptix_universe_membership_u'::regclass, true)
       is distinct from $captured_membership_u$ WITH base AS (
         SELECT v_koaptix_complex_region_resolved_u.complex_id,
            v_koaptix_complex_region_resolved_u.lawd_cd,
            v_koaptix_complex_region_resolved_u.sgg_cd,
            v_koaptix_complex_region_resolved_u.sigungu_name,
            v_koaptix_complex_region_resolved_u.legal_dong_name
           FROM v_koaptix_complex_region_resolved_u
        ), membership AS (
         SELECT base.complex_id,
            'KOREA_ALL'::text AS universe_code,
            '전국'::text AS universe_name,
            'NATION'::text AS universe_scope
           FROM base
        UNION ALL
         SELECT base.complex_id,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN 'SEOUL_ALL'::text
                    WHEN '26'::text THEN 'BUSAN_ALL'::text
                    WHEN '41'::text THEN 'GYEONGGI_ALL'::text
                    ELSE NULL::text
                END AS universe_code,
                CASE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2)
                    WHEN '11'::text THEN '서울'::text
                    WHEN '26'::text THEN '부산'::text
                    WHEN '41'::text THEN '경기'::text
                    ELSE NULL::text
                END AS universe_name,
            'PROVINCE'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.lawd_cd, base.sgg_cd, ''::text), 2) = ANY (ARRAY['11'::text, '26'::text, '41'::text])
        UNION ALL
         SELECT base.complex_id,
            'SGG_'::text || "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) AS universe_code,
            COALESCE(base.sigungu_name, "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5)) AS universe_name,
            'SGG'::text AS universe_scope
           FROM base
          WHERE "left"(COALESCE(base.sgg_cd, base.lawd_cd, ''::text), 5) <> ''::text
        )
 SELECT DISTINCT complex_id,
    universe_code,
    universe_name,
    universe_scope
   FROM membership
  WHERE universe_code IS NOT NULL;$captured_membership_u$ then
    raise exception 'membership _u compatibility view definition was not restored exactly';
  end if;

  foreach v_name in array array[
    'v_koaptix_universe_membership',
    'v_koaptix_universe_membership_u'
  ] loop
    if (select viewowner from pg_catalog.pg_views
        where schemaname='public' and viewname=v_name) is distinct from 'postgres' then
      raise exception 'restored view % owner mismatch', v_name;
    end if;
    if exists (
      with expected(grantee, privilege_type, is_grantable) as (
        -- aclexplode reports stored grant-option bits. Ownership confers grant
        -- authority separately; acldefault does not encode those bits as true.
        select g, p, false
        from unnest(array['postgres','anon','authenticated','service_role']) as g
        cross join unnest(array[
          'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
        ]) as p
        union all
        select 'koaptix_rank_publication_owner','SELECT',false
      ), actual as (
        select case when x.grantee=0 then 'PUBLIC' else grantee.rolname end,
               upper(x.privilege_type), x.is_grantable
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
        left join pg_catalog.pg_roles grantee on grantee.oid=x.grantee
        where n.nspname='public' and c.relname=v_name
          -- PG17 may materialize owner-only MAINTAIN in acldefault/relacl even
          -- though information_schema exposes only the seven SQL privileges.
          -- Normalize only that owner/catalog artifact; MAINTAIN for any other
          -- grantee (including PUBLIC) remains in actual and fails exactness.
          and not (x.grantee=c.relowner and upper(x.privilege_type)='MAINTAIN')
      )
      (select * from expected except select * from actual)
      union all
      (select * from actual except select * from expected)
    ) then
      raise exception 'restored view % ACL mismatch', v_name;
    end if;
  end loop;
end;
$post_membership_restore$;

drop view public.v_koaptix_canonical_rank_input_u;
drop table public.koaptix_rank_input_manifest_revocation;
drop table public.koaptix_rank_input_authority_manifest;
drop function public.koaptix_reject_rank_input_manifest_mutation();
drop function public.koaptix_text_array_is_distinct_nonblank(text[]);

commit;
