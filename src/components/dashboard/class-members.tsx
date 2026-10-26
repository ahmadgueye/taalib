"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SubmitButton } from "@/components/dashboard/submit-button";
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
  removeClassMember,
  type ActionState,
} from "@/lib/actions/classes";

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  joinedAt: Date;
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

      {members.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Aucun étudiant dans cette classe.
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell className="font-medium">
                  {m.fullName ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(m.joinedAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="text-right">
                  <DeleteButton
                    action={removeClassMember.bind(null, classId, m.userId)}
                    itemLabel={m.fullName ?? m.email}
                    title={`Retirer ${m.fullName ?? m.email} de la classe ?`}
                    description="Son compte et sa progression sont conservés."
                    confirmLabel="Retirer"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
