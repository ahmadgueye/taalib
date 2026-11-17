"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// Copie l'adresse complète d'une page du site (ex. la page publique d'un
// certificat) à partir de son chemin.
export function CopyLinkButton({
  path,
  variant = "default",
  className,
}: {
  path: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible, recopie le lien depuis la barre d'adresse.");
    }
  }

  return (
    <Button variant={variant} size="lg" onClick={copy} className={className}>
      <Link2 />
      Copier le lien
    </Button>
  );
}
