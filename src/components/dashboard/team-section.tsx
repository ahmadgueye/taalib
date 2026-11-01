"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  UserRoleSelect,
  teamRoleLabels,
} from "@/components/dashboard/user-role-select";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addTeamMember,
  removeFromTeam,
  type ActionState,
} from "@/lib/actions/users";

type Member = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "contributor" | "viewer";
};

export function TeamSection({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addTeamMember,
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
      <form
        ref={formRef}
        action={formAction}
        className="flex max-w-2xl flex-wrap items-start gap-2"
      >
        <FieldGroup className="min-w-56 flex-1">
          <Field>
            <Input
              name="email"
              type="email"
              placeholder="E-mail de la personne"
              aria-label="E-mail de la personne"
              required
            />
            {state?.error && <FieldError>{state.error}</FieldError>}
          </Field>
        </FieldGroup>
        <Select name="role" defaultValue="contributor" items={teamRoleLabels}>
          <SelectTrigger className="w-40" aria-label="Rôle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(teamRoleLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton>Ajouter à l&apos;équipe</SubmitButton>
      </form>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead className="w-44">Rôle</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const label = m.fullName ?? m.email;
            const isSelf = m.id === currentUserId;
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.fullName ?? "—"}
                  {isSelf && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (toi)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.email}
                </TableCell>
                <TableCell>
                  {m.role !== "viewer" && (
                    <UserRoleSelect userId={m.id} role={m.role} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!isSelf && (
                    <DeleteButton
                      action={removeFromTeam.bind(null, m.id)}
                      itemLabel={label}
                      icon={UserMinus}
                      title={`Retirer « ${label} » de l'équipe ?`}
                      description="La personne n'aura plus accès au dashboard. Son compte, ses classes et sa progression sont conservés."
                      confirmLabel="Retirer l'accès"
                      successMessage={`« ${label} » retiré de l'équipe.`}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
