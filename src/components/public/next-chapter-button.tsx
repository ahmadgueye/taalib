"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markRessourceCompleted } from "@/lib/actions/progress";

export function NextChapterButton({
  ressourceId,
  href,
  label,
}: {
  ressourceId: string;
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markRessourceCompleted(ressourceId, pathname);
      router.push(href);
    });
  }

  return (
    <Button type="button" disabled={isPending} onClick={handleClick}>
      {label}
      <ChevronRight />
    </Button>
  );
}
