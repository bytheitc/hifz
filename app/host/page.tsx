import Link from "next/link";
import { Building2, CheckCircle2, Database, GraduationCap, Home, KeyRound, Server, ShieldCheck, TriangleAlert } from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata = {
  title: "Host your own - Hifz Trail",
  description: "Run your own copy of Hifz Trail for your family, workplace or madrasah. Your records stay on your own server.",
};

/**
 * For people running their own copy. Every step matches the real configuration:
 * api/.env.example (MONGO_URL, JWT_SECRET, WEB_ORIGIN) and the web's NEXT_PUBLIC_API_URL.
 */
export default function Host() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="border-b border-[var(--color-rule)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow text-[var(--color-brand)]">Host your own</p>
            <h1 className="mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Run Hifz Trail for your family, workplace or madrasah.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-ink-soft)]">
              Hifz Trail is open source. Host your own copy and every account and record lives on a server you control, shared with no one, including us.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#steps" className="btn btn-primary">See the steps</a>
              <a href="https://github.com/bytheitc/hifz" className="btn btn-ghost">Get the code</a>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3">
            <Who icon={<Home />} title="A family" body="Parents and children on one private copy. Each person has their own account; nothing leaves your household's server." />
            <Who icon={<Building2 />} title="A workplace or community" body="Colleagues or a community group memorising together, on infrastructure you already run." />
            <Who icon={<GraduationCap />} title="A madrasah" body="Teachers grade their halaqahs in Teaching mode; students keep their own trails. Records stay with the institution." />
          </div>
        </section>

        <section className="border-y border-[var(--color-rule)] bg-[var(--color-wash)] py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">What you need</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Need icon={<Server />} title="Somewhere to run it" body="Any host that runs Node.js 20 or later. A free tier (for example Vercel for the web and a small server for the api) is enough for a family or a class." />
              <Need icon={<Database />} title="A MongoDB database" body="Your own cluster. MongoDB Atlas has a free tier; a madrasah may prefer its own server." />
              <Need icon={<KeyRound />} title="Two secrets" body="A long random string to sign sign-ins, and the address your app is served from." />
            </div>
          </div>
        </section>

        <section id="steps" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">Set it up in four steps</h2>
            <ol className="mt-8 space-y-6">
              <Step n={1} title="Get the code">
                <p>Copy the repository to your own account on GitHub, or download it.</p>
                <Code>git clone https://github.com/bytheitc/hifz.git</Code>
              </Step>
              <Step n={2} title="Run the api with your database">
                <p>The api is the <code>api/</code> folder. Give it three settings (see <code>api/.env.example</code>):</p>
                <Code>{`MONGO_URL=mongodb+srv://…       # your own database
JWT_SECRET=<a long random string>  # signs sign-ins; changing it signs everyone out
WEB_ORIGIN=https://hifz.your-domain.org`}</Code>
                <p>It refuses to start without the first two, so a half-configured server can never accept sign-ins.</p>
              </Step>
              <Step n={3} title="Point the app at your api">
                <p>Deploy the app (the repository root) with one setting, at build time:</p>
                <Code>NEXT_PUBLIC_API_URL=https://hifz-api.your-domain.org</Code>
                <p>Without it the app runs device-only, with no accounts, which is also a perfectly good way to run it.</p>
              </Step>
              <Step n={4} title="Invite your people">
                <p>Share the address. Each person creates their own account, or uses the app without one. Teachers switch to Teaching mode for their halaqahs.</p>
              </Step>
            </ol>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--color-shaky)]/40 bg-[var(--color-shaky-soft)] p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <TriangleAlert className="size-5 text-[var(--color-shaky)]" />
              <h2 className="text-lg font-extrabold">Before you open accounts to others</h2>
            </div>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-ink-soft)]">
              {[
                "If any students are children, get consent from a parent or guardian before their records go on your server.",
                "Decide, and write down, how long records are kept and how someone can have theirs deleted.",
                "Keep the database backed up. What someone has memorised over years is not something to lose to a failed disk.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--color-shaky)]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <ShieldCheck className="mx-auto size-8 text-[var(--color-brand)]" />
            <p className="mt-3 text-lg font-bold">Need a hand setting it up?</p>
            <p className="mt-1 text-[var(--color-ink-soft)]">Open an issue on GitHub and the maintainers will help.</p>
            <Link href="https://github.com/bytheitc/hifz/issues" className="btn btn-ghost mt-4">Ask on GitHub</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Who({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-6">
      <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] [&_svg]:size-5">{icon}</span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Need({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-5">
      <span className="text-[var(--color-brand)] [&_svg]:size-6">{icon}</span>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1 space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-soft)] [&_code]:rounded [&_code]:bg-[var(--color-wash)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-[var(--color-ink)]">
        <h3 className="text-lg font-bold text-[var(--color-ink)]">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl bg-[var(--color-ink)] p-4 text-[13px] leading-relaxed text-white">{children}</pre>;
}
