import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  MoveRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RoadmapTodo } from "@/lib/db/queries/roadmap";

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

// En tête de l'accueil étudiant : tout ce qu'il a à faire, résumé en une
// ligne et dépliable. Ouverte d'office quand il y a du nouveau, pour qu'une
// leçon tout juste débloquée ne passe pas inaperçue.
export function TodoList({ todo }: { todo: RoadmapTodo[] }) {
  if (todo.length === 0) {
    return (
      <p className="flex items-center gap-2 border-y py-2.5 text-sm text-muted-foreground">
        <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          <span className="font-medium text-foreground">À faire</span> · Tu es
          à jour. La suite s&apos;ouvrira au fil des cours.
        </span>
      </p>
    );
  }

  const lessons = todo.filter((t) => t.kind === "ressource").length;
  const quizzes = todo.length - lessons;
  const newCount = todo.filter((t) => t.isNew).length;
  const summary = [
    lessons > 0 && plural(lessons, "leçon", "leçons"),
    quizzes > 0 && plural(quizzes, "quiz", "quiz"),
  ]
    .filter(Boolean)
    .join(" et ");

  // Regroupé par cours, dans l'ordre de la feuille de route.
  const groups: { coursId: string; coursTitle: string; items: RoadmapTodo[] }[] =
    [];
  for (const item of todo) {
    const last = groups.at(-1);
    if (last?.coursId === item.coursId) last.items.push(item);
    else
      groups.push({
        coursId: item.coursId,
        coursTitle: item.coursTitle,
        items: [item],
      });
  }

  return (
    <details open={newCount > 0} className="group/todo border-y">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium">À faire</span>
        <span className="text-muted-foreground">· {summary}</span>
        {newCount > 0 && (
          <Badge className="h-4 px-1.5 text-[10px]">
            {plural(newCount, "nouveau", "nouveaux")}
          </Badge>
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open/todo:rotate-180" />
      </summary>
      <div className="pb-2">
        {groups.map((group) => (
          <div key={group.coursId}>
            {groups.length > 1 && (
              <h3 className="pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.coursTitle}
              </h3>
            )}
            <ul className="divide-y border-t">
              {group.items.map((item) => (
                <TodoRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function TodoRow({ item }: { item: RoadmapTodo }) {
  const Icon = item.kind === "quiz" ? ClipboardCheck : BookOpen;
  return (
    <li>
      <Link
        href={item.kind === "quiz" ? `/quiz/${item.id}` : `/ressources/${item.id}`}
        className="group flex items-center gap-3 py-2.5 text-sm"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium group-hover:underline group-hover:underline-offset-4">
            {item.kind === "quiz" && "Quiz : "}
            {item.title}
          </span>
          <span className="text-muted-foreground"> · {item.thematiqueTitle}</span>
        </span>
        {item.isNew && <Badge className="h-4 px-1.5 text-[10px]">Nouveau</Badge>}
        <MoveRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </li>
  );
}
