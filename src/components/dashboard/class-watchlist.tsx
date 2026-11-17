import Link from "next/link";
import { ChevronRight, Clock, HelpCircle, Lock } from "lucide-react";

import { GrantAttemptButton } from "@/components/dashboard/grant-attempt-button";
import type { ClassWatchlist as Watchlist } from "@/lib/class-progress";

// Au-delà, la liste renvoie au suivi de la classe.
const MAX_ROWS = 5;

const relativeFormat = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function inactiveLabel(lastActivityAt: Date | null, now: Date) {
  if (!lastActivityAt) return "aucune activité";
  const days = Math.round(
    (now.getTime() - lastActivityAt.getTime()) / 86_400_000
  );
  return `dernière activité ${relativeFormat.format(-days, "day")}`;
}

const rowClass =
  "flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-sm";

function Group({
  icon: Icon,
  title,
  count,
  moreHref,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  moreHref: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="border-t first:border-t-0">
      <p className="flex items-center gap-2 px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {title} ({count})
      </p>
      {children}
      {count > MAX_ROWS && (
        <Link
          href={moreHref}
          className="block px-3 pb-3 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          et {count - MAX_ROWS} autre{count - MAX_ROWS > 1 ? "s" : ""}
        </Link>
      )}
    </div>
  );
}

// Ce qui demande l'attention de l'enseignant, classe par classe : élèves
// bloqués sur un quiz, élèves inactifs, quiz que la classe rate.
export function ClassWatchlist({
  lists,
  now,
}: {
  lists: (Watchlist & { classId: string; className: string })[];
  now: Date;
}) {
  if (lists.length === 0) {
    return (
      <p className="mt-3 border border-dashed p-4 text-sm text-muted-foreground">
        Rien à signaler dans tes classes.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-4">
      {lists.map((c) => {
        const classHref = `/dashboard/classes/${c.classId}`;
        const studentHref = (userId: string) =>
          `${classHref}/etudiants/${userId}`;
        return (
          <div key={c.classId} className="border">
            <Link
              href={classHref}
              className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span className="truncate">{c.className}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            <Group
              icon={Lock}
              title="Bloqués sur un quiz"
              count={c.blocked.length}
              moreHref={classHref}
            >
              {c.blocked.slice(0, MAX_ROWS).map((b) => (
                <div key={`${b.userId}-${b.quizId}`} className={rowClass}>
                  <span className="min-w-0 truncate">
                    <Link
                      href={studentHref(b.userId)}
                      className="font-medium hover:underline"
                    >
                      {b.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {b.quizTitle}
                    </span>
                  </span>
                  <GrantAttemptButton quizId={b.quizId} userId={b.userId} />
                </div>
              ))}
            </Group>

            <Group
              icon={HelpCircle}
              title="Quiz peu réussis"
              count={c.strugglingQuiz.length}
              moreHref={classHref}
            >
              {c.strugglingQuiz.slice(0, MAX_ROWS).map((q) => (
                <Link
                  key={q.quizId}
                  href={`${classHref}/quiz/${q.quizId}`}
                  className={`${rowClass} transition-colors hover:bg-muted`}
                >
                  <span className="truncate font-medium">{q.quizTitle}</span>
                  <span className="shrink-0 text-rose-600">
                    {q.passed}/{q.attempted} réussi{q.passed > 1 ? "s" : ""}
                  </span>
                </Link>
              ))}
            </Group>

            <Group
              icon={Clock}
              title="Inactifs depuis plus de 7 jours"
              count={c.inactive.length}
              moreHref={classHref}
            >
              {c.inactive.slice(0, MAX_ROWS).map((s) => (
                <Link
                  key={s.userId}
                  href={studentHref(s.userId)}
                  className={`${rowClass} transition-colors hover:bg-muted`}
                >
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="shrink-0 text-amber-600">
                    {inactiveLabel(s.lastActivityAt, now)}
                  </span>
                </Link>
              ))}
            </Group>
          </div>
        );
      })}
    </div>
  );
}
