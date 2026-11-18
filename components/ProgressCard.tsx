import type { Progress } from "@/lib/progress";

/**
 * How much of the Qur'an the trail holds, drawn as thirty cells filling in.
 * The cells are thirtieths of the Qur'an by ayah count: a picture of the share,
 * not a claim about which juz are held (there is no juz data yet).
 */
export function ProgressCard({ progress }: { progress: Progress }) {
  const filled = Math.min(30, Math.round((progress.percent / 100) * 30));
  const started = progress.percent > 0 && filled === 0 ? 1 : 0;
  return (
    <section aria-label="Progress" className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-black">Your memorisation</p>
        <p className="text-2xl font-black text-[var(--color-brand)] tabular-nums">{progress.percent.toFixed(1)}%</p>
      </div>
      <div className="mt-3 grid grid-cols-10 gap-1.5" role="img" aria-label={`${progress.percent.toFixed(1)}% of the Qur'an`}>
        {Array.from({ length: 30 }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-lg"
            style={{ background: i < filled ? "var(--color-brand)" : i < filled + started ? "var(--color-sun)" : "var(--color-rule)" }}
          />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          [progress.ayahsMemorised.toLocaleString(), "ayahs"],
          [progress.surahsComplete, "surahs whole"],
          [progress.surahsStarted, "started"],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-2xl bg-[var(--color-wash)] px-1 py-2.5">
            <dt className="sr-only">{l}</dt>
            <dd className="text-xl font-black tabular-nums">{v}</dd>
            <p className="text-xs font-bold text-[var(--color-ink-soft)]">{l}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
