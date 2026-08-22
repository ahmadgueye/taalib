"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { QuranChapter } from "@/lib/quran/types";

export function SurahCommand({
  chapters,
  selectedChapter,
  onSelect,
}: {
  chapters: QuranChapter[];
  selectedChapter: QuranChapter;
  onSelect: (chapterId: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="justify-between font-normal"
        onClick={() => setOpen(true)}
      >
        <span>
          {selectedChapter.id}. {selectedChapter.nameTranslated}
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Choisir une sourate"
        description="Rechercher une sourate par nom ou numéro"
      >
        <CommandInput placeholder="Rechercher une sourate…" />
        <CommandList>
          <CommandEmpty>Aucune sourate trouvée.</CommandEmpty>
          {chapters.map((chapter) => (
            <CommandItem
              key={chapter.id}
              value={`${chapter.id} ${chapter.nameSimple} ${chapter.nameTranslated}`}
              keywords={[chapter.nameArabic]}
              onSelect={() => {
                onSelect(chapter.id);
                setOpen(false);
              }}
            >
              <span className="text-muted-foreground">{chapter.id}.</span>
              <span>{chapter.nameTranslated}</span>
              <span className="text-muted-foreground">
                ({chapter.nameSimple})
              </span>
              <span dir="rtl" lang="ar" className="ml-auto font-arabic">
                {chapter.nameArabic}
              </span>
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
