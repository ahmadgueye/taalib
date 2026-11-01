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
import { deleteRessource } from "@/lib/actions/ressources";
import { ressourceStatusConfig } from "@/lib/ressource-status";

const typeLabels = {
  video: "Vidéo",
  pdf: "PDF",
  lien: "Lien",
  texte: "Texte",
} as const;
type RessourceType = keyof typeof typeLabels;

const filterItems = { all: "Tous les types", ...typeLabels };

const statusLabels = {
  draft: "Brouillon",
  published: "Publié",
} as const;
type RessourceStatus = keyof typeof statusLabels;

const statusFilterItems = { all: "Tous les statuts", ...statusLabels };

type RessourceRow = {
  id: string;
  title: string;
  type: RessourceType;
  status: RessourceStatus;
  createdAt: Date;
  thematique: { id: string; title: string; cours: { title: string } };
};

type SortKey = "title" | "type" | "thematique" | "createdAt";

export function RessourcesTable({
  data,
  initialStatus = "all",
}: {
  data: RessourceRow[];
  // Filtre de départ, depuis l'URL (?statut=draft depuis l'accueil).
  initialStatus?: RessourceStatus | "all";
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
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
    for (const r of data) {
      map.set(r.thematique.id, `${r.thematique.cours.title} · ${r.thematique.title}`);
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
    return data.filter((r) => {
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesThematique =
        thematiqueFilter === "all" || r.thematique.id === thematiqueFilter;
      const matchesSearch = !q || r.title.toLowerCase().includes(q);
      return matchesType && matchesStatus && matchesThematique && matchesSearch;
    });
  }, [data, search, typeFilter, statusFilter, thematiqueFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "type")
        cmp = typeLabels[a.type].localeCompare(typeLabels[b.type]);
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
          placeholder="Rechercher une ressource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => v && setTypeFilter(v)}
          items={filterItems}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v)}
          items={statusFilterItems}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                label="Type"
                sortKey="type"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead>Statut</TableHead>
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
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={r.title}
                >
                  {r.title}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeLabels[r.type]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ressourceStatusConfig[r.status].badgeVariant}>
                    {ressourceStatusConfig[r.status].label}
                  </Badge>
                </TableCell>
                <TableCell
                  className="max-w-xs truncate text-muted-foreground"
                  title={`${r.thematique.cours.title} · ${r.thematique.title}`}
                >
                  {r.thematique.cours.title} · {r.thematique.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={
                      <Link href={`/dashboard/ressources/${r.id}/edit`} />
                    }
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton
                    action={deleteRessource.bind(null, r.id)}
                    itemLabel={r.title}
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
