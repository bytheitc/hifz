"use client";

import { useState } from "react";
import { SURAHS, checkPortion, surah } from "@/lib/quran";

/**
 * Unchanged in substance from the original form, but laid out for a thumb:
 * the controls stack on a narrow screen instead of wrapping into a column of
 * 16px-tall targets, and the number inputs declare `inputMode="numeric"` so a
 * phone opens the number pad. The font size is 16px on the inputs for one
 * unglamorous reason - iOS Safari zooms the whole page in on focus for
 * anything smaller, and the layout never quite recovers.
 */
export function AddPortionForm({
  onAdd,
}: {
  onAdd: (portion: {
    id: string;
    surah: number;
    fromAyah: number;
    toAyah: number;
  }) => void;
}) {
  const [surahNumber, setSurahNumber] = useState(114);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = surah(surahNumber);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fromAyah = Number(from);
    // An empty "to" means the whole surah - the common case, and making
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

  const field =
    "min-h-11 rounded-xl border border-[var(--color-rule)] bg-transparent px-3 text-base dark:border-white/15";

  return (
    <form onSubmit={submit} className="space-y-2">
      <select
        value={surahNumber}
        onChange={(event) => setSurahNumber(Number(event.target.value))}
        aria-label="Surah"
        className={`${field} w-full`}
      >
        {SURAHS.map((item) => (
          <option key={item.number} value={item.number}>
            {item.number}. {item.name} ({item.ayahCount} ayahs)
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          inputMode="numeric"
          aria-label="From ayah"
          className={`${field} w-20 text-center`}
        />
        <input
          value={to}
          onChange={(event) => setTo(event.target.value)}
          inputMode="numeric"
          placeholder="all"
          aria-label="To ayah"
          className={`${field} w-20 text-center`}
        />
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-card)] active:opacity-80"
        >
          Add portion
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-[var(--color-lost)]">
          {error}
        </p>
      )}
    </form>
  );
}
