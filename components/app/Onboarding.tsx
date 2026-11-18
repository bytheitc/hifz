"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Cloud, ListOrdered, Smartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export const ONBOARDED_KEY = "hifz-trail:onboarded";

export function hasOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true; // storage unavailable: don't nag on every load
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // Private mode: the tour may show again, which is harmless.
  }
}

/**
 * The welcome tour, on a first visit and from Help. Four short steps, the
 * last of which is the one real decision: keep the sample trail to explore,
 * or start empty. It never blocks: Skip is always there.
 */
export function Onboarding({
  open,
  onClose,
  hasSample,
  onStartEmpty,
  accountsOpen,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  hasSample: boolean;
  onStartEmpty: () => void;
  accountsOpen: boolean;
  signedIn: boolean;
}) {
  const [step, setStep] = useState(0);
  const last = 3;

  const finish = () => {
    markOnboarded();
    setStep(0);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={finish}
      title={["Welcome to Hifz Trail", "Add what you know", "Recite, then grade", "Where your trail lives"][step]}
      description={`Step ${step + 1} of ${last + 1}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[var(--color-brand)]" : "w-1.5 bg-[var(--color-rule-strong)]"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" /> Back
              </button>
            ) : (
              <button type="button" className="btn btn-sm text-[var(--color-ink-soft)]" onClick={finish}>
                Skip
              </button>
            )}
            {step < last && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 && (
        <div>
          <p className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
            Hifz Trail keeps what you have memorised from slipping. It tells you what to recite each day, and adjusts to how each portion is going.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [<BookOpenCheck key="a" />, "Add your surahs"],
              [<ListOrdered key="b" />, "Recite today's queue"],
              [<ArrowRight key="c" />, "Grade, and it plans the rest"],
            ].map(([icon, text]) => (
              <li key={text as string} className="rounded-2xl border border-[var(--color-rule)] p-4 text-sm font-semibold">
                <span className="mb-2 grid size-9 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] [&_svg]:size-4">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          <p>Under <strong className="text-[var(--color-ink)]">Your trail</strong>, choose a surah and press Add. Leave the last ayah empty to add the whole surah, or type a range for part of one.</p>
          <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-wash)] p-4">
            <div className="flex gap-2">
              <span className="flex-1 rounded-xl border border-[var(--color-rule-strong)] bg-[var(--color-card)] px-3 py-2 text-sm">67. Al-Mulk (30 ayahs)</span>
              <span className="w-14 rounded-xl border border-[var(--color-rule-strong)] bg-[var(--color-card)] px-3 py-2 text-center text-sm">1</span>
              <span className="w-14 rounded-xl border border-[var(--color-rule-strong)] bg-[var(--color-card)] px-3 py-2 text-center text-sm text-[var(--color-ink-faint)]">all</span>
            </div>
          </div>
          <p>Add everything you hold, even the surahs you know well. Solid ones simply come round less often.</p>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          <p>Each day, recite what is due, from memory, then tap how it went:</p>
          <ul className="space-y-2">
            {[
              ["solid", "Solid", "Fluent. Comes back later next time."],
              ["shaky", "Shaky", "Got through, with hesitation. Same gap again."],
              ["lost", "Lost", "Couldn't recite it. Back tomorrow."],
            ].map(([tone, name, body]) => (
              <li key={tone} className="flex items-center gap-3">
                <span className="w-16 shrink-0 rounded-lg py-1 text-center text-sm font-bold" style={{ background: `var(--color-${tone}-soft)`, color: `var(--color-${tone})` }}>{name}</span>
                {body}
              </li>
            ))}
          </ul>
          <p>Honest grades make the schedule work. A mistaken tap can always be undone.</p>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-[var(--color-rule)] p-4">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-[var(--color-brand)]" />
            <div className="text-sm">
              <p className="font-bold">{signedIn ? "Signed in" : "You're using Hifz Trail without an account"}</p>
              <p className="mt-0.5 text-[var(--color-ink-soft)]">
                {signedIn ? "Press Sync now whenever you want this trail on your other devices." : "Your trail stays in this browser. Save a backup file now and then, from Your trail."}
              </p>
            </div>
          </div>
          {!signedIn && accountsOpen && (
            <div className="flex gap-3 rounded-2xl border border-[var(--color-rule)] p-4">
              <Cloud className="mt-0.5 size-5 shrink-0 text-[var(--color-brand)]" />
              <div className="text-sm">
                <p className="font-bold">Want it on every device?</p>
                <p className="mt-0.5 text-[var(--color-ink-soft)]">A free account lets your trail follow you. You can add one any time.</p>
                <Link href="/signup" onClick={markOnboarded} className="mt-2 inline-block font-bold text-[var(--color-brand)] hover:underline">Create a free account</Link>
              </div>
            </div>
          )}
          {hasSample ? (
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <button type="button" className="btn btn-ghost" onClick={finish}>Explore the sample first</button>
              <button type="button" className="btn btn-primary" onClick={() => { onStartEmpty(); finish(); }}>Start my own trail</button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary mt-2 w-full" onClick={finish}>Let&apos;s begin</button>
          )}
          {hasSample && <p className="text-center text-xs text-[var(--color-ink-faint)]">The four portions on screen now are a sample. Start my own trail clears them.</p>}
        </div>
      )}
    </Modal>
  );
}
