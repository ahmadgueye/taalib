import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { RevisionList } from "@/components/public/revision-list";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getDueReviews } from "@/lib/db/queries/quran-memorization";
import { getChapters } from "@/lib/quran/queries";

export const metadata: Metadata = {
  title: "Révision du jour — Taalib",
  robots: { index: false, follow: false },
};

export default async function RevisionPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/memorisation/revision");

  const [dueReviews, chapters] = await Promise.all([
    getDueReviews(profile.id),
    getChapters(),
  ]);

  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const items = dueReviews
    .map((r) => {
      const chapter = chapterById.get(r.chapterId);
      return chapter
        ? {
            chapterId: r.chapterId,
            verseNumber: r.verseNumber,
            chapterTitle: chapter.nameSimple,
            status: r.status as "a_renforcer" | "maitrise",
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        Révision du jour
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pour chaque verset, relis-le ou récite-le de mémoire, puis dis si tu
        t&apos;en souvenais encore.
      </p>

      <div className="mt-6">
        <RevisionList items={items} />
      </div>
    </div>
  );
}
