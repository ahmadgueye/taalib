"use server";

import { and, asc, eq, inArray, notExists, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-session";
import { generateInviteCode } from "@/lib/class-invite";
import { db } from "@/lib/db";
import {
  classCours,
  classMembers,
  classQuizUnlocks,
  classRessourceUnlocks,
  classes,
  profiles,
  quiz,
  ressources,
  thematiques,
} from "@/lib/db/schema";

export type ActionState = { error?: string; success?: string } | undefined;

// Les classes regroupent des étudiants (données personnelles) : réservées aux
// admins, pas aux contributeurs qui ne gèrent que le contenu.

const classSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  description: z.string().trim().optional(),
});

export async function createClass(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireAdmin();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [created] = await db
    .insert(classes)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      inviteCode: generateInviteCode(),
      createdBy: profile.id,
    })
    .returning({ id: classes.id });

  revalidatePath("/dashboard/classes");
  redirect(`/dashboard/classes/${created.id}`);
}

export async function updateClass(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .update(classes)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(classes.id, id));

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${id}`);
  return { success: "Classe enregistrée." };
}

export async function deleteClass(id: string) {
  await requireAdmin();
  await db.delete(classes).where(eq(classes.id, id));
  revalidatePath("/dashboard/classes");
}

export async function regenerateInviteCode(id: string) {
  await requireAdmin();
  await db
    .update(classes)
    .set({ inviteCode: generateInviteCode(), updatedAt: new Date() })
    .where(eq(classes.id, id));
  revalidatePath(`/dashboard/classes/${id}`);
}

export async function setInviteEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await db
    .update(classes)
    .set({ inviteEnabled: enabled, updatedAt: new Date() })
    .where(eq(classes.id, id));
  revalidatePath(`/dashboard/classes/${id}`);
}

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export async function addClassMember(
  classId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = addMemberSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [student] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${parsed.data.email}`)
    .limit(1);
  if (!student) {
    return {
      error:
        "Aucun compte avec cet e-mail. L'étudiant doit d'abord se connecter une fois, ou rejoindre avec le code d'invitation.",
    };
  }

  const inserted = await db
    .insert(classMembers)
    .values({ classId, userId: student.id })
    .onConflictDoNothing()
    .returning({ userId: classMembers.userId });
  if (inserted.length === 0) {
    return { error: "Cet étudiant fait déjà partie de la classe." };
  }

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { success: "Étudiant ajouté." };
}

export async function removeClassMember(classId: string, userId: string) {
  await requireAdmin();
  await db
    .delete(classMembers)
    .where(
      and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))
    );
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
}

const addCoursSchema = z.object({
  coursId: z.uuid("Choisis un cours."),
});

export async function addClassCours(
  classId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = addCoursSchema.safeParse({ coursId: formData.get("coursId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .insert(classCours)
    .values({ classId, coursId: parsed.data.coursId })
    .onConflictDoNothing();

  revalidatePath(`/dashboard/classes/${classId}`);
  return undefined;
}

// Retirer un cours efface aussi les déblocages de ses ressources et quiz pour
// cette classe : le remettre plus tard repart d'un cours entièrement verrouillé.
export async function removeClassCours(classId: string, coursId: string) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    const coursRessources = tx
      .select({ id: ressources.id })
      .from(ressources)
      .innerJoin(thematiques, eq(thematiques.id, ressources.thematiqueId))
      .where(eq(thematiques.coursId, coursId));
    const coursQuiz = tx
      .select({ id: quiz.id })
      .from(quiz)
      .innerJoin(thematiques, eq(thematiques.id, quiz.thematiqueId))
      .where(eq(thematiques.coursId, coursId));
    await tx
      .delete(classRessourceUnlocks)
      .where(
        and(
          eq(classRessourceUnlocks.classId, classId),
          inArray(classRessourceUnlocks.ressourceId, coursRessources)
        )
      );
    await tx
      .delete(classQuizUnlocks)
      .where(
        and(
          eq(classQuizUnlocks.classId, classId),
          inArray(classQuizUnlocks.quizId, coursQuiz)
        )
      );
    await tx
      .delete(classCours)
      .where(and(eq(classCours.classId, classId), eq(classCours.coursId, coursId)));
  });
  revalidatePath(`/dashboard/classes/${classId}`);
}

