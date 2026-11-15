/**
 * The mushaf that opens as the landing page loads.
 *
 * Deliberately abstract. The lines stand in for text and are not text: they
 * fill from the right because that is the direction the script they suggest
 * is read in, and they are plain rules because animating actual ayat as
 * decoration would be the wrong thing to do with them.
 *
 * Purely decorative, so it is hidden from assistive technology entirely. The
 * page says what it needs to say in words beside it; nothing here carries
 * meaning a screen reader would miss.
 *
 * The motion lives in globals.css, in CSS rather than JavaScript, so it runs
 * off the main thread while the rest of the page is still arriving.
 */
export function OpeningMushaf() {
  return (
    <div className="mushaf w-full select-none" aria-hidden="true">
      <div className="mushaf-spread mx-auto flex w-full max-w-md items-stretch justify-center">
        <Page side="left" />
        {/* The spine. A seam rather than a drawn line: the pages meet here. */}
        <div className="w-px shrink-0 bg-gradient-to-b from-transparent via-[var(--color-rule)] to-transparent dark:via-white/20" />
        <Page side="right" />
      </div>
    </div>
  );
}

function Page({ side }: { side: "left" | "right" }) {
  // Uneven line lengths read as text; a block of identical rules reads as a
  // loading skeleton, which is the one thing this must not look like.
  const lines =
    side === "right"
      ? [100, 92, 97, 88, 95, 72, 90, 84, 60]
      : [94, 88, 96, 90, 83, 97, 78, 92, 55];

  return (
    <div
      className={`mushaf-page mushaf-page--${side} aspect-[3/4] w-1/2 bg-[var(--color-card)] p-2.5 shadow-[0_18px_40px_-28px_rgba(28,26,22,0.55)] dark:bg-white/[0.06] sm:p-3 ${
        side === "left"
          ? "rounded-l-md border-y border-l border-[var(--color-rule)] dark:border-white/10"
          : "rounded-r-md border-y border-r border-[var(--color-rule)] dark:border-white/10"
      }`}
    >
      {/* The ruled frame around the text block is what a mushaf page
          actually looks like, and it is also what stops a column of grey
          bars reading as a loading skeleton - which is the one thing this
          must never be mistaken for. */}
      <div className="flex h-full flex-col justify-center border border-[var(--color-brand)]/25 px-3 py-4 dark:border-[var(--color-brand)]/40 sm:px-4">
        {/* Lines are right-aligned, so the ragged edge falls on the left.
            Ragged-right would read as Latin text and quietly undo the point
            of filling them from the right in the first place. */}
        <div className="flex flex-col items-end gap-[7px] sm:gap-2.5">
          {lines.map((width, i) => (
            <span
              key={i}
              className="mushaf-line block h-[3px] rounded-full bg-[var(--color-ink)]/[0.16] dark:bg-white/20 sm:h-1"
              style={
                {
                  width: `${width}%`,
                  // Staggered across both pages together, so the spread fills
                  // as one movement rather than two columns racing.
                  "--line": side === "right" ? i : i + 2,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
