import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifz Trail",
  description:
    "Track what you have memorised of the Qur'an and what needs revising today. Offline, no account.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
