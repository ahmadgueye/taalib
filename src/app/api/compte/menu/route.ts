import { NextResponse } from "next/server";

import { getContentAccess } from "@/lib/auth/content-access";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getStudentClasses } from "@/lib/db/queries/classes";
import { getLastReadCoursId } from "@/lib/db/queries/progress";
import { getMemorizationStatus } from "@/lib/db/queries/quran-memorization";
import {
  getStudentRoadmap,
  pickResume,
  todoHref,
} from "@/lib/db/queries/roadmap";
import {
  computeChapterMemorizationSummaries,
  computeWordProgressBreakdown,
} from "@/lib/quran/memorization";
import { getChapters } from "@/lib/quran/queries";

export type AccountMenuData = {
  classes: { id: string; name: string; former: boolean }[];
  resume: {
    href: string;
    kind: "ressource" | "quiz";
    coursTitle: string;
    title: string;
    thematiqueTitle: string;
  } | null;
  // Même calcul que /memorisation (au prorata des mots) ; null si aucun
  // verset n'est encore suivi.
  memorizedPercent: number | null;
};

// Données du menu du compte, chargées seulement à son ouverture : le header
// est sur toutes les pages, on ne calcule pas la feuille de route à chaque
// navigation.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json(null, { status: 401 });

  const access = await getContentAccess();
  const [classes, roadmap, lastCoursId, statusMap, chapters] =
    await Promise.all([
      access.all ? [] : getStudentClasses(profile.id),
      access.all ? null : getStudentRoadmap(profile.id, access),
      getLastReadCoursId(profile.id),
      getMemorizationStatus(profile.id),
      getChapters(),
    ]);

  const resume = roadmap ? pickResume(roadmap.todo, lastCoursId) : null;

  let memorizedPercent: number | null = null;
  if (Object.keys(statusMap).length > 0) {
    const breakdown = computeWordProgressBreakdown(
      computeChapterMemorizationSummaries(chapters, statusMap)
    );
    memorizedPercent =
      breakdown.total > 0 ? (breakdown.maitrise / breakdown.total) * 100 : 0;
  }

  const data: AccountMenuData = {
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      former: c.leftAt !== null,
    })),
    resume: resume && {
      href: todoHref(resume),
      kind: resume.kind,
      coursTitle: resume.coursTitle,
      title: resume.title,
      thematiqueTitle: resume.thematiqueTitle,
    },
    memorizedPercent,
  };
  return NextResponse.json(data);
}
