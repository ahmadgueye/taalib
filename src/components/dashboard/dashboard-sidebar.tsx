"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  ListTree,
  Quote,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { StaffModeSwitch } from "@/components/layout/staff-mode-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { cn, isNavActive } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

// Regroupés par usage plutôt qu'une longue liste à plat.
const navGroups: NavGroup[] = [
  {
    label: "Enseignement",
    items: [
      { href: "/dashboard/cours", label: "Cours", icon: BookOpen },
      { href: "/dashboard/thematiques", label: "Thématiques", icon: ListTree },
      { href: "/dashboard/ressources", label: "Ressources", icon: LinkIcon },
      { href: "/dashboard/quiz", label: "Quiz", icon: HelpCircle },
      { href: "/dashboard/seances", label: "Séances", icon: Calendar },
    ],
  },
  {
    label: "Hadiths",
    items: [
      { href: "/dashboard/hadiths", label: "Hadiths", icon: Quote },
      { href: "/dashboard/rapporteurs", label: "Rapporteurs", icon: UserRound },
    ],
  },
  {
    label: "Gestion",
    adminOnly: true,
    items: [
      { href: "/dashboard/classes", label: "Classes", icon: GraduationCap },
      { href: "/dashboard/utilisateurs", label: "Utilisateurs", icon: Users },
    ],
  },
];

function NavLink({
  item: { href, label, icon: Icon },
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-muted font-medium text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

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
        <StaffModeSwitch current="dashboard" className="mb-6" />
        <nav className="flex flex-col gap-5 text-sm">
          <NavLink
            item={{
              href: "/dashboard",
              label: "Tableau de bord",
              icon: LayoutDashboard,
            }}
            active={isNavActive(pathname, "/dashboard", true)}
          />
          {navGroups
            .filter((g) => isAdmin || !g.adminOnly)
            .map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                  />
                ))}
              </div>
            ))}
        </nav>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <SignOutButton className="flex-1" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
