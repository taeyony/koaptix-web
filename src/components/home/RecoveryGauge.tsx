type RecoveryGaugeProps = {
  recoveryRate: number | null | undefined;
  compact?: boolean;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function formatGap(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  if (value > 100) return `+${(value - 100).toFixed(1)}%`;
  if (value < 100) return `-${(100 - value).toFixed(1)}%`;
  return "0.0%";
}

function getRecoveryState(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return {
      signal: "NO DATA",
      hint: "52주 고점 데이터 대기",
      shellClass: "border-white/10 bg-white/[0.03]",
      accentClass: "text-white/55",
      fillClass: "from-white/30 to-white/20",
      glow: "0 0 14px rgba(255,255,255,0.12)",
      pulseClass: "bg-white/30",
    };
  }

  if (value >= 100) {
    return {
      signal: "ALL-TIME HIGH",
      hint: `${formatGap(value)} breakout`,
      shellClass:
        "border-amber-300/20 bg-gradient-to-r from-cyan-300/[0.08] via-cyan-300/[0.04] to-amber-300/[0.10]",
      accentClass: "text-amber-100",
      fillClass: "from-cyan-300 via-amber-300 to-amber-200",
      glow: "0 0 18px rgba(251,191,36,0.30)",
      pulseClass: "bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.55)]",
    };
  }

  if (value >= 80) {
    return {
      signal: "RECOVERING",
      hint: `${formatGap(value)} to high`,
      shellClass:
        "border-emerald-300/18 bg-emerald-300/[0.07]",
      accentClass: "text-emerald-100",
      fillClass: "from-emerald-400 via-emerald-300 to-cyan-300",
      glow: "0 0 18px rgba(52,211,153,0.24)",
      pulseClass: "bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.45)]",
    };
  }

  return {
    signal: "DISCOUNTED",
    hint: `${formatGap(value)} to high`,
    shellClass:
      "border-fuchsia-400/18 bg-fuchsia-400/[0.08]",
    accentClass: "text-fuchsia-100",
    fillClass: "from-fuchsia-500 via-fuchsia-400 to-rose-400",
    glow: "0 0 18px rgba(232,121,249,0.26)",
    pulseClass: "bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.45)]",
  };
}

export function RecoveryGauge({
  recoveryRate,
  compact = false,
  className = "",
}: RecoveryGaugeProps) {
  const state = getRecoveryState(recoveryRate);
  const fillWidth =
    recoveryRate == null || !Number.isFinite(recoveryRate)
      ? 0
      : clamp(recoveryRate, 0, 100);

  if (compact) {
    return (
      <div
        className={`rounded-xl border px-3 py-2 ${state.shellClass} ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">
            52W Recovery
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${state.accentClass}`}
          >
            {state.signal}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/30">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${state.fillClass}`}
              style={{
                width: `${fillWidth}%`,
                boxShadow: state.glow,
              }}
            />
            {recoveryRate != null && recoveryRate > 100 ? (
              <div
                className={`absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${state.pulseClass}`}
              />
            ) : null}
          </div>

          <span
            className={`shrink-0 text-xs font-semibold tabular-nums ${state.accentClass}`}
          >
            {formatGap(recoveryRate)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${state.shellClass} ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">
            52-Week Recovery Rate
          </p>

          <div className="mt-2 flex items-end gap-3">
            <p
              className={`text-3xl font-black tracking-tight tabular-nums sm:text-4xl ${state.accentClass}`}
            >
              {formatRate(recoveryRate)}
            </p>
            <p
              className={`pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${state.accentClass}`}
            >
              {state.signal}
            </p>
          </div>

          <p className="mt-1 text-xs text-white/50">{state.hint}</p>
        </div>
      </div>

      <div className="mt-4 relative h-3 overflow-hidden rounded-full border border-black/20 bg-black/30">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${state.fillClass}`}
          style={{
            width: `${fillWidth}%`,
            boxShadow: state.glow,
          }}
        />
        {recoveryRate != null && recoveryRate > 100 ? (
          <div
            className={`absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full ${state.pulseClass}`}
          />
        ) : null}
      </div>
    </div>
  );
}