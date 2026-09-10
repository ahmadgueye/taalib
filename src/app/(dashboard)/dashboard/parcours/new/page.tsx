import { ParcoursForm } from "@/components/dashboard/parcours-form";

export default function NewParcoursPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau parcours
      </h1>
      <div className="mt-6">
        <ParcoursForm />
      </div>
    </div>
  );
}
