import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

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
import { deleteParcours } from "@/lib/actions/parcours";
import { getAllParcours } from "@/lib/db/queries/parcours";

export default async function DashboardParcoursPage() {
  const parcoursList = await getAllParcours();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Parcours
        </h1>
        <Button
          render={<Link href="/dashboard/parcours/new" />}
          nativeButton={false}
        >
          <Plus className="size-4" />
          Nouveau parcours
        </Button>
      </div>

      <div className="mt-6">
        {parcoursList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun parcours pour le moment. La page d&apos;accueil affiche par
            défaut la liste de tous les cours tant qu&apos;aucun parcours
            n&apos;est créé.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Étapes</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcoursList.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.etapes.length === 0
                      ? "Aucune étape"
                      : p.etapes.map((e) => e.thematique.title).join(" → ")}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      render={
                        <Link href={`/dashboard/parcours/${p.id}/edit`} />
                      }
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <DeleteButton
                      action={deleteParcours.bind(null, p.id)}
                      itemLabel={p.title}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
