import { cache } from "react";

import { getCurrentProfile } from "@/lib/auth/get-session";
import { noAccess, type ContentAccess } from "@/lib/content-access";
import { getStudentAccess } from "@/lib/db/queries/content-access";

// Calculé une fois par requête (cache React) : la plupart des pages filtrent
// plusieurs listes avec le même accès.
export const getContentAccess = cache(async (): Promise<ContentAccess> => {
  const profile = await getCurrentProfile();
  if (!profile) return noAccess;
  if (profile.role === "admin" || profile.role === "contributor") {
    return { all: true };
  }
  return getStudentAccess(profile.id);
});
