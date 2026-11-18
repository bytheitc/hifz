"use client";

import {
  BookOpenCheck,
  CircleHelp,
  Cloud,
  Download,
  GraduationCap,
  Keyboard,
  ListOrdered,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { REVIEW_INTERVALS_DAYS } from "@/lib/srs";

export type HelpTopic = "start" | "grades" | "queue" | "relearn" | "teaching" | "backup" | "account" | "keys" | "privacy";

const TOPICS: { id: HelpTopic; label: string; icon: React.ReactNode }[] = [
  { id: "start", label: "Getting started", icon: <BookOpenCheck /> },
  { id: "grades", label: "Solid, shaky, lost", icon: <CircleHelp /> },
  { id: "queue", label: "Today's queue", icon: <ListOrdered /> },
  { id: "relearn", label: "Slipping portions", icon: <RotateCcw /> },
  { id: "teaching", label: "Teaching a halaqah", icon: <GraduationCap /> },
  { id: "backup", label: "Backups and new phones", icon: <Download /> },
  { id: "account", label: "Accounts and sync", icon: <Cloud /> },
  { id: "keys", label: "Keyboard shortcuts", icon: <Keyboard /> },
  { id: "privacy", label: "Your data", icon: <ShieldCheck /> },
];

/** The help centre: every part of the app explained in one place, opened from the header or any "?" link. */
export function HelpCenter({
  open,
  onClose,
  topic,
  onTopic,
  onReplayTour,
}: {
  open: boolean;
  onClose: () => void;
  topic: HelpTopic;
  onTopic: (t: HelpTopic) => void;
  onReplayTour: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Help" description="How Hifz Trail works, in plain words." wide>
      <div className="grid gap-6 sm:grid-cols-[13rem_1fr]">
        <nav aria-label="Help topics" className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:mx-0 sm:flex-col sm:overflow-visible">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTopic(t.id)}
              aria-current={topic === t.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors [&_svg]:size-4 ${
                topic === t.id ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-wash)]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button type="button" onClick={onReplayTour} className="mt-2 hidden rounded-xl border border-dashed border-[var(--color-rule-strong)] px-3 py-2 text-left text-sm font-semibold text-[var(--color-brand)] sm:block">
            Replay the welcome tour
          </button>
        </nav>
        <article className="min-w-0 text-[15px] leading-relaxed text-[var(--color-ink-soft)] [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[var(--color-ink)] [&_p+p]:mt-3 [&_strong]:text-[var(--color-ink)]">
          <Topic id={topic} />
        </article>
      </div>
    </Modal>
  );
}

function Topic({ id }: { id: HelpTopic }) {
  switch (id) {
    case "start":
      return (
        <>
          <h3>Getting started</h3>
          <Steps
            items={[
              ["Add what you have memorised", "Under Your trail, choose a surah. Leave the last ayah empty for the whole surah, or give a range for part of one. Add as many as you hold."],
              ["Recite what is due", "Each day, Today's queue lists the portions to revise, in the order of the mushaf. Recite each one, from memory."],
              ["Grade it honestly", "Tap Solid, Shaky or Lost. The app decides when you see that portion next. That is all there is to it."],
            ]}
          />
          <p className="mt-4">The first time you open the app it shows a small sample trail, so you can see how it works. Clear it from the welcome tour or with Clear everything under Your trail.</p>
        </>
      );
    case "grades":
      return (
        <>
          <h3>Solid, shaky, lost</h3>
          <ul className="mt-3 space-y-3">
            <Grade tone="solid" name="Solid" body="You recited it fluently, without help. It moves up a stage and comes back after a longer gap." />
            <Grade tone="shaky" name="Shaky" body="You got through it, but hesitated or needed a prompt. It stays on its stage and comes back after the same gap." />
            <Grade tone="lost" name="Lost" body="You could not recite it. It goes back to the first stage and is due again tomorrow." />
          </ul>
          <p className="mt-4"><strong>The standard stages:</strong> {REVIEW_INTERVALS_DAYS.map((d) => `${d} day${d === 1 ? "" : "s"}`).join(", then ")}. You can switch to a gentler or more intensive set, or write your own, under "Revision schedule". A portion is never removed from your trail, however solid it gets.</p>
          <p>Tapped the wrong one? Press <strong>Undo</strong> on the bar at the bottom of the screen.</p>
        </>
      );
    case "queue":
      return (
        <>
          <h3>Today&apos;s queue</h3>
          <p>Everything due today, in the order of the mushaf. Most revision apps put the most overdue item first; people revising hifz go in order, because that is how the text sits in memory.</p>
          <p>A portion is <strong>overdue</strong> when its day has passed without a grade. Nothing bad happens; it simply waits at its place in the order.</p>
          <p><strong>The next seven days</strong> shows how many ayahs fall on each day. Check it before taking on something new: a heavy Thursday is easier to handle when you can see it coming.</p>
        </>
      );
    case "relearn":
      return (
        <>
          <h3>Slipping portions</h3>
          <p>When the same portion is lost again and again, another week of revision is unlikely to fix it. It did not settle the first time, and it needs re-learning.</p>
          <p>The app marks these as <strong>Slipping</strong>, shows the worst one at the top of the screen with the reasons, and lists the others under Also worth re-learning.</p>
        </>
      );
    case "teaching":
      return (
        <>
          <h3>Teaching a halaqah</h3>
          <p>Switch the header to <strong>Teaching</strong> and add your students. Each name shows how many portions they owe today, so you can choose who to hear next.</p>
          <p>Grades you record are marked as yours. On a day you heard a student, your grade counts over anything they marked at home; on the days between, their own revision counts as usual.</p>
          <p>Students can hand you their record as a file, and take back what you recorded, so you each see the whole week. A teacher&apos;s register is never uploaded by accident: it only moves by file.</p>
        </>
      );
    case "backup":
      return (
        <>
          <h3>Backups and new phones</h3>
          <p>Under Your trail, <strong>Save a copy</strong> downloads your whole trail as a file. On a new device, <strong>Restore</strong> reads it back.</p>
          <p>Restoring only ever adds: portions you already have are skipped, so opening the wrong file can never undo your revision.</p>
        </>
      );
    case "account":
      return (
        <>
          <h3>Accounts and sync</h3>
          <p>You never need an account. With one, your trail can follow you between devices.</p>
          <p>Sync happens when you press <strong>Sync now</strong>, never silently, so nothing leaves your device without you deciding. Signing out leaves the trail on the device; it does not delete anything.</p>
        </>
      );
    case "keys":
      return (
        <>
          <h3>Keyboard shortcuts</h3>
          <ul className="mt-3 space-y-2">
            {[["1", "Mark the first portion in the queue solid"], ["2", "Mark it shaky"], ["3", "Mark it lost"], ["U", "Undo the last grade"]].map(([k, v]) => (
              <li key={k} className="flex items-center gap-3">
                <kbd className="grid min-w-8 place-items-center rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-wash)] px-2 py-1 font-mono text-sm font-bold text-[var(--color-ink)]">{k}</kbd>
                {v}
              </li>
            ))}
          </ul>
          <p className="mt-4">The keys never fire while you are typing in a form.</p>
        </>
      );
    case "privacy":
      return (
        <>
          <h3>Your data</h3>
          <p>Without an account, your trail lives only in this browser: no server, nothing to breach. Clearing your browser&apos;s data clears it too, so keep a backup file.</p>
          <p>With an account, it is also stored on the server this app is connected to, from the first time you press sync.</p>
          <p>Hifz Trail has no ads and no tracking, and its code is open for anyone to check.</p>
        </>
      );
  }
}

function Steps({ items }: { items: [string, string][] }) {
  return (
    <ol className="mt-4 space-y-4">
      {items.map(([title, body], i) => (
        <li key={title} className="flex gap-3.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] text-sm font-bold text-white">{i + 1}</span>
          <div>
            <p className="font-bold text-[var(--color-ink)]">{title}</p>
            <p className="mt-0.5">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Grade({ tone, name, body }: { tone: "solid" | "shaky" | "lost"; name: string; body: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-[var(--color-rule)] p-3.5">
      <span className="mt-0.5 h-fit shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold" style={{ background: `var(--color-${tone}-soft)`, color: `var(--color-${tone})` }}>
        {name}
      </span>
      <p>{body}</p>
    </li>
  );
}
