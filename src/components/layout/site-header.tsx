import Link from "next/link";
import { Search, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SiteNavLinks } from "@/components/layout/site-nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { getCurrentProfile } from "@/lib/auth/get-session";
import { getDueReviewsSummary } from "@/lib/db/queries/quran-memorization";

export async function SiteHeader({
  profile,
}: {
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
}) {
  const dueSummary = profile
    ? await getDueReviewsSummary(profile.id)
    : { aRenforcerCount: 0, maitriseDueCount: 0, total: 0 };

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            lang="ar"
            className="flex items-center gap-2 font-logo-arabic text-2xl font-bold tracking-tight"
          >
            {/* <BookOpen className="size-5" /> */}
            طالب
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <SiteNavLinks />
        </div>
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            title="Recherche (⌘K)"
            render={<Link href="/recherche" />}
            nativeButton={false}
          >
            <Search className="size-4" />
          </Button>
          {profile && <NotificationBell initialSummary={dueSummary} />}
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
              >
                <UserRound className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {profile.fullName ?? profile.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="px-1.5 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    render={<Link href="/compte" />}
                    nativeButton={false}
                  >
                    Mon compte
                  </Button>
                </div>
                <div className="px-1.5 py-1">
                  <SignOutButton className="w-full" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
