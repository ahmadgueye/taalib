import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { isProfileComplete } from "@/lib/profile-info";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const {
      error,
      data: { user },
    } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      // Nouvel inscrit, ou étudiant inscrit avant l'ajout des informations
      // du profil : il les renseigne avant d'aller plus loin.
      if (!profile || !isProfileComplete(profile)) {
        const onboardingUrl = new URL("/bienvenue", origin);
        onboardingUrl.searchParams.set("next", next);
        return NextResponse.redirect(onboardingUrl);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
