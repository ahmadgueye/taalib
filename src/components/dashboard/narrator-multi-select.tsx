"use client";

import { useState } from "react";
import { ChevronsUpDown, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Chaque rapporteur choisi est envoyé dans l'ordre sous la forme
// "id:<uuid>" (existant) ou "new:<nom>" (créé à l'enregistrement du hadith).
type SelectedNarrator = { value: string; name: string };

export function NarratorMultiSelect({
  id,
  name,
  options,
  defaultValue = [],
}: {
  id?: string;
  name: string;
  options: { id: string; name: string }[];
  defaultValue?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedNarrator[]>(
    defaultValue.map((n) => ({ value: `id:${n.id}`, name: n.name }))
  );

  const query = search.trim();
  const exists =
    options.some((o) => o.name.toLowerCase() === query.toLowerCase()) ||
    selected.some((s) => s.name.toLowerCase() === query.toLowerCase());

  function toggle(narrator: SelectedNarrator) {
    setSelected((prev) =>
      prev.some((s) => s.value === narrator.value)
        ? prev.filter((s) => s.value !== narrator.value)
        : [...prev, narrator]
    );
  }

  function addNew() {
    setSelected((prev) => [...prev, { value: `new:${query}`, name: query }]);
    setSearch("");
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              className="w-full justify-between font-normal"
            />
          }
        >
          <span
            className={cn(
              "truncate",
              selected.length === 0 && "text-muted-foreground"
            )}
          >
            {selected.length === 0
              ? "Choisir ou ajouter des rapporteurs"
              : `${selected.length} rapporteur${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput
              placeholder="Rechercher ou ajouter un rapporteur…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Aucun rapporteur trouvé.</CommandEmpty>
              {query && !exists && (
                <CommandGroup forceMount>
                  <CommandItem
                    forceMount
                    value={`__new__${query}`}
                    onSelect={addNew}
                  >
                    <Plus />
                    Ajouter « {query} »
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    data-checked={selected.some(
                      (s) => s.value === `id:${option.id}`
                    )}
                    onSelect={() =>
                      toggle({ value: `id:${option.id}`, name: option.name })
                    }
                  >
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s.value} variant="secondary" className="pr-1">
              {s.name}
              {s.value.startsWith("new:") && (
                <span className="text-muted-foreground">(nouveau)</span>
              )}
              <button
                type="button"
                onClick={() => toggle(s)}
                aria-label={`Retirer ${s.name}`}
                className="rounded-full hover:bg-foreground/10"
              >
                <X />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {selected.map((s) => (
        <input key={s.value} type="hidden" name={name} value={s.value} />
      ))}
    </div>
  );
}
