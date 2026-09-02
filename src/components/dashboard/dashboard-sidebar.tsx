"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  ListTree,
  Quote,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { cn, isNavActive } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/cours", label: "Cours", icon: BookOpen },
  { href: "/dashboard/thematiques", label: "Thématiques", icon: ListTree },
  { href: "/dashboard/ressources", label: "Ressources", icon: LinkIcon },
  { href: "/dashboard/hadiths", label: "Hadiths", icon: Quote },
  { href: "/dashboard/quiz", label: "Quiz", icon: HelpCircle },
  { href: "/dashboard/seances", label: "Séances", icon: Calendar },
];

export function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col justify-between overflow-y-auto border-r p-4">
      <div>
        <Link
          href="/"
          lang="ar"
          className="mb-8 block text-left font-logo-arabic text-2xl font-bold tracking-tight"
        >
          طالب
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                isNavActive(pathname, href, href === "/dashboard") &&
                  "bg-muted text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/dashboard/utilisateurs"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                isNavActive(pathname, "/dashboard/utilisateurs") &&
                  "bg-muted text-foreground"
              )}
            >
              <Users className="size-4" />
              Utilisateurs
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <SignOutButton className="flex-1" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
