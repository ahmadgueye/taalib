"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  ClipboardCheck,
  Home,
  ScrollText,
} from "lucide-react";

import { QuizCountBadge } from "@/components/layout/quiz-count-badge";
import { cn, isNavActive } from "@/lib/utils";

// Même règle que la navigation du header : un visiteur ne voit que ce qui
// lui est ouvert. Cinq onglets au plus : la recherche passe par la loupe de
// l'en-tête sur mobile.
const tabs = [
  { href: "/", label: "Accueil", icon: Home, exact: true, membersOnly: false },
  { href: "/cours", label: "Cours", icon: BookOpen, membersOnly: true },
  { href: "/quiz", label: "Quiz", icon: ClipboardCheck, membersOnly: true },
  { href: "/coran", label: "Qur'an", icon: BookMarked, membersOnly: false },
  { href: "/hadiths", label: "Hadiths", icon: ScrollText, membersOnly: true },
];

export function MobileTabBar({
  signedIn,
  pendingQuizzes = 0,
}: {
  signedIn: boolean;
  // Quiz à faire ou à retenter : pastille sur l'onglet « Quiz ».
  pendingQuizzes?: number;
}) {
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground",
                active && "text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {href === "/quiz" && (
                  <QuizCountBadge
                    count={pendingQuizzes}
                    className="absolute -top-1.5 left-3"
                  />
                )}
              </span>
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
