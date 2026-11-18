"use client";

/**
 * Sync, for the person who signed in.
 *
 * A button rather than something that happens quietly in the background.
 * Two reasons. Revision happens on patchy connections and a silent sync that
 * failed is indistinguishable from one that worked, which is the worst of
 * both; and someone whose hifz is leaving their device should be the one who
 * decided it was leaving.
 */
export function SyncPanel({
  email,
  synced,
  busy,
  said,
  failed,
  onSync,
  onSignOut,
}: {
  email: string;
  /** Whether this device's trail has ever reached the server. */
  synced: boolean;
  busy: boolean;
  said: string | null;
  failed: boolean;
  onSync: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-4 border-t border-[var(--color-rule)] pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] ">
        Your account
      </p>
      <p className="mt-1 break-words text-xs text-[var(--color-ink-soft)] ">
        {email}
      </p>

      <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)] ">
        {synced
          ? "This trail is on the server as well as this browser."
          : "This trail has not left this browser yet."}
      </p>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={busy}
          className="min-h-[44px] flex-1 rounded-xl bg-[var(--color-brand)] px-3 text-sm font-medium text-[var(--color-card)] transition-opacity duration-150 ease-out active:opacity-80 disabled:opacity-50 sm:min-h-0 sm:py-2"
        >
          {busy ? "Syncing" : synced ? "Sync now" : "Sync for the first time"}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          className="min-h-[44px] rounded-xl border border-[var(--color-rule)] px-3 text-sm disabled:opacity-50  sm:min-h-0 sm:py-2"
        >
          Sign out
        </button>
      </div>

      <p
        aria-live="polite"
        className={`mt-2 min-h-[1rem] text-xs ${
          failed
            ? "text-[var(--color-lost)]"
            : "text-[var(--color-ink-soft)] "
        }`}
      >
        {said}
      </p>

      <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)] ">
        Signing out leaves this trail on this device. It does not delete
        anything.
      </p>
    </div>
  );
}
