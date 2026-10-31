"use client";

import { useEffect, useMemo, useState } from "react";
import { SURAHS, checkPortion, describePortion, surah } from "@/lib/quran";
import {
  type Grade,
  type TrackedPortion,
  dueDate,
  dueOn,
  review,
  toDateOnly,
  upcomingLoad,
} from "@/lib/srs";
import { computeProgress, needsRelearning, suggestNext } from "@/lib/progress";
import { loadPortions, savePortions } from "@/lib/storage";

/** A small starting trail, so the first load shows what the app is for
 *  instead of an empty page with a form on it. Cleared with one button. */
function sampleTrail(today: string): TrackedPortion[] {
  return [
    { id: "s1", surah: 1, fromAyah: 1, toAyah: 7, box: 4, lastReviewed: today, addedOn: "2024-09-01", lapses: 0 },
    { id: "s2", surah: 67, fromAyah: 1, toAyah: 30, box: 2, lastReviewed: "2026-10-20", addedOn: "2026-02-10", lapses: 1 },
    { id: "s3", surah: 36, fromAyah: 1, toAyah: 40, box: 1, lastReviewed: "2026-10-25", addedOn: "2026-08-14", lapses: 3 },
    { id: "s4", surah: 78, fromAyah: 1, toAyah: 40, box: 0, lastReviewed: null, addedOn: "2026-10-29", lapses: 0 },
  ];
}

