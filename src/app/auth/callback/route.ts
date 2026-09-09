import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
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
        .select({ fullName: profiles.fullName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      if (!profile?.fullName) {
        const onboardingUrl = new URL("/compte", origin);
        onboardingUrl.searchParams.set("next", next);
        return NextResponse.redirect(onboardingUrl);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
