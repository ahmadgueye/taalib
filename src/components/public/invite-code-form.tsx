"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeInviteCode } from "@/lib/class-invite";

export function InviteCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeInviteCode(code);
        if (normalized) router.push(`/rejoindre/${normalized}`);
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
      <Button type="submit">Valider</Button>
    </form>
  );
}
