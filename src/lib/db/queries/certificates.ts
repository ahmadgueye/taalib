import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { generateCertificateCode } from "@/lib/certificates";
import type { ContentAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import {
  getStudentRoadmap,
  type RoadmapCours,
} from "@/lib/db/queries/roadmap";
import {
  certificates,
  quiz,
  ressources,
  thematiques,
} from "@/lib/db/schema";

export type CertificateSummary = {
  code: string;
  thematiqueId: string | null;
  thematiqueTitle: string;
  coursTitle: string;
  issuedAt: Date;
};

// Thématiques terminées sur la feuille de route (voir getStudentRoadmap pour
// la règle) : chacune vaut un certificat.
export function completedThematiqueIds(roadmap: RoadmapCours[]) {
  return roadmap.flatMap((c) =>
    c.steps
      .filter((s) => s.state === "completed")
      .map((s) => s.thematique.id)
  );
}

// Numéro du certificat de chaque thématique, pour les liens « Voir le
// certificat ».
export function certificateCodesByThematique(list: CertificateSummary[]) {
  const codes: Record<string, string> = {};
  for (const c of list) if (c.thematiqueId) codes[c.thematiqueId] = c.code;
  return codes;
}

// Délivre un certificat pour chaque thématique validée qui n'en a pas encore.
// Le certificat reste acquis : il n'est jamais retiré, même si l'enseignant
// ajoute ensuite une leçon ou un quiz à la thématique. On fige les titres et
// la liste de ce qui a été validé au moment de l'émission.
export async function issueCertificates(
  userId: string,
  thematiqueIds: string[]
) {
  if (thematiqueIds.length === 0) return;

  const existing = await db
    .select({ thematiqueId: certificates.thematiqueId })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        inArray(certificates.thematiqueId, thematiqueIds)
      )
    );
  const done = new Set(existing.map((c) => c.thematiqueId));
  const missing = thematiqueIds.filter((id) => !done.has(id));
  if (missing.length === 0) return;

  const rows = await db.query.thematiques.findMany({
    where: inArray(thematiques.id, missing),
    columns: { id: true, title: true },
    with: {
      cours: { columns: { title: true } },
      ressources: {
        where: eq(ressources.status, "published"),
        orderBy: [asc(ressources.orderIndex), asc(ressources.title)],
        columns: { title: true },
      },
      quiz: {
        where: eq(quiz.status, "published"),
        orderBy: [asc(quiz.orderIndex), asc(quiz.createdAt)],
        columns: { title: true },
      },
    },
  });

  // Deux pages ouvertes en même temps peuvent émettre ensemble : l'index
  // unique (étudiant, thématique) garde un seul certificat. Une collision de
  // numéro, très improbable, ignore aussi la ligne, réémise à la visite
  // suivante.
  await db
    .insert(certificates)
    .values(
      rows.map((t) => ({
        code: generateCertificateCode(),
        userId,
        thematiqueId: t.id,
        thematiqueTitle: t.title,
        coursTitle: t.cours.title,
        lessonTitles: t.ressources.map((r) => r.title),
        quizTitles: t.quiz.map((q) => q.title),
      }))
    )
    .onConflictDoNothing();
}

// Pour les Server Actions qui peuvent terminer une thématique (leçon lue,
// quiz réussi) : la date du certificat est celle de la validation.
export async function syncCertificates(userId: string, access: ContentAccess) {
  if (access.all) return;
  const { cours } = await getStudentRoadmap(userId, access);
  await issueCertificates(userId, completedThematiqueIds(cours));
}

export async function getCertificatesForUser(
  userId: string
): Promise<CertificateSummary[]> {
  return db
    .select({
      code: certificates.code,
      thematiqueId: certificates.thematiqueId,
      thematiqueTitle: certificates.thematiqueTitle,
      coursTitle: certificates.coursTitle,
      issuedAt: certificates.issuedAt,
    })
    .from(certificates)
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));
}

export async function getCertificateForThematique(
  userId: string,
  thematiqueId: string
) {
  return db.query.certificates.findFirst({
    where: and(
      eq(certificates.userId, userId),
      eq(certificates.thematiqueId, thematiqueId)
    ),
    columns: { code: true, issuedAt: true },
  });
}

// Pour la page publique : le certificat et le nom actuel de son titulaire.
export async function getCertificateByCode(code: string) {
  return db.query.certificates.findFirst({
    where: eq(certificates.code, code),
    with: { user: { columns: { fullName: true } } },
  });
}
