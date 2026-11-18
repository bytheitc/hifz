import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  Cloud,
  Download,
  GraduationCap,
  Keyboard,
  ListOrdered,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AppPreview } from "@/components/site/AppPreview";
import { HeroActions } from "@/components/site/HeroActions";
import { REVIEW_INTERVALS_DAYS } from "@/lib/srs";

/**
 * The front door. Every claim here is something the app does today; anything
 * still being built is not on this page.
 */
export default function Landing() {
  return (
    <>
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[var(--color-tint)]">
          <div aria-hidden className="absolute -right-24 -top-24 size-[22rem] rounded-full bg-[var(--color-sun)] sm:-right-16 sm:-top-28 sm:size-[30rem]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
            <div>
              <p className="rise inline-flex items-center gap-2 rounded-full bg-[var(--color-card)] px-3.5 py-1.5 text-sm font-black text-[var(--color-brand)]">
                Free · no account needed
              </p>
              <h1 className="rise mt-5 text-balance text-[2.9rem] font-black leading-[0.98] tracking-tight sm:text-7xl" style={{ "--rise": "60ms" } as React.CSSProperties}>
                Keep every surah <span className="text-[var(--color-brand)]">you&apos;ve learned.</span>
              </h1>
              <p className="rise mt-5 max-w-lg text-pretty text-lg font-bold leading-relaxed text-[var(--color-ink-soft)] sm:text-xl" style={{ "--rise": "140ms" } as React.CSSProperties}>
                Ten minutes a day. Hifz Trail tells you what to recite, in the order of the mushaf, and you tap how it went.
              </p>
              <div className="rise mt-8" style={{ "--rise": "220ms" } as React.CSSProperties}>
                <HeroActions />
              </div>
            </div>
            <div className="rise" style={{ "--rise": "200ms" } as React.CSSProperties}>
              <AppPreview />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="How it works" title="Three steps, then it runs your revision for you." />
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              <Step n={1} icon={<BookOpenCheck />} title="Add what you know">
                Pick a surah, or part of one, and add it to your trail. Whole surahs take one tap; a portion takes two numbers.
              </Step>
              <Step n={2} icon={<ListOrdered />} title="Recite what is due">
                Each day you get a short queue, in the order of the mushaf, because that is how the text sits in memory.
              </Step>
              <Step n={3} icon={<CheckCircle2 />} title="Tap how it went">
                Solid, shaky or lost. The app spaces the next revision to match, and tells you when revising is no longer enough.
              </Step>
            </ol>

            <div className="card mt-8 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-[var(--color-brand)]">The schedule</p>
                  <h3 className="mt-1.5 text-xl font-bold">Each solid recitation earns a longer gap</h3>
                  <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-soft)]">
                    Shaky keeps a portion where it is; lost brings it back tomorrow. Nothing is ever dropped from the trail.
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[var(--color-solid-soft)] px-2.5 py-1 text-[var(--color-solid)]">Solid: move up</span>
                  <span className="rounded-full bg-[var(--color-shaky-soft)] px-2.5 py-1 text-[var(--color-shaky)]">Shaky: stay</span>
                  <span className="rounded-full bg-[var(--color-lost-soft)] px-2.5 py-1 text-[var(--color-lost)]">Lost: back to day 1</span>
                </div>
              </div>
              <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {REVIEW_INTERVALS_DAYS.map((days, i) => (
                  <li key={days} className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">Stage {i + 1}</p>
                    <p className="mt-1 text-2xl font-extrabold text-[var(--color-brand)]">{days}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{days === 1 ? "day" : "days"}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-[var(--color-wash)] py-20 sm:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Features" title="Built around how hifz is actually revised." />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon={<ListOrdered />} title="In the order of the mushaf">
                Other schedulers sort by most overdue. People revising hifz go in order, so the queue does too.
              </Feature>
              <Feature icon={<RotateCcw />} title="Knows when to re-learn">
                A portion lost again and again needs re-learning, not another week of revision. The app says so.
              </Feature>
              <Feature icon={<CalendarRange />} title="Sees the heavy days coming">
                The week ahead shows how many ayahs fall on each day, before you take on a new surah.
              </Feature>
              <Feature icon={<GraduationCap />} title="Teacher and halaqah mode">
                Hear a circle of students and grade them; the teacher&apos;s word stands for the day they heard you.
              </Feature>
              <Feature icon={<Keyboard />} title="Fast to grade">
                Big buttons for a thumb, and keys 1, 2 and 3 on a keyboard. A mistaken tap can be undone.
              </Feature>
              <Feature icon={<Download />} title="Yours to keep">
                Save your whole trail to a file and bring it back on any device, with or without an account.
              </Feature>
            </div>
          </div>
        </section>

        {/* Teachers */}
        <section id="teachers" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-[var(--color-dawn-deep)]">For teachers</p>
              <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">Run a halaqah from your phone.</h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Switch to Teaching, add your students, and see who owes the most today. Grade each recitation as you hear it. Your assessment is recorded as yours, and it takes precedence over what a student marked at home.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "A register across the top, with each student's due count",
                  "Students hand you their record; you hand back what you heard",
                  "A teacher's register never leaves the device by accident",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-[15px]">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-solid)]" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-[var(--color-brand)]" />
                <p className="font-bold">Halaqah · Thursday</p>
              </div>
              <div className="mt-4 flex gap-2 overflow-hidden">
                {[["Aisha", 2], ["Yusuf", 5], ["Maryam", 0], ["Ibrahim", 3]].map(([name, due], i) => (
                  <span key={name} className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${i === 1 ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white" : "border-[var(--color-rule)]"}`}>
                    {name} <span className={i === 1 ? "opacity-80" : "text-[var(--color-ink-faint)]"}>{due}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-[var(--color-dawn-soft)] p-4">
                <p className="text-sm font-bold">Grading as the teacher</p>
                <p className="text-xs text-[var(--color-ink-soft)]">What you record stands for today.</p>
              </div>
              <div className="mt-3 space-y-2">
                {["Al-Waqi'ah", "Al-Mulk", "Al-Qalam"].map((s) => (
                  <div key={s} className="flex items-center justify-between rounded-xl border border-[var(--color-rule)] px-3 py-2.5 text-sm">
                    <span className="font-semibold">{s}</span>
                    <span className="flex gap-1">
                      <span className="size-6 rounded-md bg-[var(--color-solid)]" />
                      <span className="size-6 rounded-md bg-[var(--color-shaky)]" />
                      <span className="size-6 rounded-md bg-[var(--color-lost)]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy and accounts */}
        <section id="privacy" className="scroll-mt-20 bg-[var(--color-wash)] py-20 sm:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <SectionHead eyebrow="Your data" title="With an account or without one. Your choice." body="What you have memorised is personal. You decide where it lives, and you can change your mind later." />
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Choice
                icon={<Smartphone />}
                title="Without an account"
                tag="Most private"
                points={["Everything stays in this browser", "No email, no server, nothing to breach", "Move phones with a backup file"]}
                cta={{ href: "/trail", label: "Start on this device" }}
              />
              <Choice
                icon={<Cloud />}
                title="With a free account"
                tag="On every device"
                featured
                points={["Your trail follows you between phone and laptop", "You choose when it syncs", "Sign out any time; nothing on the device is deleted"]}
                cta={{ href: "/signup", label: "Create a free account" }}
              />
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-[var(--color-ink-soft)]">
              <LockKeyhole className="size-4" /> No ads, no tracking, and the code is open for anyone to check.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <SectionHead eyebrow="FAQ" title="Questions people ask first." center />
            <div className="mt-10 space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold">
                    {q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--color-brand)] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
            <ShieldCheck className="mx-auto size-10 opacity-90" />
            <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-4xl">Start today. Your first queue is ready in a minute.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">No account needed to begin. Add one later and your trail comes with you.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/trail" className="btn bg-white text-[var(--color-brand-deep)] hover:bg-white/90">
                Open Hifz Trail <ArrowRight className="size-4" />
              </Link>
              <Link href="/signup" className="btn border border-white/40 text-white hover:bg-white/10">
                Create a free account
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

const FAQ: [string, string][] = [
  ["Is it free?", "Yes, completely. There are no ads and no paid tier. Hifz Trail is open source and built by volunteers."],
  ["Do I need an account?", "No. Everything works on your device without one. An account only adds one thing: your trail follows you to another phone or computer."],
  ["What happens to my data?", "Without an account it never leaves your browser. With one it is stored on our server so it can reach your other devices, and only when you choose to sync. You can save a backup file at any time either way."],
  ["How does it decide what is due?", "Each portion sits on a stage. Solid moves it to a longer gap (up to 90 days), shaky keeps it where it is, and lost brings it back tomorrow. The day's queue is then put in the order of the mushaf."],
  ["Does it replace my teacher?", "No. It schedules your revision and remembers how it went. A teacher who hears you recite is irreplaceable, and in teaching mode their assessment counts for more than your own."],
  ["Can I use it with my halaqah?", "Yes. Switch to Teaching, add your students and grade them as you hear them. Students can pass their records to you and take back what you recorded."],
];

function SectionHead({ eyebrow, title, body, center = false }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : "max-w-2xl"}>
      <p className="eyebrow text-[var(--color-brand)]">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-pretty text-lg text-[var(--color-ink-soft)]">{body}</p>}
    </div>
  );
}

const STEP_COLOURS = ["var(--color-brand)", "var(--color-sun)", "var(--color-dawn)"];

function Step({ n, title, children }: { n: number; icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="card p-6">
      <span className="grid size-14 place-items-center rounded-2xl text-3xl font-black" style={{ background: STEP_COLOURS[(n - 1) % 3], color: n === 2 ? "var(--color-ink)" : "#fff" }}>{n}</span>
      <h3 className="mt-4 text-xl font-black">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{children}</p>
    </li>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <span className="text-[var(--color-brand)] [&_svg]:size-8 [&_svg]:stroke-[2.5]">{icon}</span>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{children}</p>
    </div>
  );
}

function Choice({ icon, title, tag, points, cta, featured = false }: { icon: React.ReactNode; title: string; tag: string; points: string[]; cta: { href: string; label: string }; featured?: boolean }) {
  return (
    <div className={`relative rounded-3xl border p-6 sm:p-8 ${featured ? "border-[var(--color-brand)] bg-[var(--color-card)] shadow-[var(--shadow-lift)]" : "border-[var(--color-rule)] bg-[var(--color-card)]"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`grid size-11 place-items-center rounded-2xl [&_svg]:size-5 ${featured ? "bg-[var(--color-brand)] text-white" : "bg-[var(--color-card)] text-[var(--color-brand)] border border-[var(--color-rule)]"}`}>{icon}</span>
        <span className="rounded-full bg-[var(--color-card)] px-3 py-1 text-xs font-bold text-[var(--color-ink-soft)] border border-[var(--color-rule)]">{tag}</span>
      </div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[15px]">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-solid)]" /> {p}
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={`btn mt-6 w-full ${featured ? "btn-primary" : "btn-ghost"}`}>
        {cta.label}
      </Link>
    </div>
  );
}
