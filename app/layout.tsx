import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifz Trail",
  description:
    "Track what you have memorised of the Qur'an and what needs revising today. Offline, no account.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
