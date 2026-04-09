begin;

comment on table public.staging_market_raw is
  'KOAPTIX MOLIT XML raw staging. complex_id / market_cap_krw are downstream SQL wrapper 단계에서 산출됩니다.';

alter table public.staging_market_raw
  add column if not exists source_dataset text not null default 'molit-apt-trade-detail',
  add column if not exists lawd_cd text,
  add column if not exists sgg_cd text,
  add column if not exists umd_cd text,
  add column if not exists umd_nm text,
  add column if not exists apt_nm text,
  add column if not exists apt_dong text,
  add column if not exists jibun text,
  add column if not exists exclu_use_ar numeric(12,4),
  add column if not exists deal_amount_krw numeric(18,0),
  add column if not exists deal_year integer,
  add column if not exists deal_month integer,
  add column if not exists deal_day integer,
  add column if not exists trade_date date,
  add column if not exists floor integer,
  add column if not exists road_nm text,
  add column if not exists road_nm_bonbun text,
  add column if not exists road_nm_bubun text,
  add column if not exists dealing_gbn text,
  add column if not exists estate_agent_sgg_nm text,
  add column if not exists raw_item jsonb not null default '{}'::jsonb;

create index if not exists idx_staging_market_raw_trade_date
  on public.staging_market_raw (trade_date desc);

create index if not exists idx_staging_market_raw_lawd_trade_date
  on public.staging_market_raw (lawd_cd, trade_date desc);

create index if not exists idx_staging_market_raw_apt_trade_date
  on public.staging_market_raw (apt_nm, umd_nm, trade_date desc);

comment on column public.staging_market_raw.source_dataset is '원천 데이터셋 식별자 (예: molit-apt-trade-detail)';
comment on column public.staging_market_raw.lawd_cd is '국토부 API 법정동 시군구 코드';
comment on column public.staging_market_raw.sgg_cd is '시군구 코드';
comment on column public.staging_market_raw.umd_cd is '읍면동 코드';
comment on column public.staging_market_raw.umd_nm is '법정동명';
comment on column public.staging_market_raw.apt_nm is '아파트명';
comment on column public.staging_market_raw.apt_dong is '동명';
comment on column public.staging_market_raw.jibun is '지번';
comment on column public.staging_market_raw.exclu_use_ar is '전용면적';
comment on column public.staging_market_raw.deal_amount_krw is '거래금액(원). XML dealAmount * 10000 변환 결과';
comment on column public.staging_market_raw.trade_date is '거래일자 YYYY-MM-DD';
comment on column public.staging_market_raw.raw_item is '국토부 XML item 날것 원문';

commit;
