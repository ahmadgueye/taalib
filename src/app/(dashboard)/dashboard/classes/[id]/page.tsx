import { notFound } from "next/navigation";

import { ClassCours } from "@/components/dashboard/class-cours";
import { ClassForm } from "@/components/dashboard/class-form";
import { ClassInvitePanel } from "@/components/dashboard/class-invite-panel";
import { ClassMembers } from "@/components/dashboard/class-members";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getClassById,
  getClassCoursOutline,
  getClassMembers,
  getCoursNotInClass,
} from "@/lib/db/queries/classes";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClassPage({ params }: Props) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const { id } = await params;
  const [classe, members, coursOutline, availableCours] = await Promise.all([
    getClassById(id),
    getClassMembers(id),
    getClassCoursOutline(id),
    getCoursNotInClass(id),
  ]);

  if (!classe) notFound();

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {classe.name}
      </h1>

      <section className="mt-6">
        <ClassForm classe={classe} />
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Cours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Débloque les thématiques au fil de l&apos;avancement de la classe.
          Une thématique verrouillée restera invisible pour les étudiants.
        </p>
        <div className="mt-4">
          <ClassCours
            classId={classe.id}
            cours={coursOutline}
            availableCours={availableCours}
          />
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Code d&apos;invitation
        </h2>
        <div className="mt-4">
          <ClassInvitePanel
            classId={classe.id}
            inviteCode={classe.inviteCode}
            inviteEnabled={classe.inviteEnabled}
          />
        </div>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Étudiants ({members.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoute un étudiant avec l&apos;e-mail de son compte. Il doit
          s&apos;être connecté au moins une fois.
        </p>
        <div className="mt-4">
          <ClassMembers classId={classe.id} members={members} />
        </div>
      </section>
    </div>
  );
}
