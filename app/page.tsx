import Link from "next/link";
import { OpeningMushaf } from "@/components/OpeningMushaf";
import { StartLink } from "@/components/StartLink";

/**
 * The front door.
 *
 * Written to say what the app actually does rather than how it will change
 * your life. Someone deciding whether to trust a Qur'an app with years of
 * their revision is better served by three specific facts than by three
 * adjectives, so the three sections below are the three decisions in the
 * app that are genuinely unlike other spaced-repetition tools.
 */
export default function Landing() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-tight">Hifz Trail</p>
        <Link
          href="/signin"
          className="text-sm text-[var(--color-ink-soft)] underline-offset-4 hover:underline dark:text-white/60"
        >
          Sign in
        </Link>
      </header>

      <section className="mt-14 grid items-center gap-12 sm:mt-20 lg:grid-cols-2 lg:gap-16">
        {/* The mushaf comes first in the markup on a narrow screen, because
            it is what makes someone stay long enough to read the sentence
            underneath it. */}
        <div className="order-first lg:order-last">
          <OpeningMushaf />
        </div>

        <div>
          <h1
            className="mushaf-rise text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl"
            style={{ "--rise": "80ms" } as React.CSSProperties}
          >
            Know what needs reciting today.
          </h1>

          <p
            className="mushaf-rise mt-5 max-w-md text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65 sm:text-base"
            style={{ "--rise": "180ms" } as React.CSSProperties}
          >
            A revision schedule for what you have memorised, that tells you
            what is due, what is slipping, and how heavy next Thursday is going
            to be before you take on something new.
          </p>

          <div
            className="mushaf-rise mt-8 flex flex-wrap items-center gap-3"
            style={{ "--rise": "280ms" } as React.CSSProperties}
          >
            <StartLink />
            <Link
              href="/signin"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-rule)] px-5 text-sm transition-colors duration-150 ease-out dark:border-white/15 sm:text-[15px]"
            >
              Sign in
            </Link>
          </div>

          <p
            className="mushaf-rise mt-4 text-xs text-[var(--color-ink-soft)] dark:text-white/50"
            style={{ "--rise": "360ms" } as React.CSSProperties}
          >
            No account needed. Starting on this device keeps everything in this
            browser.
          </p>
        </div>
      </section>

      <section className="mt-24 grid gap-10 sm:mt-32 sm:grid-cols-3 sm:gap-8">
        <Point title="The queue is in order of the mushaf">
          Every scheduler worth the name sorts the day most-overdue-first.
          People revising hifz do not: they go in order, because that is how
          the text sits in memory.
        </Point>
        <Point title="You can see the heavy day coming">
          Taking on a new surah this week is a different decision when you can
          see you already have 180 ayahs due on Thursday.
        </Point>
        <Point title="It says when revision is not the answer">
          A portion lost four times does not need another week of revision. It
          needs re-learning, and the app will say so rather than cycling it
          forever.
        </Point>
      </section>

      <section className="mt-24 rounded-3xl border border-[var(--color-rule)] p-7 dark:border-white/10 sm:mt-32 sm:p-10">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          For a teacher, and a halaqah
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
          A student revising alone grades themselves, because there is nobody
          else to do it. In a halaqah the teacher hears the recitation, and
          theirs is the assessment worth recording. So a grade carries who gave
          it: on a day the teacher heard a student, their word stands over
          anything the student marked at home, and on the days between, the
          student&apos;s own revision counts as it always did.
        </p>
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
          A student can hand their record to their teacher and take back what
          the teacher recorded, so each of them sees the whole week rather than
          their half of it.
        </p>
      </section>

      <section className="mt-20 sm:mt-28">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          What happens to the record
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
          What a person has and has not memorised of the Qur&apos;an is about
          as personal as data gets. Start on this device and it stays in this
          browser: no account, no server, nothing to breach, and a file you
          hold if you change phone. Signing in is for people who want their
          trail to follow them, and it is a choice, not the price of entry.
        </p>
      </section>

      <footer className="mt-24 border-t border-[var(--color-rule)] pt-6 text-xs text-[var(--color-ink-soft)] dark:border-white/10 dark:text-white/45 sm:mt-32">
        Free and open source.
      </footer>
    </main>
  );
}

function Point({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold leading-snug">{title}</h2>
      <p className="mt-2.5 text-pretty text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-white/60">
        {children}
      </p>
    </div>
  );
}
