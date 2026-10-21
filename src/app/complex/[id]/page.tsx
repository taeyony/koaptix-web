import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildComplexMetadata } from "../../../lib/koaptix/metadata";
import { getPublicPageComplex, publicRegionLabel } from "../../../lib/koaptix/publicPageData";
import { resolveUniverseRequest } from "../../../lib/koaptix/universes";
import { formatKrwCompact } from "../../../lib/formatters";
import FormulaExplainer from "../../../components/home/FormulaExplainer";
import { ThemeToggle } from "../../../components/home/ThemeToggle";
import { MyHomeActions } from "../../../components/home/MyHomeActions";
import { getComparisonStartPath, publicRankScopeLabel } from "../../../lib/koaptix/comparisonFacts";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: Promise<{ universe?: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const query = await searchParams;
  return buildComplexMetadata(resolvedParams.id, query.universe ?? "KOREA_ALL");
}

export default async function ComplexSharePage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: Promise<{ universe?: string }>;
}) {
  const resolvedParams = await params;
  const query = await searchParams;
  if (!/^[1-9]\d*$/.test(resolvedParams.id)) notFound();
  const scope = resolveUniverseRequest(query.universe ?? null, { capability: "ranking" });
  const code = scope.requestedUniverseCode;
  const row = await getPublicPageComplex(resolvedParams.id, code);
  const detailHref = `/ranking?${new URLSearchParams({ universe: code, complexId: resolvedParams.id })}`;
  const households = Number(row?.household_count);
  const comparisonHref = row ? getComparisonStartPath(row) : null;
  return <main className="min-h-screen bg-[var(--ko-bg)] px-4 py-6 text-ink sm:px-8" data-testid="public-complex-page">
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ko-border)] pb-5">
        <Link href="/" className="text-xl font-bold">KOAPTIX</Link><ThemeToggle />
      </header>
      <article className="py-10" data-testid="public-complex-summary">
        <p className="text-control font-semibold text-accent">{publicRegionLabel(code)} · 공개 아파트 랭킹</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">{row?.apt_name_ko ?? "공개 순위를 확인하지 못했어요"}</h1>
        {row ? <>
          <p className="mt-4 text-body text-muted">{[row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" ")} · <time dateTime={row.snapshot_date}>{row.snapshot_date} 기준</time></p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[{ label: publicRankScopeLabel(row.universe_code), value: `${Number(row.rank_all).toLocaleString("ko-KR")}위`, date: row.snapshot_date },
              { label: "단지 전체 추정 시가총액", value: formatKrwCompact(row.market_cap_krw) },
              { label: "세대수", value: Number.isSafeInteger(households) && households > 0 ? `${households.toLocaleString("ko-KR")}세대` : <Link href={detailHref} prefetch={false} className="ko-text-link text-body text-accent" aria-label="세대수 상세 정보에서 확인">상세 정보에서 확인 ↗</Link> }].map(metric =>
                <div key={metric.label} className="rounded-2xl border border-[var(--ko-border)] bg-surface p-5"><dt className="text-control text-muted">{metric.label}</dt><dd className="mt-3 text-2xl font-bold tabular-nums">{metric.value}</dd>{metric.date ? <dd className="mt-2 text-caption text-muted"><time dateTime={metric.date}>{metric.date}</time> 기준</dd> : null}</div>)}
          </dl>
          <MyHomeActions complexId={resolvedParams.id} name={row.apt_name_ko ?? "내 아파트"} locationLabel={[row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" ")} universeCode={code} publication={row} />
          {comparisonHref ? <Link href={comparisonHref} prefetch={false} className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-[var(--ko-border)] bg-[var(--ko-accent-soft)] px-5 font-semibold text-accent">이 단지와 비교하기</Link>
            : <p className="mt-5 text-caption text-muted">공개 순위·지역·기준일이 확인된 단지만 비교할 수 있어요.</p>}
          <p className="mt-6 max-w-copy text-body leading-copy text-muted">실제 거래와 면적별 세대수를 바탕으로 계산한 단지 전체의 추정 가치예요. 집 한 채의 가격이나 실제 자금 유입액을 뜻하지 않습니다.</p>
          <div className="mt-6"><FormulaExplainer /></div>
        </> : <p role="status" className="mt-5 text-body leading-copy text-muted">{scope.universeUnavailable ? "이 지역의 랭킹은 아직 공개되지 않았어요." : "현재 선택한 지역의 공개 TOP1000에서 순위와 시가총액을 확인하지 못했어요. 랭킹 검색에서 단지 상태를 확인해 주세요."}</p>}
        {!scope.universeUnavailable ? <Link href={detailHref} className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-[var(--ko-accent-soft)] px-5 font-semibold text-accent">{row ? "시총 변화 차트·상세 정보 보기 ↗" : "랭킹에서 단지 상태 확인 ↗"}</Link> : null}
        <nav className="mt-8 flex flex-wrap gap-5 text-control text-accent" aria-label="단지 페이지 탐색"><Link className="ko-text-link" href="/play">다른 아파트 찾기</Link>{!scope.universeUnavailable ? <Link className="ko-text-link" href={`/ranking?${new URLSearchParams({ universe: code })}`}>{publicRegionLabel(code)} 랭킹 전체 보기</Link> : null}</nav>
        <p className="mt-10 text-caption leading-copy text-muted">공개 테스트 중 · 추정 시가총액과 순위는 참고 정보이며, 공식 가격지수나 투자 추천이 아닙니다.</p>
      </article>
    </div>
  </main>;
}
