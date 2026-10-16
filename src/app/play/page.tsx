import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeV2Search } from "../../components/home/v2/HomeV2Search";
import { PlayMatchup } from "../../components/home/PlayMatchup";
import { SearchProgress } from "../../components/home/SearchProgress";
import { ThemeToggle } from "../../components/home/ThemeToggle";
import FormulaExplainer from "../../components/home/FormulaExplainer";
import { formatKrwCompact } from "../../lib/formatters";
import { getLatestRankBoard } from "../../lib/koaptix/queries";
import type { DbLatestRankBoardWeeklyRow } from "../../lib/koaptix/types";
import { getRankingUniverseRegistry } from "../../lib/koaptix/universes";
import { buildComparisonSharePath } from "../../lib/koaptix/complexShare";
import styles from "./play.module.css";

export const dynamic = "force-dynamic";

const title = "우리 아파트, 전국에서 몇 등일까? | KOAPTIX";
const description = "집값은 알아도, 우리 단지 순위는 모르잖아. 공개된 아파트 추정 시가총액 랭킹에서 우리 아파트를 찾아보세요.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/play" },
  openGraph: { title, description, url: "/play", type: "website" },
};

// Search guides, not popularity metrics or ranking data. These terms were
// checked against the existing published autocomplete on 2026-10-16.
// Keep them independent of the TOP 5 reader so a slow preview cannot hide them.
const SEARCH_EXAMPLES = [
  { name: "헬리오시티", complexId: "5084" },
  { name: "광주 현진에버빌1단지", query: "현진에버빌1단지", complexId: "170015" },
  { name: "반포동" },
  { name: "수완" },
];

function location(row: DbLatestRankBoardWeeklyRow) {
  return [row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" ");
}

