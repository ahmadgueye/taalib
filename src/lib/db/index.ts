import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Le pooler Supabase en mode transaction (port 6543) ne supporte pas le
// pipelining : postgres-js, au-delà de `max` requêtes simultanées, en envoie
// plusieurs à la suite sur une même connexion, et l'une d'elles reste alors
// sans réponse jusqu'au timeout de la fonction (l'accueil du dashboard, qui
// lance une vingtaine de requêtes en parallèle, restait bloqué 5 minutes).
// `max_pipeline: 0` : une requête à la fois par connexion, les autres
// attendent leur tour.
//
// Sur Vercel (Fluid compute), une instance garde aussi ses connexions entre
// deux requêtes : on ferme celles qui sont inactives avant que le pooler ne
// les coupe, on les renouvelle et on borne l'établissement d'une connexion.
// `max_pipeline` est lu par postgres-js mais absent de ses types : l'objet
// séparé évite la vérification des propriétés en trop.
const options = {
  prepare: false,
  max_pipeline: 0,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
};
const client = postgres(process.env.DATABASE_URL!, options);

export const db = drizzle(client, { schema });