// Seuls les éléments publiés d'un cours suivi par la classe se débloquent :
// un brouillon reste invisible quoi qu'il arrive.
function classRessources(classId: string, where: SQL | undefined) {
  return db
    .select({ id: ressources.id })
    .from(ressources)
    .innerJoin(thematiques, eq(thematiques.id, ressources.thematiqueId))
    .innerJoin(
      classCours,
      and(
        eq(classCours.coursId, thematiques.coursId),
        eq(classCours.classId, classId)
      )
    )
    .where(and(eq(ressources.status, "published"), where));
}

function classQuiz(classId: string, where: SQL | undefined) {
  return db
    .select({ id: quiz.id })
    .from(quiz)
    .innerJoin(thematiques, eq(thematiques.id, quiz.thematiqueId))
    .innerJoin(
      classCours,
      and(
        eq(classCours.coursId, thematiques.coursId),
        eq(classCours.classId, classId)
      )
    )
    .where(and(eq(quiz.status, "published"), where));
}

const notInClass = {
  error: "Cet élément ne fait partie d'aucun cours publié de la classe.",
};

export async function setRessourceUnlocked(
  classId: string,
  ressourceId: string,
  unlocked: boolean
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!unlocked) {
    await db
      .delete(classRessourceUnlocks)
      .where(
        and(
          eq(classRessourceUnlocks.classId, classId),
          eq(classRessourceUnlocks.ressourceId, ressourceId)
        )
      );
  } else {
    const [found] = await classRessources(classId, eq(ressources.id, ressourceId));
    if (!found) return notInClass;
    await db
      .insert(classRessourceUnlocks)
      .values({ classId, ressourceId })
      .onConflictDoNothing();
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return {};
}

export async function setQuizUnlocked(
  classId: string,
  quizId: string,
  unlocked: boolean
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!unlocked) {
    await db
      .delete(classQuizUnlocks)
      .where(
        and(eq(classQuizUnlocks.classId, classId), eq(classQuizUnlocks.quizId, quizId))
      );
  } else {
    const [found] = await classQuiz(classId, eq(quiz.id, quizId));
    if (!found) return notInClass;
    await db
      .insert(classQuizUnlocks)
      .values({ classId, quizId })
      .onConflictDoNothing();
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return {};
}

// Le geste de la semaine : ouvre la première ressource encore verrouillée de
// la thématique, dans l'ordre défini dans le dashboard.
export async function unlockNextRessource(
  classId: string,
  thematiqueId: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const [next] = await classRessources(
    classId,
    and(
      eq(ressources.thematiqueId, thematiqueId),
      notExists(
        db
          .select({ one: sql`1` })
          .from(classRessourceUnlocks)
          .where(
            and(
              eq(classRessourceUnlocks.classId, classId),
              eq(classRessourceUnlocks.ressourceId, ressources.id)
            )
          )
      )
    )
  )
    .orderBy(asc(ressources.orderIndex), asc(ressources.title))
    .limit(1);
  if (!next) {
    return { error: "Toutes les ressources de cette thématique sont déjà débloquées." };
  }

  await db
    .insert(classRessourceUnlocks)
    .values({ classId, ressourceId: next.id })
    .onConflictDoNothing();
  revalidatePath(`/dashboard/classes/${classId}`);
  return {};
}

export async function unlockAllInThematique(classId: string, thematiqueId: string) {
  await requireAdmin();
  const [ressourceRows, quizRows] = await Promise.all([
    classRessources(classId, eq(ressources.thematiqueId, thematiqueId)),
    classQuiz(classId, eq(quiz.thematiqueId, thematiqueId)),
  ]);
  if (ressourceRows.length > 0) {
    await db
      .insert(classRessourceUnlocks)
      .values(ressourceRows.map((r) => ({ classId, ressourceId: r.id })))
      .onConflictDoNothing();
  }
  if (quizRows.length > 0) {
    await db
      .insert(classQuizUnlocks)
      .values(quizRows.map((q) => ({ classId, quizId: q.id })))
      .onConflictDoNothing();
  }
  revalidatePath(`/dashboard/classes/${classId}`);
}
