"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { GraduationCap, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addClassMember,
  finishClassMember,
  reinstateClassMember,
  removeClassMember,
  type ActionState,
} from "@/lib/actions/classes";

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  joinedAt: Date;
  leftAt: Date | null;
};

export function ClassMembers({
  classId,
  members,
}: {
  classId: string;
  members: Member[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addClassMember.bind(null, classId),
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const active = members.filter((m) => m.leftAt === null);
  const former = members.filter((m) => m.leftAt !== null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex items-start gap-2">
        <FieldGroup className="flex-1">
          <Field>
            <Input
              name="email"
              type="email"
              placeholder="E-mail de l'étudiant"
              aria-label="E-mail de l'étudiant"
              required
            />
            {state?.error && <FieldError>{state.error}</FieldError>}
          </Field>
        </FieldGroup>
        <SubmitButton>Ajouter</SubmitButton>
      </form>

      {active.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Aucun étudiant dans cette classe.
        </p>
      ) : (
        <MembersTable classId={classId} members={active} />
      )}

      {former.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium">
            Anciens élèves ({former.length})
          </h3>
          <MembersTable classId={classId} members={former} />
        </div>
      )}
    </div>
  );
}

function MembersTable({
  classId,
  members,
}: {
  classId: string;
  members: Member[];
}) {
  const former = members[0]?.leftAt != null;
  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>{former ? "Terminé le" : "Inscrit le"}</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => {
          const label = m.fullName ?? m.email;
          return (
            <TableRow key={m.userId}>
              <TableCell className="font-medium">{m.fullName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{m.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(m.leftAt ?? m.joinedAt).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  {m.leftAt ? (
                    <ReinstateButton classId={classId} member={m} />
                  ) : (
                    <DeleteButton
                      action={finishClassMember.bind(null, classId, m.userId)}
                      itemLabel={label}
                      title={`Terminer la classe pour ${label} ?`}
                      description="Ancien élève, l'étudiant garde l'accès à ce qui est débloqué aujourd'hui, mais pas aux prochains déblocages."
                      confirmLabel="Terminer"
                      successMessage={`Classe terminée pour ${label}.`}
                      icon={GraduationCap}
                      destructive={false}
                    />
                  )}
                  <DeleteButton
                    action={removeClassMember.bind(null, classId, m.userId)}
                    itemLabel={label}
                    title={`Retirer ${label} de la classe ?`}
                    description="L'étudiant perd l'accès à tout le contenu de la classe. Son compte et sa progression sont conservés."
                    confirmLabel="Retirer"
                    successMessage={`Retiré de la classe : ${label}.`}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ReinstateButton({
  classId,
  member,
}: {
  classId: string;
  member: Member;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label={`Réintégrer ${member.fullName ?? member.email}`}
      title="Réintégrer dans la classe"
      onClick={() =>
        startTransition(() => reinstateClassMember(classId, member.userId))
      }
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Undo2 className="size-4" />
      )}
    </Button>
  );
}
