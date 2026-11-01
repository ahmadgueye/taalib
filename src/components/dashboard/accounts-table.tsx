"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AccountRow } from "@/lib/db/queries/users";

export function AccountsTable({ data }: { data: AccountRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        a.fullName?.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun autre compte pour l&apos;instant.
      </p>
    );
  }

  return (
    <div>
      <Input
        placeholder="Rechercher un nom ou un e-mail…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Classes</TableHead>
            <TableHead>Inscrit le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.fullName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{a.email}</TableCell>
              <TableCell>
                {a.classes.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {a.classes.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/classes/${c.id}/etudiants/${a.id}`}
                          className="hover:underline hover:underline-offset-4"
                        >
                          {c.name}
                        </Link>
                        {c.former && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (ancien)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                Aucun compte ne correspond.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
