"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions/users";

export const teamRoleLabels = { admin: "Admin", contributor: "Éditeur" };

export function UserRoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: keyof typeof teamRoleLabels;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      const result = await updateUserRole(userId, value);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Rôle mis à jour.");
      }
    });
  }

  return (
    <Select
      value={role}
      onValueChange={handleChange}
      disabled={isPending}
      items={teamRoleLabels}
    >
      <SelectTrigger className="w-40">
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
  );
}
