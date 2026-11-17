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
    // Un nouvel inscrit n'est pas signalé inactif avant d'en avoir eu le temps.
    joinedAt?: Date;
  }[];
  // Ressources et quiz publiés, débloqués pour la classe.
  ressources: { id: string; unlockedAt: Date }[];
  // `maxAttempts` : limite de tentatives du quiz (null ou absent = illimité).
  quiz: {
    id: string;
    title?: string;
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

type Member = ClassProgressInput["members"][number];

// Un ancien élève garde ce qui était débloqué avant son départ : on le juge
// sur ce périmètre, pas sur ce qui a été ouvert depuis.
function visibleTo(member: Member, unlockedAt: Date) {
  return member.leftAt === null || unlockedAt <= member.leftAt;
}

// Où en est un étudiant sur chacun des quiz débloqués pour lui.
function memberQuizStates(input: ClassProgressInput, member: Member) {
  const bestPercent = new Map<string, number>();
  const attemptCount = new Map<string, number>();
  for (const a of input.attempts) {
    if (a.userId !== member.userId) continue;
    const percent = a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
    bestPercent.set(a.quizId, Math.max(bestPercent.get(a.quizId) ?? 0, percent));
    attemptCount.set(a.quizId, (attemptCount.get(a.quizId) ?? 0) + 1);
  }
  const extras = new Map(
    (input.extraAttempts ?? [])
      .filter((e) => e.userId === member.userId)
      .map((e) => [e.quizId, e.extra])
  );

  return input.quiz
    .filter((q) => visibleTo(member, q.unlockedAt))
    .map((q) => {
      const best = bestPercent.get(q.id) ?? null;
      const passed = best !== null && best >= q.passingScore;
      const left = attemptsLeft(
        q.maxAttempts ?? null,
        extras.get(q.id) ?? 0,
        attemptCount.get(q.id) ?? 0
      );
      return { quizId: q.id, best, passed, blocked: !passed && left === 0 };
    });
}

export type ClassQuizProgress = {
  // Étudiants qui voient le quiz (actifs, ou anciens si débloqué avant leur
  // départ).
  students: number;
  passed: number;
  attempted: number;
  blocked: number;
  // Moyenne des meilleurs scores (en %) des étudiants qui l'ont tenté.
  averageScore: number | null;
};

// Le même suivi, quiz par quiz.
export function buildClassQuizProgress(
  input: ClassProgressInput
): Record<string, ClassQuizProgress> {
  const result: Record<string, ClassQuizProgress> = {};
  const bestScores = new Map<string, number[]>();
  for (const q of input.quiz) {
    result[q.id] = {
      students: 0,
      passed: 0,
      attempted: 0,
      blocked: 0,
      averageScore: null,
    };
    bestScores.set(q.id, []);
  }
  for (const member of input.members) {
    for (const state of memberQuizStates(input, member)) {
      const stats = result[state.quizId];
      stats.students += 1;
      if (state.passed) stats.passed += 1;
      if (state.blocked) stats.blocked += 1;
      if (state.best !== null) {
        stats.attempted += 1;
        bestScores.get(state.quizId)!.push(state.best);
      }
    }
  }
  for (const [quizId, scores] of bestScores) {
    if (scores.length > 0) {
      result[quizId].averageScore =
        scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
  }
  return result;
}

export function buildClassProgress(input: ClassProgressInput): StudentProgress[] {
  const chapterById = new Map(input.chapters.map((c) => [c.id, c]));

  return input.members.map((member) => {
    const ressourceIds = new Set(
      input.ressources
        .filter((r) => visibleTo(member, r.unlockedAt))
        .map((r) => r.id)
    );

    let lastActivityAt: Date | null = null;

    let read = 0;
    for (const c of input.completions) {
      if (c.userId !== member.userId) continue;
      lastActivityAt = latest(lastActivityAt, c.completedAt);
      if (ressourceIds.has(c.ressourceId)) read += 1;
    }

    for (const a of input.attempts) {
      if (a.userId === member.userId) {
        lastActivityAt = latest(lastActivityAt, a.completedAt);
      }
    }
    const quiz = memberQuizStates(input, member);
    const attempted = quiz.filter((q) => q.best !== null);
    const passed = quiz.filter((q) => q.passed).length;
    const blocked = quiz.filter((q) => q.blocked).length;
    const averageScore =
      attempted.length > 0
        ? attempted.reduce((sum, q) => sum + q.best!, 0) / attempted.length
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

// Un quiz est signalé quand, parmi au moins ce nombre d'étudiants qui l'ont
// tenté, moins de la moitié l'a réussi.
export const STRUGGLING_MIN_ATTEMPTED = 2;

export type ClassWatchlist = {
  blocked: { userId: string; name: string; quizId: string; quizTitle: string }[];
  inactive: { userId: string; name: string; lastActivityAt: Date | null }[];
  strugglingQuiz: {
    quizId: string;
    quizTitle: string;
    passed: number;
    attempted: number;
  }[];
};

// Ce qui demande l'attention de l'enseignant dans une classe, pour l'accueil
// du dashboard. Les anciens élèves n'y figurent pas.
export function buildClassWatchlist(
  input: ClassProgressInput,
  now: Date
): ClassWatchlist {
  const active = input.members.filter((m) => m.leftAt === null);
  const titles = new Map(input.quiz.map((q) => [q.id, q.title ?? "Quiz"]));
  const progress = new Map(
    buildClassProgress(input).map((p) => [p.userId, p])
  );

  const blocked = active.flatMap((member) =>
    memberQuizStates(input, member)
      .filter((q) => q.blocked)
      .map((q) => ({
        userId: member.userId,
        name: member.fullName ?? member.email,
        quizId: q.quizId,
        quizTitle: titles.get(q.quizId)!,
      }))
  );

  const inactive = active
    .map((member) => ({
      member,
      lastActivityAt: progress.get(member.userId)?.lastActivityAt ?? null,
    }))
    .filter(({ member, lastActivityAt }) => {
      const since =
        member.joinedAt && (!lastActivityAt || member.joinedAt > lastActivityAt)
          ? member.joinedAt
          : lastActivityAt;
      return isInactive(since, now);
    })
    // Les plus anciens d'abord, ceux qui n'ont jamais rien fait en tête.
    .sort(
      (a, b) =>
        (a.lastActivityAt?.getTime() ?? 0) - (b.lastActivityAt?.getTime() ?? 0)
    )
    .map(({ member, lastActivityAt }) => ({
      userId: member.userId,
      name: member.fullName ?? member.email,
      lastActivityAt,
    }));

  const strugglingQuiz = Object.entries(buildClassQuizProgress(input))
    .filter(
      ([, q]) =>
        q.attempted >= STRUGGLING_MIN_ATTEMPTED && q.passed * 2 < q.attempted
    )
    .map(([quizId, q]) => ({
      quizId,
      quizTitle: titles.get(quizId)!,
      passed: q.passed,
      attempted: q.attempted,
    }))
    .sort((a, b) => a.passed / a.attempted - b.passed / b.attempted);

  return { blocked, inactive, strugglingQuiz };
}
