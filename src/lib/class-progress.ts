// Suivi des étudiants d'une classe, pour l'enseignant : leçons lues et quiz
// réussis parmi ce que la classe a débloqué, mémorisation du Coran et
// dernière activité. Module pur (voir class-progress.test.ts) : la requête
// qui l'alimente est dans lib/db/queries/class-progress.ts.

import type { MemorizationStatus } from "@/lib/db/schema";
import { attemptsLeft } from "@/lib/quiz-attempts";
import {
  computeWordProgressBreakdown,
  type ChapterMemorizationSummary,
} from "@/lib/quran/memorization";
import type { QuranChapter } from "@/lib/quran/types";

// Au-delà, l'étudiant est signalé comme inactif.
export const INACTIVE_AFTER_DAYS = 7;

export type ClassProgressInput = {
  members: {
    userId: string;
    email: string;
    fullName: string | null;
    leftAt: Date | null;
  }[];
  // Ressources et quiz publiés, débloqués pour la classe.
  ressources: { id: string; unlockedAt: Date }[];
  // `maxAttempts` : limite de tentatives du quiz (null ou absent = illimité).
  quiz: {
    id: string;
    unlockedAt: Date;
    passingScore: number;
    maxAttempts?: number | null;
  }[];
  // Tentatives accordées en plus de la limite, par étudiant et par quiz.
  extraAttempts?: { userId: string; quizId: string; extra: number }[];
  // Toutes les lectures et tentatives des membres (pas seulement celles de
  // la classe) : elles comptent pour la dernière activité.
  completions: { userId: string; ressourceId: string; completedAt: Date }[];
  attempts: {
    userId: string;
    quizId: string;
    score: number;
    totalQuestions: number;
    completedAt: Date;
  }[];
  // Versets suivis, comptés par étudiant, sourate et statut.
  memorization: {
    userId: string;
    chapterId: number;
    status: MemorizationStatus;
    count: number;
    lastUpdatedAt: Date;
  }[];
  chapters: QuranChapter[];
};

export type StudentProgress = {
  userId: string;
  name: string;
  email: string;
  leftAt: Date | null;
  lessons: { read: number; total: number };
  // `averageScore` : moyenne des meilleurs scores (en %) des quiz tentés,
  // null si aucun. `blocked` : quiz pas réussis dont l'étudiant a épuisé les
  // tentatives (l'enseignant peut lui en accorder une).
  quiz: {
    passed: number;
    total: number;
    averageScore: number | null;
    blocked: number;
  };
  quran: { percent: number; aRenforcer: number };
  lastActivityAt: Date | null;
};

const latest = (a: Date | null, b: Date) => (a && a > b ? a : b);

export function buildClassProgress(input: ClassProgressInput): StudentProgress[] {
  const chapterById = new Map(input.chapters.map((c) => [c.id, c]));

  return input.members.map((member) => {
    // Un ancien élève garde ce qui était débloqué avant son départ : on le
    // juge sur ce périmètre, pas sur ce qui a été ouvert depuis.
    const visible = (unlockedAt: Date) =>
      member.leftAt === null || unlockedAt <= member.leftAt;
    const ressourceIds = new Set(
      input.ressources.filter((r) => visible(r.unlockedAt)).map((r) => r.id)
    );
    const quiz = input.quiz.filter((q) => visible(q.unlockedAt));

    let lastActivityAt: Date | null = null;

    let read = 0;
    for (const c of input.completions) {
      if (c.userId !== member.userId) continue;
      lastActivityAt = latest(lastActivityAt, c.completedAt);
      if (ressourceIds.has(c.ressourceId)) read += 1;
    }

    const bestPercent = new Map<string, number>();
    const attemptCount = new Map<string, number>();
    for (const a of input.attempts) {
      if (a.userId !== member.userId) continue;
      lastActivityAt = latest(lastActivityAt, a.completedAt);
      const percent = a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
      bestPercent.set(a.quizId, Math.max(bestPercent.get(a.quizId) ?? 0, percent));
      attemptCount.set(a.quizId, (attemptCount.get(a.quizId) ?? 0) + 1);
    }
    const attempted = quiz.filter((q) => bestPercent.has(q.id));
    const passed = attempted.filter(
      (q) => bestPercent.get(q.id)! >= q.passingScore
    ).length;
    const extras = new Map(
      (input.extraAttempts ?? [])
        .filter((e) => e.userId === member.userId)
        .map((e) => [e.quizId, e.extra])
    );
    const blocked = quiz.filter(
      (q) =>
        q.maxAttempts != null &&
        (bestPercent.get(q.id) ?? 0) < q.passingScore &&
        attemptsLeft(q.maxAttempts, extras.get(q.id) ?? 0, attemptCount.get(q.id) ?? 0) === 0
    ).length;
    const averageScore =
      attempted.length > 0
        ? attempted.reduce((sum, q) => sum + bestPercent.get(q.id)!, 0) /
          attempted.length
        : null;

    // Même calcul que /memorisation (au prorata des mots de chaque sourate).
    const byChapter = new Map<number, ChapterMemorizationSummary>();
    for (const m of input.memorization) {
      if (m.userId !== member.userId) continue;
      lastActivityAt = latest(lastActivityAt, m.lastUpdatedAt);
      const chapter = chapterById.get(m.chapterId);
      if (!chapter) continue;
      const summary = byChapter.get(m.chapterId) ?? {
        chapter,
        maitrise: 0,
        enCours: 0,
        aRenforcer: 0,
        tracked: 0,
      };
      if (m.status === "maitrise") summary.maitrise += m.count;
      else if (m.status === "en_cours") summary.enCours += m.count;
      else summary.aRenforcer += m.count;
      summary.tracked += m.count;
      byChapter.set(m.chapterId, summary);
    }
    // Les sourates non suivies comptent dans le total de mots du Coran.
    const summaries = input.chapters.map(
      (chapter) =>
        byChapter.get(chapter.id) ?? {
          chapter,
          maitrise: 0,
          enCours: 0,
          aRenforcer: 0,
          tracked: 0,
        }
    );
    const breakdown = computeWordProgressBreakdown(summaries);

    return {
      userId: member.userId,
      name: member.fullName ?? member.email,
      email: member.email,
      leftAt: member.leftAt,
      lessons: { read, total: ressourceIds.size },
      quiz: { passed, total: quiz.length, averageScore, blocked },
      quran: {
        percent:
          breakdown.total > 0 ? (breakdown.maitrise / breakdown.total) * 100 : 0,
        aRenforcer: [...byChapter.values()].reduce((n, s) => n + s.aRenforcer, 0),
      },
      lastActivityAt,
    };
  });
}

export function isInactive(lastActivityAt: Date | null, now: Date): boolean {
  if (!lastActivityAt) return true;
  return now.getTime() - lastActivityAt.getTime() > INACTIVE_AFTER_DAYS * 86_400_000;
}
