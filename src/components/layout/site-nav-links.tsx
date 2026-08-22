"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn, isNavActive } from "@/lib/utils";

const links = [
  { href: "/cours", label: "Cours" },
  { href: "/coran", label: "Coran" },
  { href: "/hadiths", label: "Hadith" },
  { href: "/recherche", label: "Recherche", title: "Recherche (⌘K)" },
];

export function SiteNavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "hidden items-center gap-6 text-sm text-muted-foreground sm:flex",
        className,
      )}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          title={link.title}
          className={cn(
            "hover:text-foreground",
            isNavActive(pathname, link.href) && "font-medium text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
