"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ALL_ENTITY_TYPES,
  ALL_RESSOURCE_TYPES,
  type EntityType,
  type RessourceType,
} from "@/lib/search-types";
import { ressourceTypeConfig } from "@/lib/ressource-types";

export function SearchForm({
  q,
  selectedTypes,
  selectedRessourceTypes,
  typeLabels,
}: {
  q: string;
  selectedTypes: EntityType[];
  selectedRessourceTypes: RessourceType[];
  typeLabels: Record<EntityType, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("q", String(formData.get("q") ?? ""));
    for (const value of formData.getAll("types")) {
      params.append("types", String(value));
    }
    for (const value of formData.getAll("rtype")) {
      params.append("rtype", String(value));
    }
    startTransition(() => {
      router.push(`/recherche?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Rechercher un cours, une thématique, une ressource…"
        className="max-w-md"
      />

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium">Type de contenu</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ALL_ENTITY_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="types"
                  value={type}
                  defaultChecked={selectedTypes.includes(type)}
                />
                {typeLabels[type]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Type de ressource</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ALL_RESSOURCE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="rtype"
                  value={type}
                  defaultChecked={selectedRessourceTypes.includes(type)}
                />
                {ressourceTypeConfig[type].label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" className="mt-4" loading={isPending}>
        {isPending ? "Recherche…" : "Rechercher"}
      </Button>
    </form>
  );
}
