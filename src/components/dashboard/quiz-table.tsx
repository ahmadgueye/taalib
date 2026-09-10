"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { deleteQuiz } from "@/lib/actions/quiz";
import { ressourceStatusConfig } from "@/lib/ressource-status";

type QuizRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  createdAt: Date;
  thematique: { title: string; cours: { title: string } };
  questions: unknown[];
};

type SortKey = "title" | "thematique" | "createdAt";

export function QuizTable({ data }: { data: QuizRow[] }) {
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
    return data.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "thematique")
        cmp = a.thematique.title.localeCompare(b.thematique.title);
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  return (
    <div>
      <Input
        placeholder="Rechercher un quiz…"
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
                label="Thématique"
                sortKey="thematique"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead>Questions</TableHead>
              <TableHead>Statut</TableHead>
              <SortableTableHead
                label="Créé le"
                sortKey="createdAt"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((quiz) => (
              <TableRow key={quiz.id}>
                <TableCell
                  className="max-w-xs truncate font-medium"
                  title={quiz.title}
                >
                  {quiz.title}
                </TableCell>
                <TableCell
                  className="max-w-xs truncate text-muted-foreground"
                  title={`${quiz.thematique.cours.title} · ${quiz.thematique.title}`}
                >
                  {quiz.thematique.cours.title} · {quiz.thematique.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {quiz.questions.length}
                </TableCell>
                <TableCell>
                  <Badge variant={ressourceStatusConfig[quiz.status].badgeVariant}>
                    {ressourceStatusConfig[quiz.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(quiz.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button
                    render={
                      <Link href={`/dashboard/quiz/${quiz.id}/questions`} />
                    }
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    title="Questions"
                  >
                    <HelpCircle className="size-4" />
                  </Button>
                  <Button
                    render={<Link href={`/dashboard/quiz/${quiz.id}/edit`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    title="Modifier"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton
                    action={deleteQuiz.bind(null, quiz.id)}
                    itemLabel={quiz.title}
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
