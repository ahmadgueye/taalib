import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/public/back-button";
import { ParcoursTrack } from "@/components/public/parcours-track";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";
import {
  getParcoursBySlug,
  getParcoursProgress,
} from "@/lib/db/queries/parcours";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getParcoursBySlug(slug);
  const title = p?.title ?? "Parcours";
  const description = p?.description ?? defaultDescription;
  return {
    title: `${title} — Taalib`,
    description,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function ParcoursDetailPage({ params }: Props) {
  const { slug } = await params;
  const p = await getParcoursBySlug(slug);

  if (!p) notFound();

  const profile = await getCurrentProfile();
  const steps = await getParcoursProgress(p, profile?.id ?? null);

  return (
    <div className="animate-in fade-in duration-300">
      <BackButton />
      <nav className="mt-3 text-sm text-muted-foreground">
        <Link href="/parcours" className="hover:text-foreground">
          Parcours
        </Link>{" "}
        / <span className="text-foreground">{p.title}</span>
      </nav>

      <div className="mt-2 max-w-2xl">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
          {p.title}
        </h1>
        {p.description && (
          <p className="mt-2 text-muted-foreground">{p.description}</p>
        )}
        {!profile && (
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
          >
            Se connecter pour commencer →
          </Link>
        )}
      </div>

      <div className="mt-8">
        <ParcoursTrack steps={steps} />
      </div>
    </div>
  );
}
