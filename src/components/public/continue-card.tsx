import Link from "next/link";
import { ArrowRight, BookOpen, Check, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RoadmapNext } from "@/lib/db/queries/roadmap";

// En tête de l'accueil étudiant : ce qu'il a à faire maintenant, en un clic.
export function ContinueCard({ next }: { next: RoadmapNext | null }) {
  if (!next) {
    return (
      <div className="flex items-center gap-4 border border-dashed bg-muted p-4">
        <div className="flex size-10 shrink-0 items-center justify-center border border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950">
          <Check className="size-4" />
        </div>
        <div>
          <div className="font-medium">Tu es à jour</div>
          <p className="text-sm text-muted-foreground">
            Tu as fait tout ce qui est ouvert. La suite s&apos;ouvrira au fil
            des cours.
          </p>
        </div>
      </div>
    );
  }

  const Icon = next.kind === "quiz" ? ClipboardCheck : BookOpen;
  return (
    <Link
      href={next.kind === "quiz" ? `/quiz/${next.id}` : `/ressources/${next.id}`}
      className="group flex items-center gap-4 border border-foreground p-4 transition-colors hover:bg-muted"
    >
      <div className="flex size-10 shrink-0 items-center justify-center bg-foreground text-background">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {next.kind === "quiz" ? "Passer le quiz" : "Continuer"}
          </span>
          {next.isNew && <Badge>Nouveau</Badge>}
        </div>
        <div className="mt-1 font-medium">{next.title}</div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {next.coursTitle} · {next.thematiqueTitle}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
