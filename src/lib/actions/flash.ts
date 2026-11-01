import { cookies } from "next/headers";

import { FLASH_COOKIE } from "@/lib/flash";

// À appeler juste avant le redirect() d'une action de création ou de
// modification. Lisible côté client (pas httpOnly) : ce n'est qu'un libellé.
// Next encode déjà la valeur (encodeURIComponent) : ne pas le refaire ici.
export async function setFlash(message: string) {
  (await cookies()).set(FLASH_COOKIE, message, {
    path: "/dashboard",
    maxAge: 30,
    sameSite: "lax",
  });
}
