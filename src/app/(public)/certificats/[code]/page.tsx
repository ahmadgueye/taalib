import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { CertificateDocument } from "@/components/public/certificate-document";
import { CopyLinkButton } from "@/components/public/copy-link-button";
import { certificatePath, normalizeCertificateCode } from "@/lib/certificates";
import { getCertificateByCode } from "@/lib/db/queries/certificates";
import { siteOpenGraph } from "@/lib/metadata";

type Props = {
  params: Promise<{ code: string }>;
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Seule page de contenu ouverte sans compte : n'importe qui ayant le lien
// (ou le QR code) vérifie le certificat. Un certificat sans nom de titulaire
// n'est pas montré, l'étudiant doit d'abord compléter son profil.
async function findCertificate(rawCode: string) {
  const code = normalizeCertificateCode(decodeURIComponent(rawCode));
  if (!code) return null;
  const certificate = await getCertificateByCode(code);
  const name = certificate?.user.fullName?.trim();
  return certificate && name ? { ...certificate, recipientName: name } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const c = await findCertificate(code);
  // Les pages de certificat ne sont jamais indexées : on ne les trouve
  // qu'avec leur lien.
  const robots = { index: false, follow: false };
  if (!c) return { title: "Page introuvable — Taalib", robots };
  const title = `Certificat de ${c.recipientName}`;
  const description = `${c.recipientName} a validé la thématique « ${c.thematiqueTitle} » sur Taalib.`;
  return {
    title: `${title} — Taalib`,
    description,
    robots,
    openGraph: { ...siteOpenGraph, title, description },
  };
}

export default async function CertificatePage({ params }: Props) {
  const { code } = await params;
  const c = await findCertificate(code);
  if (!c) notFound();

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center bg-emerald-700 text-white"
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span>
            <strong>Certificat authentique</strong>, délivré par Taalib le{" "}
            {dateFormat.format(c.issuedAt)}
          </span>
        </p>
        <CopyLinkButton path={certificatePath(c.code)} />
      </div>

      <div className="shadow-[0_1px_2px_rgba(33,20,15,0.12),0_12px_32px_rgba(33,20,15,0.12)]">
        <CertificateDocument
          certificate={{
            code: c.code,
            recipientName: c.recipientName,
            thematiqueTitle: c.thematiqueTitle,
            coursTitle: c.coursTitle,
            lessonCount: c.lessonTitles.length,
            quizCount: c.quizTitles.length,
            issuedAt: c.issuedAt,
          }}
        />
      </div>

      {/* Mise en avant, juste sous le certificat : ce qu'il vaut, et ce
          qu'il ne vaut pas. */}
      <p className="border-l-4 border-chart-1 bg-muted px-5 py-4 leading-relaxed">
        Ce certificat atteste la réussite d&apos;une thématique sur Taalib. Il
        ne constitue pas un diplôme reconnu par l&apos;État, ni une{" "}
        <em>ijāza</em> (autorisation d&apos;enseigner ou de transmettre).
      </p>

      <section
        aria-labelledby="valide"
        className="grid gap-10 pt-2 md:grid-cols-2"
      >
        <div className="flex flex-col gap-3">
          <h1
            id="valide"
            className="font-heading text-2xl leading-tight font-semibold"
          >
            {/^[aeiouyhàâéèêîïôû]/i.test(c.recipientName) ? "Ce qu’" : "Ce que "}
            {c.recipientName} a validé
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Ce certificat est délivré automatiquement lorsque toutes les leçons
            d&apos;une thématique sont lues et que chacun de ses quiz est réussi
            avec au moins le score demandé par l&apos;enseignant.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Taalib est la plateforme de cours du programme Bayān. Cette page ne
            montre aucun autre renseignement sur le titulaire.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <ValidatedList
            label={`${c.lessonTitles.length} leçon${c.lessonTitles.length > 1 ? "s" : ""} lue${c.lessonTitles.length > 1 ? "s" : ""}`}
            items={c.lessonTitles}
          />
          {c.quizTitles.length > 0 && (
            <ValidatedList
              label={`${c.quizTitles.length} quiz réussi${c.quizTitles.length > 1 ? "s" : ""}`}
              items={c.quizTitles}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function ValidatedList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold">{label}</p>
      <ul className="divide-y border bg-background">
        {items.map((title, i) => (
          <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 text-sm">
            <Check
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
              strokeWidth={3}
            />
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}
