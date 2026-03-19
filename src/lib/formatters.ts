import type { KoaptixRankItem } from "../types/koaptix";

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatIndexValue(value: string | number | null | undefined): string {
  const num = toNumber(value);
  if (num === null) return "-";
  return num.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: string | number | null | undefined, fractionDigits = 2): string {
  const num = toNumber(value);
  if (num === null) return "-";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatSignedNumber(value: string | number | null | undefined, fractionDigits = 2): string {
  const num = toNumber(value);
  if (num === null) return "-";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatKrw(value: string | number | null | undefined): string {
  const num = toNumber(value);
  if (num === null) return "-";
  return `${Math.round(num).toLocaleString("ko-KR")}원`;
}

export function formatKrwCompact(value: string | number | null | undefined): string {
  const num = toNumber(value);
  if (num === null) return "-";

  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}조원`;
  }

  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toLocaleString("ko-KR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}억원`;
  }

  return formatKrw(num);
}

export function formatMarketCapTrillion(value: string | number | null | undefined): string {
  const num = toNumber(value);
  if (num === null) return "-";
  return `${num.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}조`;
}

export function formatRatio(value: string | number | null | undefined): string {
  const num = toNumber(value);
  if (num === null) return "-";
  return `${(num * 100).toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatMonthLabel(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "short",
  }).format(date);
}

export function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function movementColor(movement: string | null | undefined): string {
  switch (movement) {
    case "up":
      return "#ef4444";
    case "down":
      return "#2563eb";
    case "same":
    case "flat":
      return "#64748b";
    default:
      return "#f59e0b";
  }
}

export function formatRankDelta(item: Pick<KoaptixRankItem, "rank_delta_1d" | "previous_rank_all" | "rank_movement">): string {
  if (item.previous_rank_all === null) return "NEW";
  if (item.rank_delta_1d === null) return "-";
  if (item.rank_delta_1d > 0) return `▲ ${item.rank_delta_1d}`;
  if (item.rank_delta_1d < 0) return `▼ ${Math.abs(item.rank_delta_1d)}`;
  return "―";
}

export function tierBadgeColors(tierCode: string): { background: string; color: string; border: string } {
  switch (tierCode) {
    case "S":
      return { background: "#111827", color: "#f8fafc", border: "#111827" };
    case "A":
      return { background: "#dc2626", color: "#ffffff", border: "#dc2626" };
    case "B":
      return { background: "#2563eb", color: "#ffffff", border: "#2563eb" };
    case "C":
      return { background: "#16a34a", color: "#ffffff", border: "#16a34a" };
    case "D":
      return { background: "#e2e8f0", color: "#0f172a", border: "#cbd5e1" };
    default:
      return { background: "#f8fafc", color: "#334155", border: "#cbd5e1" };
  }
}
