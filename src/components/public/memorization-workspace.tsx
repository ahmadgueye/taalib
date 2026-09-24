"use client";

import { useState } from "react";
import { toast } from "sonner";

import { setChapterMemorizedCount } from "@/lib/actions/memorization";
import { MemorizationDashboard } from "@/components/public/memorization-dashboard";
import { MemorizationSummary } from "@/components/public/memorization-summary";
import type { MemorizationStatus } from "@/lib/db/schema";
import { applyChapterCount } from "@/lib/quran/memorization";
import type { QuranChapter } from "@/lib/quran/types";

export function MemorizationWorkspace({
  chapters,
  statusMap,
  recentActivity,
}: {
  chapters: QuranChapter[];
  statusMap: Record<string, MemorizationStatus>;
  recentActivity: Record<number, string>;
}) {
  const [localStatusMap, setLocalStatusMap] = useState(statusMap);
  const [localRecentActivity, setLocalRecentActivity] = useState(recentActivity);

  async function handleCommitCount(chapter: QuranChapter, count: number) {
    const result = await setChapterMemorizedCount(chapter.id, count);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    setLocalStatusMap((prev) => applyChapterCount(prev, chapter, count));
    setLocalRecentActivity((prev) => {
      if (count === 0) {
        const next = { ...prev };
        delete next[chapter.id];
        return next;
      }
      return { ...prev, [chapter.id]: new Date().toISOString() };
    });
    toast.success(
      count === chapter.versesCount
        ? `${chapter.nameSimple} maîtrisée à 100% !`
        : "Progression enregistrée.",
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <MemorizationDashboard
        chapters={chapters}
        statusMap={localStatusMap}
        recentActivity={localRecentActivity}
      />
      <MemorizationSummary
        chapters={chapters}
        statusMap={localStatusMap}
        onCommitCount={handleCommitCount}
      />
    </div>
  );
}
