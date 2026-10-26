import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/compte", "/login", "/auth", "/api", "/rejoindre"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
