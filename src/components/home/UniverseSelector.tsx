"use client";

import type {
  UniverseCode,
  UniverseOption,
} from "../../lib/koaptix/universes";

export type UniverseSelectorProps = {
  value: UniverseCode;
  options: UniverseOption[];
  onChange: (next: UniverseCode) => void;
};

export default function UniverseSelector({
  value,
  options,
  onChange,
}: UniverseSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const active = option.code === value;

        return (
          <button
            key={option.code}
            type="button"
            onClick={() => onChange(option.code)}
            aria-pressed={active}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-medium transition",
              active
                ? "border-cyan-400/30 bg-slate-800 text-cyan-300"
                : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}