import Link from "next/link";

import { AccountMenu } from "@/components/layout/account-menu";
import { SiteNavLinks } from "@/components/layout/site-nav-links";
import { StaffModeSwitch } from "@/components/layout/staff-mode-switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import type { getCurrentProfile } from "@/lib/auth/get-session";

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
          {profile ? (
            <AccountMenu
              name={profile.fullName}
              email={profile.email}
              initials={initialsOf(profile.fullName, profile.email)}
            />
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
