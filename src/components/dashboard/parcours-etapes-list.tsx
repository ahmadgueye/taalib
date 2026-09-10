"use client";

import { DeleteButton } from "@/components/dashboard/delete-button";
import { SortableReorderList } from "@/components/dashboard/sortable-reorder-list";
import { removeEtape, reorderEtapes } from "@/lib/actions/parcours";

export function ParcoursEtapesList({
  parcoursId,
  etapes,
}: {
  parcoursId: string;
  etapes: { id: string; label: string }[];
}) {
  return (
    <SortableReorderList
      key={etapes.map((e) => e.id).join(",")}
      items={etapes.map((e) => ({ id: e.id, label: e.label }))}
      onReorder={reorderEtapes.bind(null, parcoursId)}
      renderTrailing={(item) => {
        const etape = etapes.find((e) => e.id === item.id)!;
        return (
          <DeleteButton
            action={removeEtape.bind(null, etape.id, parcoursId)}
            itemLabel={etape.label}
          />
        );
      }}
    />
  );
}