async function PlayRankingPreview() {
  let rows: DbLatestRankBoardWeeklyRow[] = [];
  try {
    // Reuse the published UNIVERSE_SERVICE contract, including its uniform
    // publication/date guard. No historical, raw or mock fallback.
    // Use the reader's existing bounded timeout option only for this preview.
    rows = await getLatestRankBoard("KOREA_ALL", 5, undefined, { timeoutMs: 4000 });
  } catch {
    // Search stays available independently when the ranking seed is unavailable.
  }
  const top = rows.filter((row) =>
    /^\d+$/.test(String(row.complex_id ?? "")) &&
    Boolean(row.apt_name_ko?.trim()) &&
    Number.isInteger(row.rank_all) && Number(row.rank_all) >= 1 && Number(row.rank_all) <= 5 &&
    Number.isFinite(Number(row.market_cap_krw)) && Number(row.market_cap_krw) > 0,
  );
  const champion = top.find((row) => row.rank_all === 1);
  const remaining = top.filter((row) => row !== champion);
  const date = top[0]?.snapshot_date?.slice(0, 10) ?? null;
  const runnerUp = top.find(row => row.rank_all === 2);
  const quickMatchup = champion && runnerUp && date ? buildComparisonSharePath([String(champion.complex_id), String(runnerUp.complex_id)], "KOREA_ALL", date) : null;

  return (
    <div data-testid="play-top-preview" data-state={top.length ? "ready" : "unavailable"}>
      {date ? <p className={`${styles.scopeNote} ${styles.previewDate}`} data-testid="play-ranking-date">전국 공개 랭킹 상위 5개 단지 · <time dateTime={date}>{date}</time> 기준</p> : null}
      {top.length ? (
        <div className={styles.board}>
          {champion ? (
            <Link href={`/complex/${champion.complex_id}`} className={styles.champion} prefetch={false}>
              <div className={styles.championTop}>
                <span className={styles.rankNumber}>#{champion.rank_all}</span>
                <span className={styles.rankTag}>전국 공개 랭킹 1위</span>
              </div>
              <h3 className={styles.complexName}>{champion.apt_name_ko}</h3>
              <p className={styles.location}>{location(champion)}</p>
              <span className={styles.capLabel}>단지 전체 추정 시가총액</span>
              <strong className={styles.capValue}>{formatKrwCompact(champion.market_cap_krw)}</strong>
              <span className={styles.cardArrow}>단지 자세히 보기 <span aria-hidden="true">↗</span></span>
            </Link>
          ) : null}
          <ol className={styles.rankList} aria-label="공개 순위와 추정 시가총액">
            {remaining.map((row) => (
              <li key={String(row.complex_id)}>
                <Link href={`/complex/${row.complex_id}`} className={styles.rankRow} prefetch={false}>
                  <span className={styles.rowRank}>#{row.rank_all}</span>
                  <span><strong className={styles.rowName}>{row.apt_name_ko}</strong><span className={styles.rowLocation}>{location(row)}</span></span>
                  <strong className={styles.rowCap}><span className="sr-only">추정 시가총액 </span>{formatKrwCompact(row.market_cap_krw)}</strong>
                  <span className={styles.rowArrow} aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className={styles.empty} role="status">
          <p>랭킹 미리보기를 불러오지 못했어요. 검색창과 지역별 순위 찾기는 계속 이용할 수 있어요.</p>
          <a className={styles.textLink} href="/play#play-top-title">미리보기 다시 불러오기 ↻</a>
        </div>
      )}
      {quickMatchup ? <Link href={quickMatchup} prefetch={false} className={`${styles.textLink} mt-4 inline-flex min-h-11 items-center`}>{champion?.apt_name_ko} vs {runnerUp?.apt_name_ko} · 두 단지 바로 비교 ↗</Link> : null}
    </div>
  );
}

export default function PlayPage() {
  const regions = getRankingUniverseRegistry().filter((region) =>
    region.scope === "MACRO" && region.code !== "KOREA_ALL",
  );

  return (
    <main className={styles.page} data-testid="ranking-play-page">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="KOAPTIX 홈">
            <span className={styles.brandMark} aria-hidden="true">K.</span> KOAPTIX
          </Link>
          <nav className={styles.headerLinks} aria-label="페이지 탐색">
            <Link href="/ranking?universe=KOREA_ALL">전체 랭킹 <span aria-hidden="true">↗</span></Link>
            <ThemeToggle />
          </nav>
        </header>

        <section className={styles.hero} aria-labelledby="play-title">
          <p className={styles.eyebrow}><span className={styles.liveDot} aria-hidden="true" /> 전국 아파트 순위 찾기</p>
          <h1 id="play-title" className={styles.title}>우리 아파트,<br />전국에서 <span className={styles.titleAccent}>몇 등일까?</span></h1>
          <p className={styles.subtitle}>집값은 알아도, 우리 단지 순위는 모르잖아.</p>
          <div className={styles.searchArea}>
            <HomeV2Search universeCode="KOREA_ALL" presentation="landing" examples={SEARCH_EXAMPLES} />
          </div>
          <p className={styles.heroFoot}>실제 거래와 세대수를 바탕으로, 단지 전체의 가치를 추정해요.</p>
        </section>

        <section className={styles.section} aria-labelledby="play-top-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>전국 상위 단지 미리보기</p>
              <h2 id="play-top-title" className={styles.sectionTitle}>이 단지들, 어디까지 알고 있어?</h2>
            </div>
            <Link className={styles.textLink} href="/ranking?universe=KOREA_ALL">전체 랭킹 보기 <span aria-hidden="true">↗</span></Link>
          </div>
          <Suspense fallback={<div className={styles.previewLoading}><SearchProgress label="전국 상위 단지를 불러오고 있어요" /></div>}>
            <PlayRankingPreview />
          </Suspense>
          <p className={styles.scopeNote}>공개 대상 단지 안에서의 순위입니다. 전국 모든 아파트가 포함된 것은 아니며, 집 한 채의 가격이나 거주자의 자산 순위가 아닙니다.</p>
        </section>

        <section id="matchup" className={styles.section} aria-labelledby="play-matchup-title">
          <div className={styles.sectionHeading}><div><p className={styles.kicker}>단지 맞대결</p><h2 id="play-matchup-title" className={styles.sectionTitle}>어느 단지의 시총이 더 클까?</h2><p className={styles.scopeNote}>궁금한 두 아파트를 고르고, 결과를 친구에게 공유해 보세요.</p></div></div>
          <PlayMatchup />
        </section>

        <section className={styles.section} aria-labelledby="play-region-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>지역별 순위 찾기</p>
              <h2 id="play-region-title" className={styles.sectionTitle}>우리 동네 대장은, 정말 그 아파트?</h2>
              <p className={styles.scopeNote}>전국 {regions.length}개 시도에서 찾아보세요. 지역마다 기준일이 다를 수 있으며, 각 랭킹에 적용 날짜를 표시해요.</p>
            </div>
          </div>
          <nav className={styles.regions} aria-label="지역별 공개 랭킹">
            {regions.map((region, index) => (
              <Link key={region.code} href={`/ranking?universe=${region.code}`} className={styles.regionLink} prefetch={false}>
                <span className={styles.regionIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{region.label.replace(/ 전체$/, "")}</strong><span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
        </section>

        <aside className={styles.explainer} aria-labelledby="play-explain-title">
          <span className={styles.explainerLabel}>잠깐, 시총이 뭐야?</span>
          <div>
            <h2 id="play-explain-title" className={styles.explainerTitle}>비싼 한 채와, 큰 단지의 순위는 다르니까.</h2>
            <p className={styles.explainerCopy}>KOAPTIX는 면적별 대표가격과 세대수를 합쳐 단지 전체의 가치를 추정합니다. 집값이 높아도, 단지 시총 1위는 아닐 수 있어요.</p>
          </div>
          <FormulaExplainer title="시가총액과 순위, 어떻게 계산하나요?" triggerLabel="계산 방법 보기" className={styles.textLink} scopeSummary="현재 공개 대상 단지의 추정 시가총액 순위이며, 전국 모든 아파트를 포함하지 않습니다." />
        </aside>

        <section className={styles.finalCta}>
          <p className={styles.kicker}>우리 아파트도 찾아볼까요?</p>
          <h2 className={styles.finalTitle}>이제, 우리 아파트 차례.</h2>
          <a className={styles.primaryLink} href="#home-v2-search">검색창으로 돌아가 입력하기 <span aria-hidden="true">↑</span></a>
          <p className={styles.scopeNote}>찾은 단지는 상세 화면의 공유 버튼으로 함께 볼 수 있어요.</p>
        </section>

        <footer className={styles.footer}>
          <Link href="/" className={styles.brand}>KOAPTIX</Link>
          <p>공개 테스트 중 · 추정 시가총액은 참고 정보이며, 공식 가격지수나 투자 추천이 아닙니다.</p>
          <Link href="/ranking?universe=KOREA_ALL">전체 랭킹 보기 <span aria-hidden="true">↗</span></Link>
        </footer>
      </div>
    </main>
  );
}
