import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MarkCompleteButton } from "@/components/public/mark-complete-button";
import { ressourceTypeConfig } from "@/lib/ressource-types";
import { stripMarkdown } from "@/lib/metadata";
import type { RessourceType } from "@/lib/db/queries/search";

export function RessourceItem({
  id,
  title,
  type,
  url,
  content,
  description,
  completed,
}: {
  id: string;
  title: string;
  type: RessourceType;
  url: string | null;
  content?: string | null;
  description?: string | null;
  completed?: boolean;
}) {
  const { label, icon: Icon } = ressourceTypeConfig[type];
  const header = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <Badge variant="secondary">{label}</Badge>
      </span>
      <div className="mt-1 font-medium">{title}</div>
    </>
  );

  const markCompleteSlot = completed !== undefined && (
    <div className="relative z-10 mt-3 flex justify-end">
      <MarkCompleteButton
        key={`${id}-${completed}`}
        ressourceId={id}
        completed={completed}
      />
    </div>
  );

  if (type === "texte") {
    return (
      <div className="relative border p-4 transition-colors hover:bg-muted">
        <Link href={`/ressources/${id}`} className="absolute inset-0" />
        {header}
        {content && (
          <p className="mt-2 text-sm text-muted-foreground">
            {stripMarkdown(content, 240)}
          </p>
        )}
        <span className="mt-2 inline-block text-sm underline underline-offset-4">
          Lire la suite
        </span>
        {markCompleteSlot}
      </div>
    );
  }

  return (
    <div className="relative border p-4 transition-colors hover:bg-muted">
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
      />
      {header}
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {markCompleteSlot}
    </div>
  );
}
