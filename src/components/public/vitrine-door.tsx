// Illustration du hero de la vitrine : une arche se dessine, ses deux battants
// s'ouvrent, un soleil se lève et un chemin en lacets mène vers l'horizon,
// étape par étape. Animations en CSS pur (classes `vitrine-*` de globals.css).
const INNER_ARCH =
  "M90 440 L90 236 C90 156 140 108 200 76 C260 108 310 156 310 236 L310 440";

const STEPS = [
  { cx: 162, cy: 402, r: 7, delay: "3.1s" },
  { cx: 232, cy: 362, r: 6, delay: "3.35s" },
  { cx: 188, cy: 326, r: 5, delay: "3.6s" },
  { cx: 200, cy: 300, r: 4, delay: "3.85s" },
];

export function VitrineDoor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 470" className={className} aria-hidden>
      <defs>
        <clipPath id="vitrine-door-inner">
          <path d={`${INNER_ARCH} Z`} />
        </clipPath>
      </defs>
      <g clipPath="url(#vitrine-door-inner)">
        <rect className="vitrine-sky" x="90" y="60" width="220" height="380" />
        <circle className="vitrine-sun" cx="200" cy="262" r="46" />
        <path
          className="vitrine-hill"
          d="M80 300 Q140 268 200 292 T320 286 L320 450 L80 450 Z"
        />
        <path
          className="vitrine-road"
          pathLength={1}
          d="M200 440 L162 402 L232 362 L188 326 L200 300"
        />
        {STEPS.map((s) => (
          <g key={s.cx}>
            <circle className="vitrine-step" cx={s.cx} cy={s.cy} r={s.r} />
            <circle
              className="vitrine-step-on"
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              style={{ animationDelay: s.delay }}
            />
          </g>
        ))}
        <rect
          className="vitrine-leaf"
          x="90"
          y="60"
          width="110"
          height="380"
          style={{ transformOrigin: "left center" }}
        />
        <rect
          className="vitrine-leaf"
          x="200"
          y="60"
          width="110"
          height="380"
          style={{ transformOrigin: "right center" }}
        />
      </g>
      <path
        className="vitrine-ink vitrine-draw"
        pathLength={1}
        strokeWidth={2.5}
        d="M72 440 L72 232 C72 142 128 86 200 50 C272 86 328 142 328 232 L328 440"
      />
      <path
        className="vitrine-ink vitrine-draw"
        pathLength={1}
        strokeWidth={1.2}
        style={{ animationDelay: "0.2s" }}
        d={INNER_ARCH}
      />
      <line
        className="vitrine-ink vitrine-draw"
        pathLength={1}
        strokeWidth={1.5}
        x1="24"
        y1="440"
        x2="376"
        y2="440"
      />
    </svg>
  );
}
