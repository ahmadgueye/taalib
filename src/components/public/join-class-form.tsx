"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { joinClass, type JoinClassState } from "@/lib/actions/class-join";

export function JoinClassForm({ code }: { code: string }) {
  const [state, formAction, isPending] = useActionState<JoinClassState>(
    joinClass.bind(null, code),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button type="submit" disabled={isPending}>
        {isPending ? "Inscription…" : "Rejoindre la classe"}
      </Button>
      {state?.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
