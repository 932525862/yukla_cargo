"use client";

import { addDays, toInputDate } from "@/lib/format";
import { cn } from "./ui";

const PRESETS = [
  { label: "Bugun", days: 0 },
  { label: "Kecha", days: -1, single: true },
  { label: "7 kun", days: -6 },
  { label: "30 kun", days: -29 },
] as const;

/** Sana oralig'i filtri: tezkor tanlovlar + qo'lda "dan–gacha" */
export function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const today = toInputDate(new Date());
  const active = from || to;

  return (
    <div className="card space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink">Sana bo&apos;yicha</span>
        {active && (
          <button type="button" onClick={() => onChange("", "")} className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 active:bg-red-50">
            Tozalash
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {PRESETS.map((p) => {
          const f = toInputDate(addDays(p.days));
          const t = "single" in p ? f : today;
          const on = from === f && to === t;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(f, t)}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                on ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-ink-soft active:bg-slate-200",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Dan</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange(e.target.value, to)}
            className="min-h-11 w-full rounded-xl border border-line bg-slate-50 px-3 text-sm text-ink outline-none focus:border-brand-light focus:bg-white focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Gacha</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange(from, e.target.value)}
            className="min-h-11 w-full rounded-xl border border-line bg-slate-50 px-3 text-sm text-ink outline-none focus:border-brand-light focus:bg-white focus:ring-2 focus:ring-brand/15"
          />
        </label>
      </div>
    </div>
  );
}
