import type { DateOnly } from "@/lib/srs";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekday(date: DateOnly): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

/**
 * The seven-day view. The bars carry a day name as well as a date now,
 * because "see a heavy Thursday before you take on a new surah" is the
 * sentence in the README and the chart was labelled 11-13.
 */
export function WeekAhead({
  load,
}: {
  load: readonly { date: DateOnly; portions: number; ayahs: number }[];
}) {
  const peak = Math.max(1, ...load.map((day) => day.ayahs));
  const heaviest = load.reduce((worst, day) => (day.ayahs > worst.ayahs ? day : worst), load[0]);

  return (
    <section
      aria-label="The next seven days"
      className="card p-5"
    >
      <h2 className="eyebrow">The next seven days</h2>

      <ul className="mt-3 flex items-end gap-1.5">
        {load.map((day, index) => {
          const isPeak = day.ayahs === heaviest.ayahs && day.ayahs > 0;
          return (
            <li key={day.date} className="flex-1 text-center">
              <div className="flex h-20 items-end sm:h-24">
                <div
                  className="w-full rounded-t-md transition-[height] duration-500 ease-out"
                  style={{
                    height: `${Math.max(day.ayahs > 0 ? 6 : 2, (day.ayahs / peak) * 100)}%`,
                    backgroundColor: isPeak
                      ? "var(--color-dawn)"
                      : "var(--color-brand)",
                    opacity: day.ayahs === 0 ? 0.2 : isPeak ? 1 : 0.8,
                  }}
                  title={`${day.ayahs} ayahs across ${day.portions} portion${day.portions === 1 ? "" : "s"}`}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--color-ink-soft)] dark:text-white/50">
                {index === 0 ? "Today" : weekday(day.date)}
              </p>
              <p className="text-[11px] font-medium tabular-nums">{day.ayahs}</p>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-xs text-[var(--color-ink-soft)] dark:text-white/55">
        Check this before taking on something new: a heavy day is easier to
        handle when you can see it coming.
      </p>
    </section>
  );
}
