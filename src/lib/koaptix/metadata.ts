import type { Metadata } from "next";
import { getPublicPageComplex, getPublicPageComparison, PUBLIC_SITE_ORIGIN, publicRegionLabel } from "./publicPageData";
import { buildComparisonSharePath } from "./complexShare";

const METADATA_BASE = new URL(PUBLIC_SITE_ORIGIN);

function formatMarketCapKrw(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";

  const TRILLION = 1_000_000_000_000;
  const HUNDRED_MILLION = 100_000_000;

  if (value >= TRILLION) {
    const amount = value / TRILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}조원`;
  }

  if (value >= HUNDRED_MILLION) {
    const amount = value / HUNDRED_MILLION;
    const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
    return `${amount.toFixed(digits)}억원`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function getDefaultMetadata(): Metadata {
  const title = "KOAPTIX | 우리 아파트 순위 찾기";
  const description =
    "실제 거래와 세대수로 추정한 단지 전체의 가치와 전국·지역별 순위를 확인해 보세요. 공식 가격지수나 투자 추천이 아닌 참고 정보입니다.";

  return {
    metadataBase: METADATA_BASE,
    title,
    description,
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "KOAPTIX",
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function buildComplexMetadata(
  complexId?: string | null,
  universeCode = "KOREA_ALL",
): Promise<Metadata> {
  if (!complexId) {
    return getDefaultMetadata();
  }

  try {
    const row = await getPublicPageComplex(complexId, universeCode);
    if (!row) {
      return { ...getDefaultMetadata(), robots: { index: false, follow: true } };
    }
    universeCode = row.universe_code;

    const title = `${row.apt_name_ko} | KOAPTIX 아파트 시가총액 랭킹`;
    const description = [
      `${row.snapshot_date} 기준`,
      `${universeCode === "KOREA_ALL" ? "전국" : publicRegionLabel(universeCode)} 공개 랭킹 ${row.rank_all}위`,
      `단지 전체 추정 시가총액 ${formatMarketCapKrw(Number(row.market_cap_krw))}`,
      [row.sigungu_name, row.legal_dong_name].filter(Boolean).join(" "),
      "실거래가와 세대수로 추정한 참고 정보입니다.",
    ]
      .filter(Boolean)
      .join(" · ");

    const detailPath = `/complex/${encodeURIComponent(String(row.complex_id))}`;
    const sharePath = universeCode === "KOREA_ALL" ? detailPath : `${detailPath}?${new URLSearchParams({ universe: universeCode })}`;
    const ogImagePath = universeCode === "KOREA_ALL" ? `${detailPath}/opengraph-image?v=2` : "/opengraph-image.jpg";

    return {
      metadataBase: METADATA_BASE,
      title,
      description,
      alternates: {
        canonical: sharePath,
      },
      openGraph: {
        title,
        description,
        url: sharePath,
        siteName: "KOAPTIX",
        locale: "ko_KR",
        type: "website",
        images: [
          {
            url: ogImagePath,
            width: 1200,
            height: 630,
            alt: `${row.apt_name_ko} · ${row.snapshot_date} 기준 전국 공개 랭킹 · KOAPTIX`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImagePath],
      },
    };
  } catch {
    return { ...getDefaultMetadata(), robots: { index: false, follow: true } };
  }
}

export async function buildComparisonMetadata(ids: readonly string[], universeCode: string, sharedDate?: string): Promise<Metadata | null> {
  if (ids.length !== 2) return null;
  const facts = await getPublicPageComparison(ids[0], ids[1], universeCode);
  if (!facts) return null;
  const date = facts.publication.snapshot_date;
  const sharePath = buildComparisonSharePath(ids, universeCode, sharedDate ?? date);
  if (!sharePath) return null;
  const title = `${facts.title} | KOAPTIX 단지 비교`;
  const changed = sharedDate && sharedDate !== date ? `공유 당시 ${sharedDate} · 현재 공개 ${date} 기준. ` : "";
  const description = `${changed}${facts.scopeLabel} · ${date} 기준 · ${facts.differenceLabel} 단지 전체의 추정 가치이며 집 한 채의 가격이 아닙니다.`;
  const imagePath = `/ranking/share-image?${new URLSearchParams({ universe: universeCode, compare: ids.join(","), comparisonDate: date, publication: facts.publication.publication_event_id })}`;
  return { metadataBase: METADATA_BASE, title, description, alternates: { canonical: sharePath }, robots: { index: false, follow: true },
    openGraph: { title, description, url: sharePath, type: "website", images: [{ url: imagePath, width: 1200, height: 630, alt: `${facts.title} · ${date} 기준 단지 전체 추정 시가총액 비교` }] },
    twitter: { card: "summary_large_image", title, description, images: [imagePath] } };
}
