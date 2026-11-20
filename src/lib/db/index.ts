import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Sur Vercel (Fluid compute), une instance garde ses connexions entre deux
// requêtes : on ferme celles qui sont inactives avant que le pooler Supabase
// ne les coupe, on les renouvelle et on borne l'établissement d'une connexion.
//
// Ne pas régler `max_pipeline` à 0 : postgres-js ne réserve la connexion
// d'une transaction que si `sent.length < max_pipeline`, donc avec 0 tout
// `db.transaction` échoue (UNSAFE_TRANSACTION) — la soumission d'un quiz
// affichait la page d'erreur.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
