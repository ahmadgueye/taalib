"use client";

import type { ReactNode } from "react";
import { Maximize2, SlidersHorizontal } from "lucide-react";

import { MemorizationProgressBar } from "@/components/public/memorization-progress-bar";
import { TajweedLegendItems } from "@/components/public/tajweed-legend";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemorizationStatus } from "@/lib/db/schema";

type ViewMode = "arabic" | "arabic-fr";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

// Réglages du lecteur sur mobile : regroupés dans un tiroir ouvert depuis
// la barre d'outils, pour ne garder que la navigation (sourate, verset) en
// haut de l'écran. Sur desktop, ces réglages restent dans la barre.
export function QuranReaderSettings({
  viewMode,
  onViewModeChange,
  fontSizeControls,
  tajweedEnabled,
  onTajweedChange,
  onZenMode,
  memorization,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fontSizeControls: ReactNode;
  tajweedEnabled: boolean;
  onTajweedChange: (enabled: boolean) => void;
  onZenMode: () => void;
  // Absent pour un visiteur non connecté.
  memorization?: {
    chapterId: number;
    statusMap: Record<string, MemorizationStatus>;
    totalVerses: number;
  };
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Réglages de lecture"
            className="ml-auto"
          />
        }
      >
        <SlidersHorizontal />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>Réglages de lecture</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-6">
          <Row label="Affichage">
            <Tabs
              value={viewMode}
              onValueChange={(value) => onViewModeChange(value as ViewMode)}
            >
              <TabsList>
                <TabsTrigger value="arabic">Lecture</TabsTrigger>
                <TabsTrigger value="arabic-fr">Ayah par ayah</TabsTrigger>
              </TabsList>
            </Tabs>
          </Row>

          <Row label="Taille du texte">
            <div className="flex items-center gap-1">{fontSizeControls}</div>
          </Row>

          <div className="flex flex-col gap-3">
            <Row
              label={
                <>
                  Tajwid
                  {viewMode !== "arabic" && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Disponible en mode Lecture
                    </span>
                  )}
                </>
              }
            >
              <Switch
                aria-label="Tajwid"
                checked={tajweedEnabled}
                disabled={viewMode !== "arabic"}
                onCheckedChange={onTajweedChange}
              />
            </Row>
            {tajweedEnabled && viewMode === "arabic" && (
              <TajweedLegendItems className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground" />
            )}
          </div>

          {memorization && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Mémorisation</span>
              <MemorizationProgressBar {...memorization} variant="panel" />
            </div>
          )}

          <SheetClose
            render={<Button variant="outline" className="w-full" />}
            onClick={onZenMode}
          >
            <Maximize2 />
            Mode Zen
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
