import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Sur Vercel (Fluid compute), une instance reste en vie entre deux requêtes
// avec ses connexions ouvertes ; au repos, le pooler Supabase ou le réseau
// peut les couper sans prévenir, et une requête envoyée sur l'une d'elles
// attend alors indéfiniment (l'accueil du dashboard, qui en ouvre beaucoup,
// tombait en timeout de 5 minutes). On ferme donc les connexions inactives
// avant que ça arrive, on les renouvelle régulièrement et on borne
// l'établissement d'une connexion.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
