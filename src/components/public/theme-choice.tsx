"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

const OPTIONS = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Système" },
] as const;

// Variante de ThemeToggle pour la page compte : on peut aussi revenir au
// thème de l'appareil. Le choix n'est connu qu'après hydratation
// (localStorage), d'où l'absence de sélection au premier rendu.
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  return (
    <div role="radiogroup" aria-label="Thème" className="flex border">
      {OPTIONS.map((option) => {
        const selected = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "h-8 px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
