import Link from "next/link";
import { Eye, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

const modes = [
  { value: "site", href: "/", label: "Aperçu", icon: Eye },
  { value: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

// Bascule du staff (admin et contributeurs) entre le site et le dashboard.
// Le rôle est vérifié par l'appelant, côté serveur : un étudiant ne reçoit
// jamais ce composant.
export function StaffModeSwitch({
  current,
  className,
}: {
  current: "site" | "dashboard";
  className?: string;
}) {
  return (
    <nav
      aria-label="Espace"
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-muted p-0.5",
        className,
      )}
    >
      {modes.map(({ value, href, label, icon: Icon }) => {
        const active = value === current;
        return (
          <Link
            key={value}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "flex h-full items-center gap-1.5 rounded-[min(var(--radius-sm),10px)] px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-background text-foreground shadow-sm ring-1 ring-border",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {/* Sur mobile, les icônes seules : le header est déjà chargé. */}
            <span className="sr-only sm:not-sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
