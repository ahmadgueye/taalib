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
// ligne et dépliable, une ligne par thématique. Ouverte d'office quand il y a du nouveau, pour qu'une
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

  // Une ligne par thématique, dans l'ordre de la feuille de route : débloquer
  // une sourate entière ajoute une ligne, pas dix.
  const groups: RoadmapTodo[][] = [];
  for (const item of todo) {
    const last = groups.at(-1);
    if (last?.[0].thematiqueId === item.thematiqueId) last.push(item);
    else groups.push([item]);
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
      <ul className="divide-y border-t">
        {groups.map((items) => (
          <TodoGroupRow key={items[0].thematiqueId} items={items} />
        ))}
      </ul>
    </details>
  );
}

// Une thématique : ce qu'il reste à y faire, et un lien droit vers l'élément
// suivant (leçons dans l'ordre, puis quiz).
function TodoGroupRow({ items }: { items: RoadmapTodo[] }) {
  const next = items[0];
  const lessons = items.filter((t) => t.kind === "ressource").length;
  const quizzes = items.length - lessons;
  const fresh = items.filter((t) => t.isNew).length;
  const counts = [
    lessons > 0 && plural(lessons, "leçon", "leçons"),
    quizzes > 0 && plural(quizzes, "quiz", "quiz"),
    fresh > 0 && plural(fresh, "nouveau", "nouveaux"),
  ]
    .filter(Boolean)
    .join(" · ");
  const Icon = next.kind === "quiz" ? ClipboardCheck : BookOpen;

  return (
    <li>
      <Link
        href={next.kind === "quiz" ? `/quiz/${next.id}` : `/ressources/${next.id}`}
        className="group flex items-center gap-3 py-2.5 text-sm"
      >
        {/* Emplacement réservé : les titres restent alignés d'une ligne à l'autre. */}
        {fresh > 0 ? <NewDot /> : <span className="size-2 shrink-0" aria-hidden />}
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            <span className="font-medium group-hover:underline group-hover:underline-offset-4">
              {next.thematiqueTitle}
            </span>
            <span className="text-muted-foreground"> · {next.coursTitle}</span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0">{counts}</span>
            <span aria-hidden>·</span>
            <Icon className="size-3 shrink-0" />
            <span className="truncate">
              {next.kind === "quiz" && "Quiz : "}
              {next.title}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
          <span className="hidden sm:inline">
            {next.kind === "quiz" ? "Passer le quiz" : "Continuer"}
          </span>
          <MoveRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

// Le résumé dit déjà « x nouveaux » : sur la ligne, une pastille suffit. Elle
// pulse trois fois à l'arrivée, comme le carré de la feuille de route.
function NewDot() {
  return (
    <span className="relative flex size-2 shrink-0" title="Nouveau">
      <span
        className="absolute inset-0 bg-primary/60 motion-safe:animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_3]"
        aria-hidden
      />
      <span className="relative size-2 bg-primary" aria-hidden />
      <span className="sr-only">Nouveau</span>
    </span>
  );
}
