"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeInviteCode } from "@/lib/class-invite";

export function InviteCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeInviteCode(code);
        if (normalized) {
          startTransition(() => router.push(`/rejoindre/${normalized}`));
        }
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code d'invitation"
        aria-label="Code d'invitation"
        className="font-mono uppercase"
        autoComplete="off"
        required
      />
      <Button type="submit" loading={isPending}>
        Valider
      </Button>
    </form>
  );
}
