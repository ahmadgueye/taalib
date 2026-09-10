"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

export type SortableReorderItem = {
  id: string;
  label: string;
  sublabel?: string;
};

function SortableRow({
  item,
  trailing,
}: {
  item: SortableReorderItem;
  trailing?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Réordonner"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1">
        <div className="font-medium">{item.label}</div>
        {item.sublabel && (
          <div className="text-xs text-muted-foreground">{item.sublabel}</div>
        )}
      </div>
      {trailing}
    </li>
  );
}

export function SortableReorderList({
  items,
  onReorder,
  renderTrailing,
}: {
  items: SortableReorderItem[];
  onReorder: (orderedIds: string[]) => Promise<{ error?: string } | undefined>;
  renderTrailing?: (item: SortableReorderItem) => React.ReactNode;
}) {
  const [ordered, setOrdered] = useState(items);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((i) => i.id === active.id);
    const newIndex = ordered.findIndex((i) => i.id === over.id);
    const previous = ordered;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);

    startTransition(async () => {
      const result = await onReorder(next.map((i) => i.id));
      if (result?.error) {
        setOrdered(previous);
        toast.error(result.error);
      } else {
        toast.success("Ordre mis à jour.");
      }
    });
  }

  if (items.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Il faut au moins deux éléments pour pouvoir les réordonner.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ordered.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={cn("flex flex-col gap-2", isPending && "opacity-70")}>
          {ordered.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              trailing={renderTrailing?.(item)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
