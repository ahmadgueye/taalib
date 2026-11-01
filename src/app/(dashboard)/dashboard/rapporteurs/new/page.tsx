import { NarratorForm } from "@/components/dashboard/narrator-form";

export default function NewRapporteurPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nouveau rapporteur
      </h1>
      <div className="mt-6">
        <NarratorForm />
      </div>
    </div>
  );
}
