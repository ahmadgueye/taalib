"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/public/markdown-content";

const sizeSteps = [
  "max-w-none text-sm leading-relaxed",
  "max-w-none text-base leading-relaxed",
  "max-w-none text-lg leading-loose",
  "max-w-none text-xl leading-loose",
  "max-w-none text-2xl leading-loose",
  "max-w-none text-3xl leading-loose",
];

const TEXT_SIZE_STORAGE_KEY = "deenshare:text-size-step";
const DEFAULT_STEP = 1;

const stepListeners = new Set<() => void>();

function subscribeStep(callback: () => void) {
  stepListeners.add(callback);
  return () => stepListeners.delete(callback);
}

function getStepSnapshot() {
  const raw = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < sizeSteps.length
    ? parsed
    : DEFAULT_STEP;
}

function getServerStepSnapshot() {
  return DEFAULT_STEP;
}

function setStoredStep(next: number) {
  window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(next));
  stepListeners.forEach((listener) => listener());
}

export function TextResourceReader({
  content,
  courseNav,
  footerAction,
}: {
  content: string;
  courseNav?: ReactNode;
  footerAction?: ReactNode;
}) {
  const step = useSyncExternalStore(subscribeStep, getStepSnapshot, getServerStepSnapshot);

  return (
    <div>
      <div className="sticky top-16 z-20 flex items-center justify-between gap-2 border-b bg-background/95 py-3 text-sm text-muted-foreground backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Taille du texte</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={step === 0}
            onClick={() => setStoredStep(Math.max(0, step - 1))}
          >
            <Minus />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={step === sizeSteps.length - 1}
            onClick={() => setStoredStep(Math.min(sizeSteps.length - 1, step + 1))}
          >
            <Plus />
          </Button>
        </div>
        {courseNav}
      </div>
      <div className="mt-6 text-justify">
        <MarkdownContent content={content} className={sizeSteps[step]} />
      </div>
      {footerAction && (
        <div className="mt-8 flex justify-end border-t pt-6">
          {footerAction}
        </div>
      )}
    </div>
  );
}