export default function Home() {
  const [portions, setPortions] = useState<TrackedPortion[]>([]);
  const [today, setToday] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const date = toDateOnly(new Date());
    const stored = loadPortions();
    setPortions(stored.length > 0 ? stored : sampleTrail(date));
    setToday(date);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePortions(portions);
  }, [portions, hydrated]);

  const due = useMemo(
    () => (today ? dueOn(portions, today) : []),
    [portions, today]
  );
  const progress = useMemo(() => computeProgress(portions), [portions]);
  const relearn = useMemo(() => needsRelearning(portions), [portions]);
  const load = useMemo(
    () => (today ? upcomingLoad(portions, today, 7) : []),
    [portions, today]
  );
  const suggestions = useMemo(() => suggestNext(portions, 4), [portions]);

  const peakLoad = Math.max(1, ...load.map((d) => d.ayahs));

  function grade(portion: TrackedPortion, value: Grade) {
    if (!today) return;
    setPortions((prev) =>
      prev.map((p) => (p.id === portion.id ? review(p, value, today) : p))
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Hifz Trail</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-white/60">
          What you have memorised, and what needs reciting today. Everything stays on
          this device.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 dark:bg-white/5">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">
            {progress.ayahsMemorised.toLocaleString()}
            <span className="text-sm font-normal text-[var(--color-ink-soft)]">
              {" "}
              / {progress.totalAyahs.toLocaleString()} ayahs
            </span>
          </p>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {progress.percent.toFixed(1)}% · {progress.surahsComplete} surah
            {progress.surahsComplete === 1 ? "" : "s"} complete ·{" "}
            {progress.surahsStarted} started
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-brand-soft)]"
          role="progressbar"
          aria-valuenow={Math.round(progress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Proportion of the Qur'an memorised"
        >
          <div
            className="h-full rounded-full bg-[var(--color-brand)]"
            style={{ width: `${Math.min(100, progress.percent)}%` }}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">
          Due today{due.length > 0 && ` · ${due.length}`}
        </h2>
        {due.length === 0 ? (
          <p className="rounded-lg border border-[var(--color-rule)] p-4 text-sm text-[var(--color-ink-soft)]">
            Nothing due. {portions.length === 0 && "Add a portion below to begin."}
          </p>
        ) : (
          <ul className="space-y-2">
            {due.map((portion) => (
              <li
                key={portion.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-card)] p-3 dark:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{describePortion(portion)}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {portion.lastReviewed
                      ? `last recited ${portion.lastReviewed}`
                      : "new — not yet revised"}
                    {portion.lapses > 0 &&
                      ` · ${portion.lapses} lapse${portion.lapses === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(["solid", "shaky", "lost"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => grade(portion, value)}
                      className={`rounded px-2.5 py-1 text-xs font-medium text-white ${
                        value === "solid"
                          ? "bg-[var(--color-solid)]"
                          : value === "shaky"
                            ? "bg-[var(--color-shaky)]"
                            : "bg-[var(--color-lost)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {relearn.length > 0 && (
        <section className="mb-8 rounded-lg border border-[var(--color-lost)]/30 bg-[var(--color-lost)]/5 p-4">
          <h2 className="text-sm font-semibold">Worth re-learning properly</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            These have been lost several times. Another week of revision is unlikely to
            fix what did not settle the first time.
          </p>
          <ul className="mt-2 text-sm">
            {relearn.map((portion) => (
              <li key={portion.id}>
                {describePortion(portion)} — {portion.lapses} lapses
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold">The next seven days</h2>
        <p className="mb-3 text-xs text-[var(--color-ink-soft)]">
          Check this before taking on something new — the point is to see a heavy day
          coming while you can still do something about it.
        </p>
        <ul className="flex items-end gap-2">
          {load.map((day) => (
            <li key={day.date} className="flex-1 text-center">
              <div className="flex h-20 items-end">
                <div
                  className="w-full rounded-t bg-[var(--color-brand)]"
                  style={{ height: `${(day.ayahs / peakLoad) * 100}%` }}
                  title={`${day.ayahs} ayahs`}
                />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-[var(--color-ink-soft)]">
                {day.date.slice(5)}
              </p>
              <p className="text-[10px] tabular-nums">{day.ayahs}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Your trail</h2>
          <button
            type="button"
            onClick={() => setPortions([])}
            className="ml-auto rounded border border-[var(--color-rule)] px-2 py-1 text-xs"
          >
            Clear everything
          </button>
        </div>

        <AddPortionForm
          onAdd={(portion) => {
            if (!today) return;
            setPortions((prev) => [
              ...prev,
              { ...portion, box: 0, lastReviewed: null, addedOn: today, lapses: 0 },
            ]);
          }}
        />

        {portions.length > 0 && (
          <ul className="mt-3 space-y-1">
            {[...portions]
              .sort((a, b) => a.surah - b.surah || a.fromAyah - b.fromAyah)
              .map((portion) => (
                <li
                  key={portion.id}
                  className="flex items-center gap-3 rounded border border-[var(--color-rule)] px-3 py-1.5 text-sm"
                >
                  <span className="truncate">{describePortion(portion)}</span>
                  <span className="text-xs text-[var(--color-ink-soft)]">
                    box {portion.box} · next {dueDate(portion)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${describePortion(portion)}`}
                    onClick={() =>
                      setPortions((prev) => prev.filter((p) => p.id !== portion.id))
                    }
                    className="ml-auto text-xs text-[var(--color-ink-soft)] hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {suggestions.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">Short surahs you have not started</h2>
          <p className="mb-2 text-xs text-[var(--color-ink-soft)]">
            Shortest first — a good place to go next.
          </p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li
                key={s.number}
                className="rounded border border-[var(--color-rule)] px-2.5 py-1 text-sm"
              >
                {s.name}{" "}
                <span className="text-xs text-[var(--color-ink-soft)]">
                  {s.ayahCount} ayahs
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function AddPortionForm({
  onAdd,
}: {
  onAdd: (portion: { id: string; surah: number; fromAyah: number; toAyah: number }) => void;
}) {
  const [surahNumber, setSurahNumber] = useState(114);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = surah(surahNumber);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fromAyah = Number(from);
    // An empty "to" means the whole surah — the common case, and making
    // someone look up the ayah count to type it back in would be absurd.
    const toAyah = to.trim() === "" ? (selected?.ayahCount ?? 0) : Number(to);

    if (!Number.isInteger(fromAyah) || !Number.isInteger(toAyah)) {
      return setError("Ayah numbers must be whole numbers.");
    }

    const problem = checkPortion(surahNumber, fromAyah, toAyah);
    if (problem) {
      return setError(
        problem.kind === "reversed"
          ? "The last ayah comes before the first one."
          : problem.kind === "out-of-range"
            ? `${selected?.name} has ${problem.ayahCount} ayahs.`
            : "That surah does not exist."
      );
    }

    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      surah: surahNumber,
      fromAyah,
      toAyah,
    });
    setError(null);
    setTo("");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select
        value={surahNumber}
        onChange={(e) => setSurahNumber(Number(e.target.value))}
        aria-label="Surah"
        className="min-w-48 flex-1 rounded border border-[var(--color-rule)] bg-transparent px-2 py-1.5 text-sm"
      >
        {SURAHS.map((s) => (
          <option key={s.number} value={s.number}>
            {s.number}. {s.name} ({s.ayahCount})
          </option>
        ))}
      </select>
      <input
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        aria-label="From ayah"
        className="w-16 rounded border border-[var(--color-rule)] bg-transparent px-2 py-1.5 text-center text-sm"
      />
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="all"
        aria-label="To ayah"
        className="w-16 rounded border border-[var(--color-rule)] bg-transparent px-2 py-1.5 text-center text-sm"
      />
      <button
        type="submit"
        className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white"
      >
        Add
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-[var(--color-lost)]">
          {error}
        </p>
      )}
    </form>
  );
}
