import type { Progress } from "@/lib/progress";

export function ProgressCard({ progress }: { progress: Progress }) {
  return (
    <section
      aria-label="Progress"
      className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 sm:p-5 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
          {progress.ayahsMemorised.toLocaleString()}
          <span className="text-sm font-normal text-[var(--color-ink-soft)] dark:text-white/55">
            {" "}
            / {progress.totalAyahs.toLocaleString()} ayahs
          </span>
        </p>
        <p className="text-sm tabular-nums text-[var(--color-ink-soft)] dark:text-white/55">
          {progress.percent.toFixed(1)}%
        </p>
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-brand-soft)] dark:bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(progress.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Proportion of the Qur'an memorised"
      >
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, progress.percent)}%` }}
        />
      </div>

      <p className="mt-2.5 text-xs text-[var(--color-ink-soft)] dark:text-white/55">
        {progress.surahsComplete} surah{progress.surahsComplete === 1 ? "" : "s"}{" "}
        complete · {progress.surahsStarted} started
      </p>
    </section>
  );
}
