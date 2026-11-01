import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ClassCours } from "@/components/dashboard/class-cours";
import { ClassForm } from "@/components/dashboard/class-form";
import { ClassInvitePanel } from "@/components/dashboard/class-invite-panel";
import { ClassMembers } from "@/components/dashboard/class-members";
import { ClassProgressTable } from "@/components/dashboard/class-progress-table";
import { ClassTabs, type ClassTab } from "@/components/dashboard/class-tabs";
import { getCurrentProfile } from "@/lib/auth/get-session";
import {
  getClassById,
  getClassCoursOutline,
  getClassMembers,
  getCoursNotInClass,
} from "@/lib/db/queries/classes";
import { getClassProgress } from "@/lib/db/queries/class-progress";

const classTabs: ClassTab[] = ["suivi", "cours", "etudiants", "reglages"];

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
};

function Section({
  hint,
  className,
  children,
}: {
  hint: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground">{hint}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default async function ClassPage({ params, searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const [{ id }, { onglet }] = await Promise.all([params, searchParams]);
  const [classe, members, coursOutline, availableCours, progress] =
    await Promise.all([
      getClassById(id),
      getClassMembers(id),
      getClassCoursOutline(id),
      getCoursNotInClass(id),
      getClassProgress(id),
    ]);

  if (!classe) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Classes", href: "/dashboard/classes" },
          { label: classe.name },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {classe.name}
      </h1>

      <ClassTabs
        defaultTab={classTabs.find((t) => t === onglet) ?? "suivi"}
        studentCount={members.filter((m) => m.leftAt === null).length}
        suivi={
          <Section hint="Leçons lues et quiz réussis parmi ce qui est débloqué pour la classe, mémorisation du Coran et dernière activité (leçon, quiz ou verset).">
            <ClassProgressTable
              classId={classe.id}
              students={progress}
              now={new Date()}
            />
          </Section>
        }
        cours={
          <Section
            className="max-w-2xl"
            hint="Débloque les ressources et les quiz au fil des semaines. Les étudiants ne voient que ce qui est débloqué, et une thématique apparaît dès que l'un de ses éléments l'est."
          >
            <ClassCours
              classId={classe.id}
              cours={coursOutline}
              availableCours={availableCours}
            />
          </Section>
        }
        etudiants={
          <Section
            className="max-w-2xl"
            hint="Ajoute un étudiant avec l'e-mail de son compte. Il doit s'être connecté au moins une fois. « Terminer » en fait un ancien élève : il garde ce qui était débloqué jusque-là, sans les déblocages suivants. « Retirer » lui enlève tout accès."
          >
            <ClassMembers classId={classe.id} members={members} />
          </Section>
        }
        reglages={
          <div className="flex max-w-2xl flex-col gap-10">
            <ClassForm classe={classe} />
            <section>
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
          </div>
        }
      />
    </div>
  );
}
