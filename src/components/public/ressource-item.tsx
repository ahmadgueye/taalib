import Link from "next/link";
import { Hourglass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ressourceTypeConfig } from "@/lib/ressource-types";
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
  description,
  completed,
  locked = false,
}: {
  id: string;
  title: string;
  type: RessourceType;
  url: string | null;
  description?: string | null;
  completed?: boolean;
  // Pas encore débloquée : titre et type seulement, sans lien ni aperçu.
  locked?: boolean;
}) {
  const { label, icon: Icon } = ressourceTypeConfig[type];

  if (locked) {
    return (
      <div className="border border-dashed bg-muted p-4">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="size-3.5 text-locked-foreground" />
          <Badge variant="outline" className="text-locked-foreground">
            {label}
          </Badge>
        </span>
        <div className="mt-1 font-medium text-locked-foreground">{title}</div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-locked-foreground">
          <Hourglass className="size-3.5 shrink-0" />
          À venir : ton enseignant l&apos;ouvrira au fil des cours
        </p>
      </div>
    );
  }

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
      {type !== "texte" && description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="relative z-10 mt-3 text-sm underline underline-offset-4">
        {ctaLabelByType[type]}
      </div>
    </div>
  );
}
