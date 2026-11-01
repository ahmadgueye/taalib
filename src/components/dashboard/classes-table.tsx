"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/dashboard/delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteClass } from "@/lib/actions/classes";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  inviteEnabled: boolean;
  memberCount: number;
  createdAt: Date;
};

export function ClassesTable({ data }: { data: ClassRow[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune classe pour l&apos;instant.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Étudiants</TableHead>
          <TableHead>Invitation</TableHead>
          <TableHead>Créée le</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="max-w-xs truncate font-medium" title={c.name}>
              <Link
                href={`/dashboard/classes/${c.id}`}
                className="hover:underline"
              >
                {c.name}
              </Link>
            </TableCell>
            <TableCell
              className="max-w-md truncate text-muted-foreground"
              title={c.description ?? undefined}
            >
              {c.description}
            </TableCell>
            <TableCell>{c.memberCount}</TableCell>
            <TableCell>
              <Badge variant={c.inviteEnabled ? "default" : "secondary"}>
                {c.inviteEnabled ? "Ouverte" : "Fermée"}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(c.createdAt).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell className="flex justify-end gap-1">
              <Button
                render={<Link href={`/dashboard/classes/${c.id}`} />}
                nativeButton={false}
                variant="ghost"
                size="icon-sm"
                aria-label={`Gérer « ${c.name} »`}
              >
                <Settings className="size-4" />
              </Button>
              <DeleteButton
                action={deleteClass.bind(null, c.id)}
                itemLabel={c.name}
                description="Les étudiants sont retirés de la classe. Leurs comptes et leur progression sont conservés."
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
