"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDueReviewsSummaryAction } from "@/lib/actions/memorization";
import type { DueReviewsSummary } from "@/lib/db/queries/quran-memorization";
import { DUE_REVIEWS_CHANGED_EVENT } from "@/lib/quran/memorization";
import { cn } from "@/lib/utils";

export function NotificationBell({
  initialSummary,
}: {
  initialSummary: DueReviewsSummary;
}) {
  const [summary, setSummary] = useState(initialSummary);

  // The header lives in the shared layout, which Next.js doesn't re-render
  // on client-side navigation between sibling pages — so `initialSummary`
  // (server-rendered once) can go stale after a tap in the reader. Refetch
  // on mount and every time the popover opens instead of trusting it.
  function refresh() {
    getDueReviewsSummaryAction().then(setSummary);
  }

  useEffect(() => {
    refresh();
    window.addEventListener(DUE_REVIEWS_CHANGED_EVENT, refresh);
    return () =>
      window.removeEventListener(DUE_REVIEWS_CHANGED_EVENT, refresh);
  }, []);

  return (
    <DropdownMenu onOpenChange={(open) => open && refresh()}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="Révisions du jour"
            className="relative"
          />
        }
      >
        <Bell className="size-4" />
        {summary.total > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white"
            )}
          >
            {summary.total > 9 ? "9+" : summary.total}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Révisions du jour</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {summary.total === 0 ? (
          <p className="px-2 py-2 text-sm text-muted-foreground">
            Rien à réviser aujourd&apos;hui.
          </p>
        ) : (
          <div className="flex flex-col gap-2 px-2 py-1.5 text-sm">
            {summary.aRenforcerCount > 0 && (
              <p className="flex items-center gap-2">
                <TriangleAlert className="size-4 shrink-0 text-rose-500" />
                {summary.aRenforcerCount} verset
                {summary.aRenforcerCount > 1 ? "s" : ""} à renforcer
              </p>
            )}
            {summary.maitriseDueCount > 0 && (
              <p className="flex items-center gap-2">
                <RotateCcw className="size-4 shrink-0 text-emerald-500" />
                {summary.maitriseDueCount} verset
                {summary.maitriseDueCount > 1 ? "s" : ""} à reconfirmer
              </p>
            )}
          </div>
        )}
        <div className="px-1.5 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            render={<Link href="/memorisation/revision" />}
            nativeButton={false}
          >
            Voir la révision du jour
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
