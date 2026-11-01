import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RessourcesTable } from "@/components/dashboard/ressources-table";
import { getAllRessources } from "@/lib/db/queries/ressources";
import { type RessourceStatus } from "@/lib/ressource-status";

export const metadata: Metadata = { title: "Ressources" };

const statuses: RessourceStatus[] = ["draft", "published"];

type Props = {
  searchParams: Promise<{ statut?: string }>;
};

export default async function DashboardRessourcesPage({ searchParams }: Props) {
  const { statut } = await searchParams;
  const initialStatus = statuses.find((s) => s === statut) ?? "all";
  const ressourcesList = await getAllRessources();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Ressources
        </h1>
        <Button render={<Link href="/dashboard/ressources/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nouvelle ressource
        </Button>
      </div>

      <div className="mt-6">
        <RessourcesTable data={ressourcesList} initialStatus={initialStatus} />
      </div>
    </div>
  );
}
