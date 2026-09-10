import { ProgressRing } from "@/components/public/progress-ring";
import { cn } from "@/lib/utils";

export function ProgressIndicator({
  value,
  size = 16,
  strokeWidth = 2.5,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      <ProgressRing value={clamped} size={size} strokeWidth={strokeWidth} />
      <span>{Math.round(clamped)}% de progression</span>
    </div>
  );
}
