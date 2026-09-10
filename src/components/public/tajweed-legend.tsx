"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Same rule keys, order, French labels and colors as quran.com's own
// Tajweed Bar (see --tajweed-* vars in globals.css), so the legend matches
// exactly what the QCF Tajweed V4 font glyphs are actually drawing.
const TAJWEED_RULES = [
  { key: "edgham", label: "Lettre muette" },
  { key: "mad-2", label: "Madd normal (2)" },
  { key: "mad-2-4-6", label: "Madd séparé (2 ou 4 ou 6 secondes)" },
  { key: "mad-4-5", label: "Madd connecté (4/5)" },
  { key: "mad-6", label: "Madd nécessaire (6)" },
  { key: "ekhfa", label: "Ghunna/ikhfa’" },
  { key: "qalqala", label: "Qalqala (résonance)" },
  { key: "tafkhim", label: "Tafkhim (lourd)" },
] as const;

export function TajweedLegend({ show }: { show: boolean }) {
  const [open, setOpen] = useState(false);

  if (!show) return null;

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        Couleurs du Tajwid
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 py-4 text-sm">
            {TAJWEED_RULES.map((rule) => (
              <div key={rule.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0"
                  style={{ backgroundColor: `var(--tajweed-${rule.key})` }}
                />
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
