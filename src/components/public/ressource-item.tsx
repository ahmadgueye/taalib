import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ressourceTypeConfig } from "@/lib/ressource-types";
import { stripMarkdown } from "@/lib/metadata";
import type { RessourceType } from "@/lib/db/queries/search";

const ctaLabelByType: Record<RessourceType, string> = {
  texte: "Lire la suite",
  video: "Regarder",
  pdf: "Consulter",
  lien: "Ouvrir",
};

export function RessourceItem({
  id,
  title,
  type,
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

  return (
    <div className="relative border p-4 transition-colors hover:bg-muted">
      <Link href={`/ressources/${id}`} className="absolute inset-0" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5 text-muted-foreground" />
            <Badge variant="secondary">{label}</Badge>
          </span>
          <div className="mt-1 font-medium">{title}</div>
        </div>
        {completed && (
          <Badge
            variant="outline"
            className="shrink-0 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
          >
            Terminé
          </Badge>
        )}
      </div>
      {type === "texte" && content && (
        <p className="mt-2 text-sm text-muted-foreground">
          {stripMarkdown(content, 240)}
        </p>
      )}
      {type !== "texte" && description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="relative z-10 mt-3 text-sm underline underline-offset-4">
        {ctaLabelByType[type]}
      </div>
    </div>
  );
}
