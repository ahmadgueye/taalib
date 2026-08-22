export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  // Scale the label with the ring so "100%" never overflows small rings.
  const fontSize = Math.max(8, Math.round(size * 0.28));

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Progression : ${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
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
          className="fill-none stroke-emerald-600 transition-[stroke-dashoffset] duration-300 dark:stroke-emerald-400"
        />
      </svg>
      <span className="absolute font-medium tabular-nums" style={{ fontSize }}>
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
