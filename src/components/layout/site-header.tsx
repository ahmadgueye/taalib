import Link from "next/link";
import { Search } from "lucide-react";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SiteNavLinks } from "@/components/layout/site-nav-links";
import { StaffModeSwitch } from "@/components/layout/staff-mode-switch";
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

// « Ahmad Test » → « AT » ; un seul mot → sa première lettre ; sans nom, la
// première lettre de l'e-mail.
function initialsOf(fullName: string | null, email: string) {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 0
      ? [words[0], words.at(-1)!]
          .slice(0, words.length > 1 ? 2 : 1)
          .map((w) => Array.from(w)[0])
      : [Array.from(email)[0]];
  return letters.join("").toLocaleUpperCase("fr");
}

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
          <SiteNavLinks signedIn={Boolean(profile)} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {(profile?.role === "admin" || profile?.role === "contributor") && (
            <StaffModeSwitch current="site" />
          )}
          <ThemeToggle />
          {profile && (
            // Sur mobile, la recherche est déjà dans la barre du bas.
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              title="Recherche (⌘K)"
              render={<Link href="/recherche" />}
              nativeButton={false}
            >
              <Search className="size-4" />
            </Button>
          )}
          {profile && <NotificationBell initialSummary={dueSummary} />}
          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
                aria-label="Mon compte"
                title={profile.fullName ?? profile.email}
              >
                <span
                  className="flex size-7 items-center justify-center bg-primary text-[11px] font-semibold tracking-wide text-primary-foreground"
                  aria-hidden
                >
                  {initialsOf(profile.fullName, profile.email)}
                </span>
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
