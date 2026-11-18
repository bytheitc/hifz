"use client";

import Link from "next/link";
import { CircleHelp, Cloud, CloudOff, GraduationCap, Smartphone, User } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import type { AccountStatus } from "@/lib/account";

/**
 * The app's top bar: home, whose trail this is (just me or a halaqah), help,
 * and where the trail lives. That last one is never decoration: it is the
 * honest answer to "if I clear my browser, do I lose this?".
 */
export function AppHeader({
  mode,
  onMode,
  account,
  onHelp,
}: {
  mode: "solo" | "teacher";
  onMode: (mode: "solo" | "teacher") => void;
  account: AccountStatus;
  onHelp: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-rule)] bg-[var(--color-card)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />

        <div role="group" aria-label="Whose trail" className="ml-auto flex rounded-xl bg-[var(--color-wash)] p-1 sm:ml-6">
          {(["solo", "teacher"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              aria-pressed={mode === m}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all [&_svg]:size-4 ${
                mode === m ? "bg-[var(--color-card)] text-[var(--color-ink)] shadow-[var(--shadow-card)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {m === "solo" ? <User /> : <GraduationCap />}
              <span className="hidden sm:inline">{m === "solo" ? "Just me" : "Teaching"}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button type="button" onClick={onHelp} className="btn btn-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]" aria-label="Help">
            <CircleHelp className="size-5" />
            <span className="hidden md:inline">Help</span>
          </button>
          <AccountChip account={account} />
        </div>
      </div>
    </header>
  );
}

function AccountChip({ account }: { account: AccountStatus }) {
  if (account.kind === "signed-in" || account.kind === "synced") {
    const synced = account.kind === "synced";
    return (
      <a href="#account" className="flex items-center gap-2 rounded-xl border border-[var(--color-rule)] py-1 pl-1 pr-3 text-sm" title={synced ? `Synced to ${account.email}` : `Signed in as ${account.email}, not synced yet`}>
        <span className="grid size-7 place-items-center rounded-lg bg-[var(--color-brand)] text-xs font-bold uppercase text-white">{account.email[0]}</span>
        <span className="hidden max-w-[10rem] truncate font-medium lg:inline">{account.email}</span>
        {synced ? <Cloud className="size-4 text-[var(--color-solid)]" /> : <CloudOff className="size-4 text-[var(--color-shaky)]" />}
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 rounded-xl bg-[var(--color-wash)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] lg:flex" title="Your trail is saved in this browser only">
        <Smartphone className="size-4" /> Saved on this device
      </span>
      {account.kind === "signed-out" ? (
        <Link href="/signin" className="btn btn-sm btn-primary">Sign in</Link>
      ) : (
        <Link href="/signup" className="btn btn-sm btn-ghost hidden sm:inline-flex">Account</Link>
      )}
    </div>
  );
}
