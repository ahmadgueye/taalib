import { ImageResponse } from "next/og";

import { getContentAccess } from "@/lib/auth/content-access";
import { canSeeCours } from "@/lib/content-access";
import { getCoursBySlug } from "@/lib/db/queries/cours";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [found, access] = await Promise.all([getCoursBySlug(slug), getContentAccess()]);
  // Même règle que la page : rien ne s'affiche de ce qui n'est pas débloqué.
  const c = found && canSeeCours(access, found.id) ? found : null;

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
          Taalib · Cours
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
          {c?.title ?? "Cours"}
        </div>
      </div>
    ),
    { ...size }
  );
}
