import { NextResponse } from "next/server";

import { getRecitations } from "@/lib/quran/queries";

export async function GET() {
  const recitations = await getRecitations();
  return NextResponse.json({ recitations });
}
