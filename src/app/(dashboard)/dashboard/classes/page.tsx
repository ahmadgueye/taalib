import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClassesTable } from "@/components/dashboard/classes-table";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { getAllClasses } from "@/lib/db/queries/classes";

export const metadata: Metadata = { title: "Classes" };

export default async function DashboardClassesPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const classesList = await getAllClasses();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Classes
        </h1>
        <Button
          render={<Link href="/dashboard/classes/new" />}
          nativeButton={false}
        >
          <Plus className="size-4" />
          Nouvelle classe
        </Button>
      </div>

      <div className="mt-6">
        <ClassesTable data={classesList} />
      </div>
    </div>
  );
}
