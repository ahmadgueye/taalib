import { redirect } from "next/navigation";

// Les thématiques se gèrent depuis la page de leur cours.
export default function DashboardThematiquesPage() {
  redirect("/dashboard/cours");
}
