import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

/**
 * Shown when a page is asked for that was never stored and the network is
 * gone. The trail itself needs no connection, so the way back is the trail.
 */
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-extrabold">You are offline</h1>
      <p className="text-sm text-[var(--color-ink-soft)]">
        This page was not saved to your device. Your trail does not need a connection, so open it and carry on.
      </p>
      <a href="/trail" className="btn btn-primary">Open my trail</a>
    </main>
  );
}
