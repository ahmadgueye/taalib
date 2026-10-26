"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn, isNavActive } from "@/lib/utils";

// membersOnly : réservé aux connectés, inutile de le montrer à un visiteur
// (le proxy le renverrait vers /login).
const links = [
  { href: "/cours", label: "Mes Cours", membersOnly: true },
  { href: "/coran", label: "Quran", membersOnly: false },
  { href: "/hadiths", label: "Hadith", membersOnly: true },
];

export function SiteNavLinks({
  signedIn,
  className,
}: {
  signedIn: boolean;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "hidden items-center gap-6 text-sm text-muted-foreground sm:flex",
        className,
      )}
    >
      {links
        .filter((link) => signedIn || !link.membersOnly)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
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
