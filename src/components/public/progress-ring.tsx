import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  indicatorClassName,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  // Couleur de l'arc (vert par défaut) et durée de son animation.
  indicatorClassName?: string;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90 shrink-0"
      role="img"
      aria-label={label ?? `Progression : ${Math.round(clamped)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn(
          "fill-none stroke-emerald-600 transition-[stroke-dashoffset] duration-300 dark:stroke-emerald-400",
          indicatorClassName,
        )}
      />
    </svg>
  );
}
