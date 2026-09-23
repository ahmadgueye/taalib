"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function WelcomeToast({ show }: { show: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!show) return;
    toast.success("Bienvenue sur Taalib !");
    router.replace("/");
  }, [show, router]);

  return null;
}
