"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, BookOpen, Home, ScrollText, Search } from "lucide-react";

import { cn, isNavActive } from "@/lib/utils";

// Même règle que la navigation du header : un visiteur ne voit que ce qui
// lui est ouvert.
const tabs = [
  { href: "/", label: "Accueil", icon: Home, exact: true, membersOnly: false },
  { href: "/cours", label: "Mes Cours", icon: BookOpen, membersOnly: true },
  { href: "/coran", label: "Quran", icon: BookMarked, membersOnly: false },
  { href: "/hadiths", label: "Hadith", icon: ScrollText, membersOnly: true },
  { href: "/recherche", label: "Recherche", icon: Search, membersOnly: true },
];

export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:hidden">
      {tabs
        .filter((tab) => signedIn || !tab.membersOnly)
        .map(({ href, label, icon: Icon, exact }) => {
          const active = isNavActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground",
                active && "text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
