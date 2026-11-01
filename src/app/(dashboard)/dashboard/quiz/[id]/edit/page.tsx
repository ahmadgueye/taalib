import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

// Ancienne adresse : infos et questions sont désormais sur la page du quiz.
export default async function Page({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/quiz/${id}`);
}
