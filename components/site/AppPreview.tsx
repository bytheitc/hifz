/**
 * The hero's picture of the app: today's queue as it looks on an ordinary
 * morning, drawn with the app's own styles. The figures are an example.
 */
const ROWS = [
  { name: "Ya-Sin 1–40", ar: "يس", note: "Slipping: take it slowly", warn: true },
  { name: "Al-Mulk", ar: "الملك", note: "2 days overdue", warn: false },
];

export function AppPreview() {
  return (
    <div className="card rounded-[2rem] border-[3px] p-5 sm:p-6" role="img" aria-label="A preview of Hifz Trail's daily screen: three portions to recite and a 30-cell progress grid.">
      <div className="flex items-center justify-between">
        <p className="text-base font-black">Today · 3 to recite</p>
        <p className="rounded-full bg-[var(--color-solid-soft)] px-3 py-1 text-sm font-black text-[var(--color-brand)]">104 ayahs</p>
      </div>
      <div className="mt-4 space-y-3">
        {ROWS.map((r) => (
          <div key={r.name} className={`rounded-3xl border-[3px] p-3.5 ${r.warn ? "border-[var(--color-lost)]/50" : "border-[var(--color-rule)]"}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-black">{r.name}</p>
              <span lang="ar" dir="rtl" className="font-quran text-2xl leading-none text-[var(--color-sky)]">{r.ar}</span>
            </div>
            <p className={`text-xs font-bold ${r.warn ? "text-[var(--color-lost)]" : "text-[var(--color-ink-faint)]"}`}>{r.note}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 pb-1 text-center text-xs">
              <span className="grade-btn grade-solid grid place-items-center !min-h-10">Solid</span>
              <span className="grade-btn grade-shaky grid place-items-center !min-h-10">Shaky</span>
              <span className="grade-btn grade-lost grid place-items-center !min-h-10">Lost</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm font-black">Your Qur&apos;an</p>
      <div className="mt-2 grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className="aspect-square rounded-md" style={{ background: i < 17 ? "var(--color-brand)" : i < 19 ? "var(--color-sun)" : "var(--color-rule)" }} />
        ))}
      </div>
    </div>
  );
}
