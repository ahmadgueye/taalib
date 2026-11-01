"use client";

import { Check, HelpCircle, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// true / false, ou un texte quand la réponse est nuancée. À garder aligné
// sur requireContributor() / requireAdmin() dans lib/actions/*.ts.
type Cell = boolean | string;

const rows: { label: string; compte: Cell; editeur: Cell; admin: Cell }[] = [
  {
    label: "Lire le contenu du site",
    compte: "Ce qui est débloqué pour ses classes",
    editeur: true,
    admin: true,
  },
  {
    label: "Accéder au dashboard",
    compte: false,
    editeur: true,
    admin: true,
  },
  {
    label:
      "Créer, modifier, supprimer cours, thématiques, ressources, quiz, hadiths, rapporteurs et séances",
    compte: false,
    editeur: true,
    admin: true,
  },
  {
    label: "Voir les soumissions des quiz",
    compte: false,
    editeur: true,
    admin: true,
  },
  {
    label: "Gérer les classes : élèves, déblocages, code d'invitation",
    compte: false,
    editeur: false,
    admin: true,
  },
  {
    label: "Gérer l'équipe et voir tous les comptes",
    compte: false,
    editeur: false,
    admin: true,
  },
];

function CellContent({ value }: { value: Cell }) {
  if (typeof value === "string") {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto size-4" aria-label="Oui" />
  ) : (
    <Minus
      className="mx-auto size-4 text-muted-foreground/60"
      aria-label="Non"
    />
  );
}

export function RolesHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" />}
        className="text-muted-foreground"
      >
        <HelpCircle className="size-4" />
        Qui peut faire quoi ?
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qui peut faire quoi ?</DialogTitle>
          <DialogDescription>
            Un compte est un élève ou un visiteur. L&apos;éditeur et
            l&apos;admin forment l&apos;équipe.
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead className="w-28 text-center">Compte</TableHead>
              <TableHead className="w-20 text-center">Éditeur</TableHead>
              <TableHead className="w-20 text-center">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="whitespace-normal">{r.label}</TableCell>
                <TableCell className="text-center whitespace-normal">
                  <CellContent value={r.compte} />
                </TableCell>
                <TableCell className="text-center">
                  <CellContent value={r.editeur} />
                </TableCell>
                <TableCell className="text-center">
                  <CellContent value={r.admin} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
