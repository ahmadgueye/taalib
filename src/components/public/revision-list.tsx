"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmVerseReview } from "@/lib/actions/memorization";
import { DUE_REVIEWS_CHANGED_EVENT } from "@/lib/quran/memorization";

type RevisionItem = {
  chapterId: number;
  verseNumber: number;
  chapterTitle: string;
  status: "a_renforcer" | "maitrise";
};

function RevisionRow({
  item,
  onDone,
}: {
  item: RevisionItem;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function confirm(remembered: boolean) {
    startTransition(async () => {
      const result = await confirmVerseReview(
        item.chapterId,
        item.verseNumber,
        remembered
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      window.dispatchEvent(new Event(DUE_REVIEWS_CHANGED_EVENT));
      onDone();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border p-4">
      <div>
        <p className="font-medium">
          {item.chapterTitle} — verset {item.verseNumber}
        </p>
        <Link
          href={`/coran?sourate=${item.chapterId}&verset=${item.verseNumber}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Relire ce verset
        </Link>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => confirm(false)}
        >
          J&apos;ai oublié
        </Button>
        <Button
          size="sm"
          disabled={isPending}
          className="bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500"
          onClick={() => confirm(true)}
        >
          Je me souviens
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  items,
  onDone,
}: {
  title: string;
  description: string;
  items: RevisionItem[];
  onDone: (item: RevisionItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="font-heading text-lg font-semibold">
        {title} ({items.length})
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <RevisionRow
            key={`${item.chapterId}:${item.verseNumber}`}
            item={item}
            onDone={() => onDone(item)}
          />
        ))}
      </div>
    </div>
  );
}

export function RevisionList({ items: initialItems }: { items: RevisionItem[] }) {
  const [items, setItems] = useState(initialItems);

  function remove(done: RevisionItem) {
    setItems((prev) =>
      prev.filter(
        (i) =>
          !(i.chapterId === done.chapterId && i.verseNumber === done.verseNumber)
      )
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Rien à réviser aujourd&apos;hui — reviens demain.
      </p>
    );
  }

  const aRenforcer = items.filter((i) => i.status === "a_renforcer");
  const maitriseDue = items.filter((i) => i.status === "maitrise");

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="À renforcer"
        description="Versets que tu as marqués comme fragiles. « Je me souviens » les repasse en maîtrisés."
        items={aRenforcer}
        onDone={remove}
      />
      <Section
        title="Échéance de révision"
        description="Versets déjà maîtrisés, à reconfirmer aujourd'hui."
        items={maitriseDue}
        onDone={remove}
      />
    </div>
  );
}
