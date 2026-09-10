"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ressourceTypeConfig } from "@/lib/ressource-types";
import { cn } from "@/lib/utils";
import type { RessourceType } from "@/lib/search-types";

type OutlineRessource = {
  id: string;
  title: string;
  type: RessourceType;
};

type OutlineThematique = {
  id: string;
  title: string;
  ressources: OutlineRessource[];
};

export function ResourceCourseNav({
  coursTitle,
  coursSlug,
  thematiques,
  currentRessourceId,
  prev,
  next,
}: {
  coursTitle: string;
  coursSlug: string;
  thematiques: OutlineThematique[];
  currentRessourceId: string;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!prev}
        aria-label="Ressource précédente"
        title={prev?.title}
        render={prev ? <Link href={`/ressources/${prev.id}`} /> : undefined}
        nativeButton={!prev}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!next}
        aria-label="Ressource suivante"
        title={next?.title}
        render={next ? <Link href={`/ressources/${next.id}`} /> : undefined}
        nativeButton={!next}
      >
        <ChevronRight />
      </Button>

      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" size="sm">
              <List />
              <span className="hidden sm:inline">Sommaire du cours</span>
            </Button>
          }
        />
        <SheetContent side="right" className="w-3/4 overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{coursTitle}</SheetTitle>
            <SheetDescription>
              <Link
                href={`/cours/${coursSlug}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Voir la page du cours
              </Link>
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-4 pb-4">
            {thematiques.map((thematique) => (
              <div key={thematique.id}>
                <h3 className="text-sm font-medium text-foreground">
                  {thematique.title}
                </h3>
                <ul className="mt-2 flex flex-col gap-1">
                  {thematique.ressources.map((ressource) => {
                    const { label, icon: Icon } =
                      ressourceTypeConfig[ressource.type];
                    const isCurrent = ressource.id === currentRessourceId;

                    const itemClassName = cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                      isCurrent && "bg-muted font-medium text-foreground"
                    );

                    return (
                      <li key={ressource.id}>
                        <Link
                          href={`/ressources/${ressource.id}`}
                          className={itemClassName}
                          aria-current={isCurrent ? "page" : undefined}
                        >
                          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{ressource.title}</span>
                          <span className="sr-only">({label})</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
