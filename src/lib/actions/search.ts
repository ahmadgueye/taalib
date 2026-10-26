"use server";

import { getContentAccess } from "@/lib/auth/content-access";
import { searchCatalogue } from "@/lib/db/queries/search";

export async function searchCatalogueAction(query: string) {
  return searchCatalogue(query, { access: await getContentAccess() });
}
