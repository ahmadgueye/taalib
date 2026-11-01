"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

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
import { deleteSeance } from "@/lib/actions/seances";

type SeanceRow = {
  id: string;
  title: string;
  sessionDate: string | null;
  createdAt: Date;
};

type SortKey = "title" | "sessionDate" | "createdAt";

export function SeancesTable({ data }: { data: SeanceRow[] }) {
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
    if (!q) return data;
    return data.filter((s) => s.title.toLowerCase().includes(q));
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "sessionDate") {
        if (!a.sessionDate && !b.sessionDate) cmp = 0;
        else if (!a.sessionDate) cmp = 1;
        else if (!b.sessionDate) cmp = -1;
        else cmp = a.sessionDate.localeCompare(b.sessionDate);
      } else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <Input
        placeholder="Rechercher une séance…"
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
                label="Titre"
                sortKey="title"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Date"
                sortKey="sessionDate"
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
            {sorted.map((s) => (
              <TableRow key={s.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={s.title}
                >
                  <Link
                    href={`/dashboard/seances/${s.id}/edit`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {s.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.sessionDate
                    ? new Date(s.sessionDate).toLocaleDateString("fr-FR")
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={<Link href={`/dashboard/seances/${s.id}/edit`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Modifier « ${s.title} »`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton
                    action={deleteSeance.bind(null, s.id)}
                    itemLabel={s.title}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
