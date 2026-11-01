import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CoursTable } from "@/components/dashboard/cours-table";
import { getAllCours } from "@/lib/db/queries/cours";
import { type CoursStatus } from "@/lib/cours-status";

const statuses: CoursStatus[] = ["published", "coming_soon"];

type Props = {
  searchParams: Promise<{ statut?: string }>;
};

export default async function DashboardCoursPage({ searchParams }: Props) {
  const { statut } = await searchParams;
  const initialStatus = statuses.find((s) => s === statut) ?? "all";
  const coursList = await getAllCours();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Cours
        </h1>
        <Button render={<Link href="/dashboard/cours/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nouveau cours
        </Button>
      </div>

      <div className="mt-6">
        <CoursTable data={coursList} initialStatus={initialStatus} />
      </div>
    </div>
  );
}
