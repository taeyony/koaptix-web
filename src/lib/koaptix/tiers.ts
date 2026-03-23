import type { RankingItem, TierBadgeData, TierStats } from "./types";

type NationalTier = {
  code: string;
  icon: TierBadgeData["icon"];
  tone: TierBadgeData["tone"];
};

function resolveNationalTier(rank: number, totalCount: number): NationalTier {
  const ssCut = Math.max(3, Math.ceil(totalCount * 0.01));
  const sCut = Math.max(10, Math.ceil(totalCount * 0.03));
  const aCut = Math.max(25, Math.ceil(totalCount * 0.1));
  const bCut = Math.max(50, Math.ceil(totalCount * 0.25));

  if (rank === 1) return { code: "SSS", icon: "👑", tone: "gold" };
  if (rank <= ssCut) return { code: "SS", icon: "👑", tone: "gold" };
  if (rank <= sCut) return { code: "S", icon: "💠", tone: "cyan" };
  if (rank <= aCut) return { code: "A", icon: "💠", tone: "cyan" };
  if (rank <= bCut) return { code: "B", icon: "⚡", tone: "steel" };
  return { code: "C", icon: "⚡", tone: "steel" };
}

function buildNationalBadge(
  rank: number,
  totalCount: number
): { badge: TierBadgeData; code: string } {
  const tier = resolveNationalTier(rank, totalCount);

  return {
    code: tier.code,
    badge: {
      key: "national",
      label: `전국 ${tier.code}`,
      icon: tier.icon,
      tone: tier.tone,
    },
  };
}

function buildLocalBadge(scopeName: string, rank: number): TierBadgeData {
  if (rank === 1) {
    return {
      key: "district",
      label: `${scopeName} 대장`,
      icon: "💠",
      tone: "cyan",
    };
  }

  if (rank <= 3) {
    return {
      key: "district",
      label: `${scopeName} 핵심`,
      icon: "⚡",
      tone: "fuchsia",
    };
  }

  if (rank <= 10) {
    return {
      key: "district",
      label: `${scopeName} 상위권`,
      icon: "⚡",
      tone: "steel",
    };
  }

  return {
    key: "district",
    label: `${scopeName} ${rank}위`,
    icon: "⚡",
    tone: "steel",
  };
}

export function decorateRankingTiers(items: RankingItem[]): RankingItem[] {
  const districtCounter = new Map<string, number>();
  const cityCounter = new Map<string, number>();
  const totalCount = Math.max(items.length, 1);

  return items.map((item, index) => {
    const nationalRank = item.rank > 0 ? item.rank : index + 1;

    const districtLabel = item.sigunguName?.trim() || "";
    const cityLabel = item.cityName?.trim() || "";

    let localRank: number | undefined;
    let cityRank: number | undefined;

    if (districtLabel) {
      localRank = (districtCounter.get(districtLabel) ?? 0) + 1;
      districtCounter.set(districtLabel, localRank);
    }

    if (cityLabel) {
      cityRank = (cityCounter.get(cityLabel) ?? 0) + 1;
      cityCounter.set(cityLabel, cityRank);
    }

    const national = buildNationalBadge(nationalRank, totalCount);

    const tierBadges: TierBadgeData[] = [national.badge];

    if (districtLabel && localRank) {
      tierBadges.push(buildLocalBadge(districtLabel, localRank));
    } else if (cityLabel && cityRank) {
      tierBadges.push({
        key: "city",
        label: `${cityLabel} ${cityRank === 1 ? "대장" : `${cityRank}위`}`,
        icon: cityRank === 1 ? "💠" : "⚡",
        tone: cityRank === 1 ? "cyan" : "steel",
      });
    }

    const tierStats: TierStats = {
      nationalRank,
      nationalTierCode: national.code,
      localRank,
      cityRank,
      districtLabel: districtLabel || undefined,
      cityLabel: cityLabel || undefined,
    };

    return {
      ...item,
      tierBadges,
      tierStats,
    };
  });
}