import type { Metadata } from "next";
import Link from "next/link";
import { HomeV2Search } from "../../components/home/v2/HomeV2Search";
import { ThemeToggle } from "../../components/home/ThemeToggle";
import FormulaExplainer from "../../components/home/FormulaExplainer";
import { formatKrwCompact } from "../../lib/formatters";
import { getLatestRankBoard } from "../../lib/koaptix/queries";
import type { DbLatestRankBoardWeeklyRow } from "../../lib/koaptix/types";
import { getRankingUniverseRegistry } from "../../lib/koaptix/universes";
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

const REGION_SHORTLIST = ["SEOUL_ALL", "GYEONGGI_ALL", "BUSAN_ALL", "INCHEON_ALL", "DAEGU_ALL", "JEONBUK_ALL"];

function location(row: DbLatestRankBoardWeeklyRow) {
  return [row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" ");
}

export default async function PlayPage() {
  let rows: DbLatestRankBoardWeeklyRow[] = [];
  try {
    // Reuse the published UNIVERSE_SERVICE contract, including its uniform
    // publication/date guard. No historical, raw or mock fallback.
    rows = await getLatestRankBoard("KOREA_ALL", 5);
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
  const examples = top.slice(0, 4).map((row) => ({ name: row.apt_name_ko!, complexId: String(row.complex_id) }));
  const registry = getRankingUniverseRegistry();
  const regions = REGION_SHORTLIST.flatMap((code) => {
    const region = registry.find((item) => item.code === code && item.scope === "MACRO");
    return region ? [region] : [];
  });

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
            <HomeV2Search universeCode="KOREA_ALL" presentation="landing" examples={examples} />
          </div>
          <p className={styles.heroFoot}><span className={styles.noteDot} aria-hidden="true" /> 실제 거래와 세대수를 바탕으로, 단지 전체의 가치를 추정해요</p>
        </section>

        <section className={styles.section} aria-labelledby="play-top-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>전국 상위 단지 미리보기</p>
              <h2 id="play-top-title" className={styles.sectionTitle}>이 단지들, 어디까지 알고 있어?</h2>
              <p className={styles.scopeNote}>전국 공개 랭킹 상위 5개 단지{date ? <> · <time dateTime={date}>{date}</time> 기준</> : " · 기준일 확인 중"}</p>
            </div>
            <Link className={styles.textLink} href="/ranking?universe=KOREA_ALL">전체 랭킹 보기 <span aria-hidden="true">↗</span></Link>
          </div>
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
            <div className={styles.empty} role="status">랭킹 미리보기를 불러오지 못했어요. 위 검색창에서 궁금한 단지를 찾아보세요.</div>
          )}
          <p className={styles.scopeNote}>공개 대상 단지 안에서의 순위입니다. 전국 모든 아파트가 포함된 것은 아니며, 집 한 채의 가격이나 거주자의 자산 순위가 아닙니다.</p>
        </section>

        <section className={styles.section} aria-labelledby="play-region-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>지역별 순위 찾기</p>
              <h2 id="play-region-title" className={styles.sectionTitle}>우리 동네 대장은, 정말 그 아파트?</h2>
              <p className={styles.scopeNote}>지역을 고르면 해당 지역의 공개 랭킹으로 이동합니다.</p>
            </div>
          </div>
          <div className={styles.regions}>
            {regions.map((region, index) => (
              <Link key={region.code} href={`/ranking?universe=${region.code}`} className={styles.regionLink} prefetch={false}>
                <span className={styles.regionIndex} aria-hidden="true">0{index + 1}</span>
                <strong>{region.label.replace(/ 전체$/, "")}</strong><span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
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
          <a className={styles.primaryLink} href="#home-v2-search">우리 아파트 찾아보기 <span aria-hidden="true">↑</span></a>
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
