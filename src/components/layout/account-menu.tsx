"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  BookMarked,
  ChartNoAxesColumn,
  MoveRight,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountMenuData } from "@/app/api/compte/menu/route";
import { cn } from "@/lib/utils";

type Account = { name: string | null; email: string; initials: string };

// shortLabel : sous l'icône, dans le tiroir mobile.
type Shortcut = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const shortcuts: Shortcut[] = [
  {
    href: "/compte",
    label: "Ma progression",
    shortLabel: "Progression",
    icon: ChartNoAxesColumn,
  },
  {
    href: "/memorisation",
    label: "Ma mémorisation",
    shortLabel: "Mémorisation",
    icon: BookMarked,
  },
  {
    href: "/compte?onglet=parametres",
    label: "Paramètres",
    shortLabel: "Paramètres",
    icon: SlidersHorizontal,
  },
];

function formatPercent(percent: number) {
  return `${
    percent < 10 && percent > 0
      ? percent.toFixed(1).replace(".", ",")
      : Math.round(percent)
  } %`;
}

// Les données du menu (reprise, classes, mémorisation) ne sont chargées qu'à
// son ouverture, puis rechargées à chaque ouverture pour rester à jour ; on
// garde l'ancienne version affichée pendant ce temps.
function useAccountMenuData() {
  const [data, setData] = useState<AccountMenuData | null>(null);
  function load() {
    fetch("/api/compte/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: AccountMenuData | null) => json && setData(json))
      .catch(() => {});
  }
  return { data, load };
}

function Avatar({ initials, large }: { initials: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary font-semibold text-primary-foreground",
        large
          ? "size-12 font-heading text-lg"
          : "size-7 text-[11px] tracking-wide",
      )}
    >
      {initials}
    </span>
  );
}

