"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableTableHead } from "@/components/dashboard/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCours } from "@/lib/actions/cours";
import { coursStatusConfig, type CoursStatus } from "@/lib/cours-status";

const statusFilterItems = {
  all: "Tous les statuts",
  ...Object.fromEntries(
    Object.entries(coursStatusConfig).map(([k, v]) => [k, v.label])
  ),
};

type CoursRow = {
  id: string;
  title: string;
  description: string | null;
  status: CoursStatus;
  createdAt: Date;
};

type SortKey = "title" | "createdAt";

export function CoursTable({
  data,
  initialStatus = "all",
}: {
  data: CoursRow[];
  // Filtre de départ, depuis l'URL (?statut=coming_soon depuis l'accueil).
  initialStatus?: CoursStatus | "all";
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
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
    return data.filter(
      (c) =>
        (statusFilter === "all" || c.status === statusFilter) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false))
    );
  }, [data, search, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp =
        sortKey === "title"
          ? a.title.localeCompare(b.title)
          : a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Rechercher un cours…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v)}
          items={statusFilterItems}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusFilterItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
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
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={c.title}
                >
                  <Link
                    href={`/dashboard/cours/${c.id}`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell
                  className="max-w-md truncate text-muted-foreground"
                  title={c.description ?? undefined}
                >
                  {c.description}
                </TableCell>
                <TableCell>
                  <Badge variant={coursStatusConfig[c.status].badgeVariant}>
                    {coursStatusConfig[c.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={<Link href={`/dashboard/cours/${c.id}/edit`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Modifier « ${c.title} »`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton
                    action={deleteCours.bind(null, c.id)}
                    itemLabel={c.title}
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
