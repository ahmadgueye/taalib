import { ImageResponse } from "next/og";

import { getContentAccess } from "@/lib/auth/content-access";
import { canSeeThematique } from "@/lib/content-access";
import { getHadithBySlug } from "@/lib/db/queries/hadiths";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [found, access] = await Promise.all([getHadithBySlug(slug), getContentAccess()]);
  // Même règle que la page : rien ne s'affiche de ce qui n'est pas débloqué.
  const h = found && canSeeThematique(access, found.thematiqueId) ? found : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fafafa",
          color: "#171717",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#737373" }}>
          Taalib{h ? ` · ${h.thematique.title}` : " · Hadith"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 64,
            fontWeight: 700,
            maxWidth: 1000,
          }}
        >
          {h?.title ?? "Hadith"}
        </div>
      </div>
    ),
    { ...size }
  );
}
