"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

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
import { deleteHadith } from "@/lib/actions/hadiths";

type HadithRow = {
  id: string;
  title: string;
  narrator: string;
  createdAt: Date;
  thematique: { id: string; title: string; cours: { title: string } };
};

type SortKey = "title" | "narrator" | "thematique" | "createdAt";

export function HadithsTable({ data }: { data: HadithRow[] }) {
  const [search, setSearch] = useState("");
  const [thematiqueFilter, setThematiqueFilter] = useState("all");
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

  const thematiqueOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of data) {
      map.set(
        h.thematique.id,
        `${h.thematique.cours.title} · ${h.thematique.title}`
      );
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [data]);

  const thematiqueFilterItems = useMemo(
    () => ({
      all: "Toutes les thématiques",
      ...Object.fromEntries(thematiqueOptions.map((t) => [t.id, t.label])),
    }),
    [thematiqueOptions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((h) => {
      const matchesThematique =
        thematiqueFilter === "all" || h.thematique.id === thematiqueFilter;
      const matchesSearch =
        !q ||
        h.title.toLowerCase().includes(q) ||
        h.narrator.toLowerCase().includes(q);
      return matchesThematique && matchesSearch;
    });
  }, [data, search, thematiqueFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "narrator")
        cmp = a.narrator.localeCompare(b.narrator);
      else if (sortKey === "thematique")
        cmp = a.thematique.title.localeCompare(b.thematique.title);
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Rechercher un hadith…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={thematiqueFilter}
          onValueChange={(v) => v && setThematiqueFilter(v)}
          items={thematiqueFilterItems}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les thématiques</SelectItem>
            {thematiqueOptions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
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
              <SortableTableHead
                label="Rapporteur"
                sortKey="narrator"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Thématique"
                sortKey="thematique"
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
            {sorted.map((h) => (
              <TableRow key={h.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={h.title}
                >
                  <Link
                    href={`/dashboard/hadiths/${h.id}/edit`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {h.title}
                  </Link>
                </TableCell>
                <TableCell
                  className="max-w-xs truncate text-muted-foreground"
                  title={h.narrator}
                >
                  {h.narrator}
                </TableCell>
                <TableCell
                  className="max-w-xs truncate text-muted-foreground"
                  title={`${h.thematique.cours.title} · ${h.thematique.title}`}
                >
                  {h.thematique.cours.title} · {h.thematique.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(h.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={<Link href={`/dashboard/hadiths/${h.id}/edit`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Modifier « ${h.title} »`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton
                    action={deleteHadith.bind(null, h.id)}
                    itemLabel={h.title}
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
