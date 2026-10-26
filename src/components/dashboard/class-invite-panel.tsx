"use client";

import { useTransition } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { regenerateInviteCode, setInviteEnabled } from "@/lib/actions/classes";

export function ClassInvitePanel({
  classId,
  inviteCode,
  inviteEnabled,
}: {
  classId: string;
  inviteCode: string;
  inviteEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  async function copyLink() {
    const url = `${window.location.origin}/rejoindre/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien d'invitation copié.");
    } catch {
      toast.error("Copie impossible, recopie le lien à la main.");
    }
  }

  return (
    <div className="flex flex-col gap-4 border p-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold tracking-widest">
          {inviteCode}
        </span>
        <Badge variant={inviteEnabled ? "default" : "secondary"}>
          {inviteEnabled ? "Ouverte" : "Fermée"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {inviteEnabled
          ? "Les étudiants rejoignent la classe en ouvrant le lien, ou en saisissant ce code sur /rejoindre."
          : "Les inscriptions par code sont fermées. Tu peux toujours ajouter des étudiants à la main."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyLink} disabled={!inviteEnabled}>
          <Copy className="size-4" />
          Copier le lien
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await regenerateInviteCode(classId);
              toast.success("Nouveau code généré, l'ancien ne fonctionne plus.");
            })
          }
        >
          <RefreshCw className="size-4" />
          Nouveau code
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setInviteEnabled(classId, !inviteEnabled);
            })
          }
        >
          {inviteEnabled ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
        </Button>
      </div>
    </div>
  );
}
