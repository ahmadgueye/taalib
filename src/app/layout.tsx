import type { Metadata, Viewport } from "next";
import {
  Manrope,
  Geist_Mono,
  Noto_Naskh_Arabic,
  Scheherazade_New,
  Amiri,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { defaultDescription, siteOpenGraph } from "@/lib/metadata";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bluuNext = localFont({
  variable: "--font-heading",
  src: [
    {
      path: "../../public/fonts/bluu-next/bluunext-titling.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/bluu-next/bluunext-titling.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/bluu-next/bluunext-bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/bluu-next/bluunext-bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/bluu-next/bluunext-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/bluu-next/bluunext-bolditalic.woff",
      weight: "700",
      style: "italic",
    },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

const scheherazadeNew = Scheherazade_New({
  variable: "--font-logo-arabic",
  subsets: ["arabic"],
  weight: ["700"],
});

const amiri = Amiri({
  variable: "--font-calligraphy",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Taalib",
  description: defaultDescription,
  openGraph: {
    ...siteOpenGraph,
    title: "Taalib",
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    title: "Taalib",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${manrope.variable} ${bluuNext.variable} ${geistMono.variable} ${notoNaskhArabic.variable} ${scheherazadeNew.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
