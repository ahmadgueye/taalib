"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchCatalogueAction } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/db/queries/search";

const typeLabels: Record<SearchResult["type"], string> = {
  cours: "Cours",
  thematique: "Thématiques",
  ressource: "Ressources",
  seance: "Séances",
  hadith: "Hadiths",
};

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timeout = setTimeout(() => {
      searchCatalogueAction(query).then(setResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  const grouped = visibleResults.reduce<Record<string, SearchResult[]>>(
    (acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    },
    {}
  );

  function select(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Rechercher"
      description="Rechercher dans le catalogue"
    >
      <CommandInput
        placeholder="Rechercher un cours, une thématique, une ressource…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length >= 2 && visibleResults.length === 0 && (
          <CommandEmpty>Aucun résultat.</CommandEmpty>
        )}
        {Object.entries(grouped).map(([type, items]) => (
          <CommandGroup key={type} heading={typeLabels[type as SearchResult["type"]]}>
            {items.map((r, i) => (
              <CommandItem key={`${type}-${i}`} onSelect={() => select(r.href)}>
                <div>
                  <div>{r.title}</div>
                  {r.subtitle && (
                    <div className="text-xs text-muted-foreground">
                      {r.subtitle}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
