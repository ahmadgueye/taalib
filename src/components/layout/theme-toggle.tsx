"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@base-ui/react/switch";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Switch.Root
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      aria-label="Changer de thème"
      className="group/theme-toggle relative inline-flex h-7 w-13 shrink-0 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-muted p-0.5 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
        <Sun className="size-3.5 text-muted-foreground opacity-100 transition-opacity duration-300 group-data-checked/theme-toggle:opacity-30" />
        <Moon className="size-3.5 text-muted-foreground opacity-30 transition-opacity duration-300 group-data-checked/theme-toggle:opacity-100" />
      </span>
      <Switch.Thumb
        className={cn(
          "relative flex size-6 items-center justify-center rounded-[min(var(--radius-sm),10px)] bg-background text-foreground shadow-sm ring-1 ring-border transition-transform duration-300 ease-out",
          "translate-x-0 data-checked:translate-x-[calc(100%-1px)]"
        )}
      >
        <Sun className="absolute size-3.5 scale-100 rotate-0 transition-all duration-300 group-data-checked/theme-toggle:scale-0 group-data-checked/theme-toggle:-rotate-90" />
        <Moon className="absolute size-3.5 scale-0 rotate-90 transition-all duration-300 group-data-checked/theme-toggle:scale-100 group-data-checked/theme-toggle:rotate-0" />
      </Switch.Thumb>
    </Switch.Root>
  );
}
