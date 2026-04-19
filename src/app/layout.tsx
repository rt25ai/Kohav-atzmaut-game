import type { Metadata, Viewport } from "next";
import { Rubik, Secular_One } from "next/font/google";

import { AppShell } from "@/components/shared/app-shell";
import { SoundProvider } from "@/components/shared/sound-provider";
import { APP_NAME, APP_SHORT_NAME, DEFAULT_PUBLIC_URL } from "@/lib/config";

import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

const secularOne = Secular_One({
  variable: "--font-display",
  subsets: ["hebrew", "latin"],
  weight: "400",
});

const APP_DESCRIPTION =
  "סקר קהילתי חי, חגיגי ומונפש ליום העצמאות של כוכב מיכאל.";
const META_IMAGE_PATH = "/branding/site-meta.png";
const ICON_IMAGE_PATH = "/branding/site-icon.png";
const APPLE_ICON_PATH = "/branding/site-apple.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#041224",
};

export const metadata: Metadata = {
  metadataBase: new URL(DEFAULT_PUBLIC_URL),
  applicationName: APP_NAME,
  title: APP_SHORT_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: [{ url: ICON_IMAGE_PATH, type: "image/png" }],
    shortcut: [{ url: ICON_IMAGE_PATH, type: "image/png" }],
    apple: [{ url: APPLE_ICON_PATH, type: "image/png" }],
  },
  openGraph: {
    title: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    locale: "he_IL",
    siteName: APP_NAME,
    type: "website",
    images: [
      {
        url: META_IMAGE_PATH,
        width: 1200,
        height: 1200,
        alt: APP_SHORT_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    images: [META_IMAGE_PATH],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${rubik.variable} ${secularOne.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only absolute right-4 top-4 z-50 rounded-full bg-white px-4 py-2 text-[#08162d] focus:not-sr-only focus:outline-2 focus:outline-[#5cb7ff]"
        >
          דילוג לתוכן הראשי
        </a>
        <SoundProvider>
          <AppShell>{children}</AppShell>
        </SoundProvider>
      </body>
    </html>
  );
}
