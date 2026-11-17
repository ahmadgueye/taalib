"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  className,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  // Pour un formulaire envoyé à la main (sans `action`), que useFormStatus
  // ne voit pas.
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" loading={pending} className={className}>
      {pending ? "Enregistrement…" : children}
    </Button>
  );
}
