import type { TierBadgeData } from "../../lib/koaptix/types";

function getToneClass(tone: TierBadgeData["tone"]) {
  switch (tone) {
    case "gold":
      return "border-amber-300/25 bg-amber-300/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.18)]";
    case "cyan":
      return "border-cyan-300/25 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]";
    case "fuchsia":
      return "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-100 shadow-[0_0_18px_rgba(232,121,249,0.18)]";
    case "steel":
    default:
      return "border-white/10 bg-white/[0.04] text-white/75";
  }
}

export function TierBadge({
  badge,
  compact = false,
}: {
  badge: TierBadgeData;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-[0.16em] ${getToneClass(
        badge.tone
      )} ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"}`}
      title={badge.label}
    >
      <span aria-hidden="true">{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}