function Identity({
  account,
  data,
  showEmail,
}: {
  account: Account;
  data: AccountMenuData | null;
  showEmail: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={account.initials} large />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-base leading-tight font-semibold">
          {account.name ?? account.email}
        </span>
        {showEmail && account.name && (
          <span className="truncate text-xs text-muted-foreground">
            {account.email}
          </span>
        )}
        {data === null && (
          <Skeleton aria-hidden className="h-5 w-36 rounded-none" />
        )}
        {data && data.classes.length > 0 && (
          <ul aria-label="Mes classes" className="flex flex-wrap gap-1.5">
            {data.classes.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 bg-muted px-2 py-0.5 text-xs"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5",
                    c.former ? "bg-muted-foreground" : "bg-emerald-600",
                  )}
                />
                <span className="font-semibold">{c.name}</span>
                <span className="text-muted-foreground">
                  · {c.former ? "Ancien élève" : "En cours"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Même carte que « Reprendre » sur /compte : marron dans les deux thèmes.
function ResumeCard({
  resume,
  large,
}: {
  resume: NonNullable<AccountMenuData["resume"]>;
  large?: boolean;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-bold tracking-[0.1em] text-[#f8a07f] uppercase">
          Reprendre
        </span>
        <span
          className={cn("leading-snug font-semibold", large && "text-base")}
        >
          {resume.coursTitle}
        </span>
        <span className="text-xs opacity-80">
          {resume.kind === "quiz" ? "Quiz" : resume.thematiqueTitle} ·{" "}
          {resume.title}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center bg-chart-1 text-[#21140f]",
          large ? "size-11" : "size-9",
        )}
      >
        <MoveRight className="size-4" />
      </span>
    </>
  );
}

const resumeClassName =
  "flex items-center gap-3 bg-[#21140f] p-3.5 text-left text-[#f5f5ed] dark:bg-card dark:text-card-foreground";

// Pendant le chargement : la carte « Reprendre » vide, à la même taille, pour
// que le menu ne saute pas quand elle arrive.
function ResumeSkeleton({
  className,
  large,
}: {
  className?: string;
  large?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn(resumeClassName, "animate-pulse", className)}
    >
      <span className="flex flex-1 flex-col gap-2 py-0.5">
        <span className="h-2.5 w-16 bg-current/20" />
        <span className={cn("h-3.5 bg-current/25", large ? "w-48" : "w-40")} />
        <span className="h-3 w-52 max-w-full bg-current/15" />
      </span>
      <span
        className={cn("shrink-0 bg-chart-1/40", large ? "size-11" : "size-9")}
      />
    </div>
  );
}

// Ordinateur : un menu déroulant sous l'avatar.
function AccountDropdown({ account }: { account: Account }) {
  const { data, load } = useAccountMenuData();

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label="Mon compte"
        title={account.name ?? account.email}
        className="hidden sm:inline-flex"
      >
        <Avatar initials={account.initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] rounded-none p-0">
        <div className="p-4">
          <Identity account={account} data={data} showEmail />
        </div>

        {data === null ? (
          <ResumeSkeleton className="mx-2.5 dark:bg-muted" />
        ) : (
          data.resume && (
            // Item nu plutôt que DropdownMenuItem, dont le survol recolore tout
            // le texte en foncé (illisible sur le marron). En sombre, le menu a
            // déjà la couleur des cartes : un cran plus clair.
            <MenuPrimitive.Item
              render={<Link href={data.resume.href} />}
              className={cn(
                resumeClassName,
                "mx-2.5 outline-none transition-opacity data-highlighted:opacity-90 dark:bg-muted",
              )}
            >
              <ResumeCard resume={data.resume} />
            </MenuPrimitive.Item>
          )
        )}

        <div className="flex flex-col p-2.5">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem
              key={href}
              render={<Link href={href} />}
              className="min-h-11 gap-3 rounded-none px-2.5 text-sm font-medium"
            >
              <Icon className="size-[18px]" />
              <span className="flex-1">{label}</span>
              {href === "/memorisation" && data?.memorizedPercent != null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatPercent(data.memorizedPercent)}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-2.5">
          <SignOutButton
            variant="menu"
            className="h-11 w-full justify-start gap-3 rounded-none px-2.5 font-medium"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mobile : un tiroir qui monte du bas, avec de grandes zones pour le pouce
// (la barre d'onglets du bas n'a pas d'accès au compte).
function AccountSheet({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const { data, load } = useAccountMenuData();
  const close = () => setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" />}
        aria-label="Mon compte"
        className="sm:hidden"
      >
        <Avatar initials={account.initials} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-0 bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <div aria-hidden className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 bg-foreground/25" />
        </div>
        <SheetTitle className="sr-only">Mon compte</SheetTitle>
        <SheetDescription className="sr-only">
          Raccourcis vers ta progression et tes paramètres.
        </SheetDescription>

        <div className="px-4 pt-2.5 pb-4 pr-14">
          <Identity account={account} data={data} showEmail={false} />
        </div>

        {data === null ? (
          <ResumeSkeleton large className="mx-4 p-4" />
        ) : (
          data.resume && (
            <Link
              href={data.resume.href}
              onClick={close}
              className={cn(resumeClassName, "mx-4 p-4")}
            >
              <ResumeCard resume={data.resume} large />
            </Link>
          )
        )}

        <nav
          aria-label="Mon compte"
          className="grid grid-cols-3 gap-2 px-4 pt-3"
        >
          {shortcuts.map(({ href, shortLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 bg-card px-2 py-3 text-center text-[13px] leading-tight font-semibold"
            >
              <Icon className="size-[22px]" aria-hidden />
              {shortLabel}
            </Link>
          ))}
        </nav>

        <div className="mx-4 mt-3 border-t pt-1">
          <SignOutButton
            variant="menu"
            className="h-12 w-full justify-start gap-3 rounded-none px-0 text-[15px] font-medium hover:bg-transparent"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AccountMenu(account: Account) {
  return (
    <>
      <AccountDropdown account={account} />
      <AccountSheet account={account} />
    </>
  );
}
