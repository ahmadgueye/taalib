import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Pages qui exigent un compte. Le catalogue est réservé aux étudiants de
// l'institut ; restent ouverts l'accueil (vitrine), /coran, /login et
// /rejoindre. Ce n'est qu'un raccourci UX : chaque page vérifie aussi l'accès
// de l'utilisateur au contenu (lib/auth/content-access.ts).
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/compte",
  "/cours",
  "/thematiques",
  "/ressources",
  "/quiz",
  "/hadiths",
  "/seances",
  "/recherche",
  "/memorisation",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  if (!user && isProtected(request.nextUrl.pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
