"use client";

import { useEffect, useRef } from "react";
import { Brain, Lock } from "lucide-react";

// Les trois aperçus de la vitrine. Chaque picto montre son état final par
// défaut, et rejoue son animation (classe `is-playing`) à son arrivée à
// l'écran puis à chaque survol.
export function VitrineFeatures() {
  return (
    <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
      <Feature
        title="Ta feuille de route"
        description="Chaque cours de ta classe devient une suite d'étapes. Les suivantes s'ouvrent quand tu avances."
        picto={<RoadmapPicto />}
      />
      <Feature
        title="Des quiz"
        description="Vérifie ce que tu as retenu après chaque leçon, et reviens sur tes erreurs."
        picto={<QuizPicto />}
      />
      <Feature
        title="Ta mémorisation"
        description="Marque chaque verset en cours, à renforcer ou maîtrisé, et suis ce que tu retiens du Qur'an, sourate après sourate."
        picto={<MemorizationPicto />}
      />
    </div>
  );
}

function Feature({
  title,
  description,
  picto,
}: {
  title: string;
  description: string;
  picto: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const replay = () => {
      el.classList.remove("is-playing");
      // Force un reflow pour que l'animation reparte de zéro.
      void el.offsetWidth;
      el.classList.add("is-playing");
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          replay();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    el.addEventListener("mouseenter", replay);
    return () => {
      observer.disconnect();
      el.removeEventListener("mouseenter", replay);
    };
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex h-24 items-center justify-center bg-card px-4 py-2">
        {picto}
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

const PICTO_SVG = "size-full";

function RoadmapPicto() {
  const nodes = [30, 90, 150];
  return (
    <svg viewBox="0 12 240 86" className={PICTO_SVG} aria-hidden>
      <line className="vitrine-picto-line" strokeWidth={1.5} x1="30" y1="50" x2="210" y2="50" />
      <line
        className="vitrine-picto-accent-line vitrine-grow"
        pathLength={1}
        strokeWidth={2}
        x1="30"
        y1="50"
        x2="150"
        y2="50"
      />
      {nodes.map((cx, i) => (
        <g key={cx}>
          <circle className="vitrine-picto-box" cx={cx} cy="50" r="9" />
          <circle
            className="vitrine-picto-accent vitrine-seq"
            cx={cx}
            cy="50"
            r="9"
            style={{ animationDelay: `${0.2 + i * 0.4}s` }}
          />
        </g>
      ))}
      <circle className="vitrine-picto-box" cx="210" cy="50" r="9" />
      <Lock x={204} y={44} size={12} strokeWidth={2} className="text-foreground" />
      {["Leçon 1", "Leçon 2", "Leçon 3", "Quiz"].map((label, i) => (
        <text
          key={label}
          x={30 + i * 60}
          y="84"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-semibold"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function QuizPicto() {
  const rows = [
    { y: 20, width: 78, checked: false },
    { y: 47, width: 58, checked: true },
    { y: 74, width: 90, checked: false },
  ];
  return (
    <svg viewBox="0 12 240 86" className={PICTO_SVG} aria-hidden>
      {rows.map((row) => (
        <g key={row.y}>
          <rect className="vitrine-picto-box" x="62" y={row.y} width="16" height="16" />
          {row.checked && (
            <>
              <rect
                className="vitrine-picto-accent vitrine-seq"
                x="62"
                y={row.y}
                width="16"
                height="16"
                style={{ animationDelay: "0.2s" }}
              />
              <path
                className="vitrine-grow stroke-card"
                pathLength={1}
                d={`M65.5 ${row.y + 8} l3.5 3.5 l7 -8`}
                fill="none"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animationDelay: "0.6s" }}
              />
            </>
          )}
          <line
            x1="92"
            y1={row.y + 8}
            x2={92 + row.width}
            y2={row.y + 8}
            strokeWidth={3}
            strokeLinecap="round"
            className={row.checked ? "stroke-foreground" : "stroke-border"}
          />
        </g>
      ))}
    </svg>
  );
}

function MemorizationPicto() {
  return (
    <svg viewBox="0 12 240 86" className={PICTO_SVG} aria-hidden>
      <circle className="vitrine-picto-line" cx="92" cy="55" r="34" strokeWidth={5} />
      <circle
        className="vitrine-picto-accent-line vitrine-ring"
        pathLength={1}
        cx="92"
        cy="55"
        r="34"
        strokeWidth={5}
        strokeDasharray="0.72 1"
        transform="rotate(-90 92 55)"
      />
      <Brain x={73} y={36} size={38} strokeWidth={1.5} className="text-foreground" />
      <text x="142" y="66" className="fill-foreground font-heading text-[32px] font-bold">
        72
        <tspan className="fill-muted-foreground text-lg"> %</tspan>
      </text>
    </svg>
  );
}
