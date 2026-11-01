"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MemorizationStatus } from "@/lib/db/schema";
import { filterChapters } from "@/lib/quran/chapter-search";
import {
  computeChapterMemorizationSummaries,
  MEMORIZATION_CYCLE,
  MEMORIZATION_STYLES,
} from "@/lib/quran/memorization";
import type { QuranChapter } from "@/lib/quran/types";
import { cn } from "@/lib/utils";

// Même seuil que les classes `md:` de la barre d'outils du lecteur.
const desktopQuery = "(min-width: 768px)";

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(desktopQuery);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
}

// Navigation du lecteur : liste des sourates (avec recherche) et grille des
// versets de la sourate choisie. Tiroir depuis la gauche sur desktop, avec
// les deux colonnes côte à côte ; depuis le bas sur mobile, en deux étapes
// (sourates, puis versets). Choisir une sourate y mène tout de suite (verset
// 1) ; choisir un verset y mène et ferme le tiroir.
export function QuranNavigator({
  chapters,
  selectedChapter,
  selectedVerseNumber,
  onNavigate,
  statusMap,
}: {
  chapters: QuranChapter[];
  selectedChapter: QuranChapter;
  selectedVerseNumber: number;
  onNavigate: (chapterId: number, verseNumber: number) => void;
  // Absent pour un visiteur non connecté : pas de couleurs de mémorisation.
  statusMap?: Record<string, MemorizationStatus>;
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<"chapters" | "verses">("chapters");

  const results = useMemo(() => filterChapters(chapters, query), [chapters, query]);
  const summaries = useMemo(
    () =>
      statusMap
        ? new Map(
            computeChapterMemorizationSummaries(chapters, statusMap).map((s) => [
              s.chapter.id,
              s,
            ]),
          )
        : null,
    [chapters, statusMap],
  );

  // Amène la sourate en cours au centre de la liste à l'ouverture.
  const scrollIntoView = useCallback((el: HTMLElement | null) => {
    el?.scrollIntoView({ block: "center" });
  }, []);

  function handleOpenChange(next: boolean) {
    if (next) {
      setQuery("");
      setStep("chapters");
    }
    setOpen(next);
  }

  function chooseChapter(chapterId: number) {
    onNavigate(chapterId, 1);
    setStep("verses");
  }

  function chooseVerse(verseNumber: number) {
    onNavigate(selectedChapter.id, verseNumber);
    setOpen(false);
  }

  const chapterList = (
    <div className="flex min-h-0 flex-col">
      <div className="relative px-4 pb-3">
        <Search className="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) chooseChapter(results[0].id);
          }}
          placeholder="Nom ou numéro de sourate"
          aria-label="Rechercher une sourate"
          className="pl-8"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {results.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-muted-foreground">
            Aucune sourate trouvée.
          </li>
        )}
        {results.map((c) => {
          const active = c.id === selectedChapter.id;
          const summary = summaries?.get(c.id);
          return (
            <li key={c.id} ref={active && !query ? scrollIntoView : undefined}>
              <button
                type="button"
                onClick={() => chooseChapter(c.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted",
                  active && "bg-muted",
                )}
              >
                <span className="w-7 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {c.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", active && "font-medium")}>
                    {c.nameSimple}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.nameTranslated} · {c.versesCount} versets
                  </span>
                </span>
                {summary && summary.tracked > 0 && (
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      summary.maitrise === c.versesCount
                        ? MEMORIZATION_STYLES.maitrise.solid
                        : MEMORIZATION_STYLES.en_cours.solid,
                    )}
                    title={`${summary.maitrise}/${c.versesCount} versets maîtrisés`}
                  />
                )}
                <span dir="rtl" lang="ar" className="shrink-0 font-calligraphy text-lg">
                  {c.nameArabic}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const verseGrid = (
    <div className="flex min-h-0 flex-col">
      <div className="px-4 pb-3">
        {!isDesktop && (
          <button
            type="button"
            onClick={() => setStep("chapters")}
            className="-ml-1 mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Sourates
          </button>
        )}
        <p className="flex h-8 items-center text-sm font-medium">
          {selectedChapter.nameSimple}
        </p>
        {statusMap && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {MEMORIZATION_CYCLE.filter((s) => s !== null).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", MEMORIZATION_STYLES[s].solid)} />
                {MEMORIZATION_STYLES[s].label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 overflow-y-auto px-4 pb-4">
        {Array.from({ length: selectedChapter.versesCount }, (_, i) => {
          const n = i + 1;
          const status = statusMap?.[`${selectedChapter.id}:${n}`];
          const active = n === selectedVerseNumber;
          return (
            <button
              key={n}
              type="button"
              onClick={() => chooseVerse(n)}
              aria-label={`Verset ${n}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative flex h-9 items-center justify-center overflow-hidden rounded-md border text-sm tabular-nums hover:bg-muted",
                status && MEMORIZATION_STYLES[status].tint,
                active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {n}
              {status && !active && (
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5",
                    MEMORIZATION_STYLES[status].solid,
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 justify-between font-normal md:flex-none"
          />
        }
      >
        <span className="truncate">
          {selectedChapter.id}. {selectedChapter.nameSimple}
          <span className="text-muted-foreground"> · v. {selectedVerseNumber}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "left" : "bottom"}
        className={cn(
          "gap-0 outline-none",
          isDesktop
            ? "data-[side=left]:w-full data-[side=left]:sm:max-w-xl"
            : "rounded-t-xl pb-[env(safe-area-inset-bottom)] data-[side=bottom]:h-[90dvh]",
        )}
      >
        <SheetHeader className="pb-3">
          <SheetTitle>Aller à</SheetTitle>
          <SheetDescription className="sr-only">
            Choisir une sourate puis un verset
          </SheetDescription>
        </SheetHeader>
        {isDesktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_15rem] divide-x">
            {chapterList}
            {verseGrid}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {step === "chapters" ? chapterList : verseGrid}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
