import { cn } from "@/lib/utils";

// Pastille du menu « Quiz » : nombre de quiz à faire ou à retenter. Rien à
// afficher quand tout est fait.
export function QuizCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chart-1 px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
      <span className="sr-only"> quiz à faire</span>
    </span>
  );
}
