import type { Metadata } from "next";
import { mapComplexDetailRow } from "./mappers";
import { getComplexDetailById } from "./queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://koaptix.com";
const METADATA_BASE = new URL(SITE_URL);

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

function formatWeeklyRankDelta(delta: number): string {
  if (delta > 0) return `순위 상승 +${delta}`;
  if (delta < 0) return `순위 하락 ${delta}`;
  return "순위 보합 0";
}

function formatMomentumW(value: number): string {
  if (value > 0) return `Momentum (W) +${value.toFixed(2)}%`;
  if (value < 0) return `Momentum (W) ${value.toFixed(2)}%`;
  return "Momentum (W) 0.00%";
}

function getDefaultMetadata(): Metadata {
  const title = "KOAPTIX | 전국 아파트 자본 흐름 랭킹 터미널";
  const description =
    "KOAPTIX는 단지별 추정 시가총액과 주간 변화를 기준으로 전국·지역·시군구 아파트 흐름을 보여주는 랭킹 터미널입니다.";

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
  complexId?: string | null
): Promise<Metadata> {
  if (!complexId) {
    return getDefaultMetadata();
  }

  try {
    const row = await getComplexDetailById(complexId);
    if (!row) {
      return getDefaultMetadata();
    }

    const detail = mapComplexDetailRow(row);

    const title = `${detail.name} | KOAPTIX`;
    const description = [
      `현재 #${detail.rank}`,
      `시가총액 ${formatMarketCapKrw(detail.marketCapKrw)}`,
      detail.locationLabel,
      `최근 7일 기준 ${formatWeeklyRankDelta(detail.rankDelta7d)}`,
      formatMomentumW(detail.marketCapDeltaPct7d),
    ]
      .filter(Boolean)
      .join(" · ");

    const sharePath = `/complex/${encodeURIComponent(detail.complexId)}`;
    const ogImagePath = `${sharePath}/opengraph-image`;

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
            alt: `${detail.name} KOAPTIX weekly share card`,
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
    return getDefaultMetadata();
  }
}
