import { ImageResponse } from "next/og";

import { LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/lib/logo-path";
import { defaultDescription } from "@/lib/metadata";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Taalib — la plateforme de cours du programme Bayān";

// Seule image de partage du site : les pages réservées renvoient un visiteur
// non connecté (donc les aperçus de WhatsApp et autres) vers /login.
export default function Image() {
  const logoWidth = 420;
  const logoHeight = Math.round((logoWidth * LOGO_HEIGHT) / LOGO_WIDTH);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5ed",
        color: "#21140f",
      }}
    >
      <svg
        width={logoWidth}
        height={logoHeight}
        viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
      >
        <path d={LOGO_PATH} fill="#21140f" />
      </svg>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          fontSize: 36,
          color: "#5c4a40",
        }}
      >
        {defaultDescription}
      </div>
    </div>,
    { ...size },
  );
}
