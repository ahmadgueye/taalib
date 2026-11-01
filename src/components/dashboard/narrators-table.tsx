"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { Input } from "@/components/ui/input";
import { SortableTableHead } from "@/components/dashboard/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteNarrator } from "@/lib/actions/narrators";

type NarratorRow = {
  id: string;
  name: string;
  hadithCount: number;
  createdAt: Date;
};

type SortKey = "name" | "hadithCount" | "createdAt";

export function NarratorsTable({ data }: { data: NarratorRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((n) => !q || n.name.toLowerCase().includes(q));
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "hadithCount") cmp = a.hadithCount - b.hadithCount;
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <Input
        placeholder="Rechercher un rapporteur…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {sorted.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Aucun résultat.</p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Nom"
                sortKey="name"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Hadiths"
                sortKey="hadithCount"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Créé le"
                sortKey="createdAt"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((n) => (
              <TableRow key={n.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={n.name}
                >
                  {n.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {n.hadithCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={
                      <Link href={`/dashboard/rapporteurs/${n.id}/edit`} />
                    }
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {n.hadithCount > 0 ? (
                    // Encore cité : on ne peut que le fusionner (page d'édition).
                    <span
                      title={`Cité par ${n.hadithCount} hadith${n.hadithCount > 1 ? "s" : ""} — fusionnez-le plutôt depuis la page d'édition.`}
                    >
                      <Button variant="ghost" size="icon-sm" disabled>
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  ) : (
                    <DeleteButton
                      action={deleteNarrator.bind(null, n.id)}
                      itemLabel={n.name}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
