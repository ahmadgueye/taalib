"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? "Redirection…" : "Continuer avec Google"}
    </Button>
  );
}
