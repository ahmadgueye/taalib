import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ClassForm } from "@/components/dashboard/class-form";
import { getCurrentProfile } from "@/lib/auth/get-session";

export default async function NewClassPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Classes", href: "/dashboard/classes" },
          { label: "Nouvelle classe" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouvelle classe
      </h1>
      <div className="mt-6">
        <ClassForm />
      </div>
    </div>
  );
}
