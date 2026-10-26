import type { Metadata } from "next";
import Link from "next/link";

import { JoinClassForm } from "@/components/public/join-class-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/get-session";
import { normalizeInviteCode } from "@/lib/class-invite";
import {
  getClassByInviteCode,
  isClassMember,
} from "@/lib/db/queries/classes";

export const metadata: Metadata = {
  title: "Rejoindre une classe — Taalib",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function RejoindreClassePage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = normalizeInviteCode(decodeURIComponent(rawCode));
  const [classe, profile] = await Promise.all([
    getClassByInviteCode(code),
    getCurrentProfile(),
  ]);

  if (!classe || !classe.inviteEnabled) {
    return (
      <JoinCard
        title="Code invalide"
        description="Ce code d'invitation n'existe pas ou n'est plus actif. Vérifie-le auprès de ton enseignant."
      >
        <Button
          render={<Link href="/rejoindre" />}
          nativeButton={false}
          variant="outline"
        >
          Saisir un autre code
        </Button>
      </JoinCard>
    );
  }

  if (!profile) {
    return (
      <JoinCard
        title={classe.name}
        description="Connecte-toi pour rejoindre cette classe."
      >
        <Button
          render={<Link href={`/login?next=/rejoindre/${code}`} />}
          nativeButton={false}
        >
          Se connecter
        </Button>
      </JoinCard>
    );
  }

  if (await isClassMember(classe.id, profile.id)) {
    return (
      <JoinCard
        title={classe.name}
        description="Tu fais partie de cette classe."
      >
        <Button render={<Link href="/" />} nativeButton={false}>
          Aller à l&apos;accueil
        </Button>
      </JoinCard>
    );
  }

  return (
    <JoinCard
      title={classe.name}
      description={classe.description ?? "Tu as été invité à rejoindre cette classe."}
    >
      <JoinClassForm code={code} />
    </JoinCard>
  );
}

function JoinCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
