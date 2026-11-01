"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { FLASH_COOKIE } from "@/lib/flash";

// Affiche le message déposé par setFlash() à chaque changement de page du
// dashboard, puis efface le cookie pour qu'il ne s'affiche qu'une fois.
export function FlashToaster() {
  const pathname = usePathname();

  useEffect(() => {
    const entry = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${FLASH_COOKIE}=`));
    if (!entry) return;

    document.cookie = `${FLASH_COOKIE}=; path=/dashboard; max-age=0`;
    const message = decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1));
    if (message) toast.success(message);
  }, [pathname]);

  return null;
}
