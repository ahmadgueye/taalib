import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemorizationWorkspace } from "@/components/public/memorization-workspace";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getMemorizationStatus,
  getRecentChapterActivity,
} from "@/lib/db/queries/quran-memorization";
import { getChapters } from "@/lib/quran/queries";

export const metadata: Metadata = {
  title: "Mon parcours de mémorisation — Taalib",
  robots: { index: false, follow: false },
};

export default async function MemorisationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/memorisation");

  const [chapters, statusMap, recentActivity] = await Promise.all([
    getChapters(),
    getMemorizationStatus(profile.id),
    getRecentChapterActivity(profile.id),
  ]);

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Mon parcours de mémorisation
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Renseigne le nombre de versets mémorisés pour chaque sourate —
        elle passe à 100% dès que ce nombre atteint son total de versets.
      </p>

      <div className="mt-6">
        <MemorizationWorkspace
          chapters={chapters}
          statusMap={statusMap}
          recentActivity={recentActivity}
        />
      </div>
    </div>
  );
}
