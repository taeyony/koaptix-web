import { tierBadgeColors } from "../../lib/formatters";

export function TierBadge({ tierCode }: { tierCode: string }) {
  const style = tierBadgeColors(tierCode);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 28,
        padding: "0 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.04em",
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {tierCode}
    </span>
  );
}
