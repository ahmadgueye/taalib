import Link from "next/link";
import { BookOpen, Check, ClipboardCheck, MoveRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RoadmapNext } from "@/lib/db/queries/roadmap";

// En tête de l'accueil étudiant : une ligne par cours avec ce qu'il a à faire
// maintenant, comme un récapitulatif discret.
export function TodoList({ todo }: { todo: RoadmapNext[] }) {
  return (
    <section aria-labelledby="todo-heading">
      <h2
        id="todo-heading"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        À faire
      </h2>
      {todo.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 border-y py-2.5 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          Tu es à jour. La suite s&apos;ouvrira au fil des cours.
        </p>
      ) : (
        <ul className="mt-2 divide-y border-y">
          {todo.map((item) => {
            const Icon = item.kind === "quiz" ? ClipboardCheck : BookOpen;
            return (
              <li key={item.id}>
                <Link
                  href={
                    item.kind === "quiz"
                      ? `/quiz/${item.id}`
                      : `/ressources/${item.id}`
                  }
                  className="group flex items-center gap-3 py-2.5 text-sm"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium group-hover:underline group-hover:underline-offset-4">
                      {item.kind === "quiz" && "Quiz : "}
                      {item.title}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {item.coursTitle}
                    </span>
                  </span>
                  {item.isNew && (
                    <Badge className="h-4 px-1.5 text-[10px]">Nouveau</Badge>
                  )}
                  <MoveRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
