"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { QuizCountBadge } from "@/components/layout/quiz-count-badge";
import { cn, isNavActive } from "@/lib/utils";

// membersOnly : réservé aux connectés, inutile de le montrer à un visiteur
// (le proxy le renverrait vers /login).
const links = [
  { href: "/cours", label: "Cours", membersOnly: true },
  { href: "/quiz", label: "Quiz", membersOnly: true },
  { href: "/coran", label: "Qur'an", membersOnly: false },
  { href: "/hadiths", label: "Hadiths", membersOnly: true },
  { href: "/recherche", label: "Recherche", membersOnly: true },
];

export function SiteNavLinks({
  signedIn,
  pendingQuizzes = 0,
  className,
}: {
  signedIn: boolean;
  pendingQuizzes?: number;
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
              "inline-flex items-center gap-1.5 hover:text-foreground",
              isNavActive(pathname, link.href) && "font-medium text-foreground",
            )}
          >
            {link.label}
            {link.href === "/quiz" && <QuizCountBadge count={pendingQuizzes} />}
          </Link>
        ))}
    </nav>
  );
}
