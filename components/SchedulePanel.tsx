"use client";

import { useId, useState } from "react";
import {
  type ScheduleSetting,
  MAX_STAGES,
  PRESETS,
  PRESET_NAMES,
  describeLadderProblem,
  ladderOf,
  parseLadder,
} from "@/lib/srs";

const PRESET_TEXT: Record<(typeof PRESET_NAMES)[number], { label: string; blurb: string }> = {
  gentle: { label: "Gentle", blurb: "Longer gaps and a lighter daily load." },
  standard: { label: "Standard", blurb: "The default." },
  intensive: { label: "Intensive", blurb: "Shorter gaps, for a stretch when you are revising far more, such as Ramadan." },
};

const describe = (days: readonly number[]) => days.join(", ");

/**
 * Which revision ladder to use. These are choices about workload, not
 * rulings about how often anyone must revise.
 *
 * Changing it rewrites nothing: the portions and every grade stay exactly as
 * they are, and the ladder is applied when the trail is read. A portion that
 * is further along than a shorter ladder goes counts as being at its last
 * stage, and switching back puts it where it was.
 */
export function SchedulePanel({
  schedule,
  onChange,
}: {
  schedule: ScheduleSetting;
  onChange: (next: ScheduleSetting) => void;
}) {
  const groupId = useId();
  const customId = `${groupId}-custom`;
  const [text, setText] = useState(schedule.preset === "custom" ? describe(schedule.days) : describe(ladderOf(schedule)));
  const [error, setError] = useState<string | null>(null);

  function saveCustom() {
    const parsed = parseLadder(text);
    if (!parsed.ok) {
      setError(describeLadderProblem(parsed.problem));
      return;
    }
    setError(null);
    onChange({ preset: "custom", days: parsed.ladder });
  }

  return (
    <section id="schedule" className="card scroll-mt-24 p-5" aria-labelledby={`${groupId}-title`}>
      <h2 id={`${groupId}-title`} className="font-extrabold">Revision schedule</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Days between reviews, stage by stage. Changing it never removes a portion or its history.
      </p>

      <div role="radiogroup" aria-labelledby={`${groupId}-title`} className="mt-3 space-y-2">
        {PRESET_NAMES.map((name) => {
          const chosen = schedule.preset === name;
          return (
            <label
              key={name}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border-[3px] p-3 ${chosen ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-rule)]"}`}
            >
              <input
                type="radio"
                name={`${groupId}-preset`}
                checked={chosen}
                onChange={() => {
                  setError(null);
                  setText(describe(PRESETS[name]));
                  onChange({ preset: name });
                }}
                className="mt-1 size-4 accent-[var(--color-brand)]"
              />
              <span className="text-sm">
                <span className="font-bold">{PRESET_TEXT[name].label}</span>
                <span className="block font-mono text-xs text-[var(--color-ink-soft)]">{describe(PRESETS[name])} days</span>
                <span className="block text-[var(--color-ink-soft)]">{PRESET_TEXT[name].blurb}</span>
              </span>
            </label>
          );
        })}

        <div className={`rounded-2xl border-[3px] p-3 ${schedule.preset === "custom" ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-rule)]"}`}>
          <label htmlFor={customId} className="text-sm font-bold">Your own</label>
          <p id={`${customId}-hint`} className="text-xs text-[var(--color-ink-soft)]">
            Up to {MAX_STAGES} numbers of days, each longer than the last, such as 1, 4, 10, 30.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              id={customId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-describedby={`${customId}-hint${error ? ` ${customId}-error` : ""}`}
              aria-invalid={error ? true : undefined}
              className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 text-sm font-mono"
            />
            <button type="button" onClick={saveCustom} className="min-h-11 shrink-0 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-bold text-white active:opacity-80">
              Use this
            </button>
          </div>
          {error && (
            <p id={`${customId}-error`} role="alert" className="mt-2 text-xs text-[var(--color-lost)]">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
