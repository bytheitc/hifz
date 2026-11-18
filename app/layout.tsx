import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Nunito } from "next/font/google";
import { ServiceWorkerBridge } from "@/components/pwa/ServiceWorkerBridge";
import "./globals.css";

const sans = Nunito({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-nunito" });
// Only for surah names set in Arabic; preloading it would cost every page for a few words.
const quran = Amiri_Quran({ subsets: ["arabic"], weight: "400", variable: "--font-amiri-quran", preload: false });

export const metadata: Metadata = {
  title: "Hifz Trail",
  description:
    "A revision companion for hifz: know what to recite today, catch what is slipping, and keep your teacher in the loop. Free, with or without an account.",
  applicationName: "Hifz Trail",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Hifz Trail", statusBarStyle: "default" },
};

/**
 * `viewportFit: "cover"` lets the page run under the notch and home
 * indicator; the layout pays that back with `env(safe-area-inset-*)` padding
 * where it matters. The theme colours are declared per scheme so the phone's
 * status bar matches the page instead of sitting as a white strip above a
 * dark one.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${quran.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerBridge />
      </body>
    </html>
  );
}
