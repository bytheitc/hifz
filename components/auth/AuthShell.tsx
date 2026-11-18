import Link from "next/link";
import { ArrowRight, Cloud, RefreshCw, Smartphone } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { ItcMark } from "@/components/ItcMark";

/**
 * The frame around sign-in and sign-up: the form on one side, what an account
 * is for on the other, and always a way to carry on without one.
 */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-[var(--color-tint)] p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -bottom-32 -right-32 size-[26rem] rounded-full bg-[var(--color-sun)]" />
        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-extrabold">
          <ItcMark className="size-9" />
          Hifz Trail
        </Link>
        <div className="relative">
          <p className="relative max-w-md text-balance text-5xl font-black leading-[1.02]">Your trail, on every device <span className="text-[var(--color-brand)]">you revise on.</span></p>
          <ul className="relative mt-8 space-y-5">
            {[
              [Smartphone, "Phone in the morning, laptop at night", "The same queue, wherever you open it."],
              [RefreshCw, "You decide when it syncs", "Nothing leaves your device until you press sync."],
              [Cloud, "Never lose years of work", "A new phone starts where the old one stopped."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Cloud;
              return (
                <li key={title as string} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    <I className="size-5" />
                  </span>
                  <div>
                    <p className="font-bold">{title as string}</p>
                    <p className="text-sm text-[var(--color-ink-soft)]">{body as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-sm text-[var(--color-ink-faint)]">Free, open source, and no ads. Ever.</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <Link href="/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">{subtitle}</p>
          <div className="mt-8">{children}</div>

          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-rule-strong)] p-4">
            <p className="text-sm font-semibold">Rather not make an account?</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">Everything works on this device without one. You can add an account later.</p>
            <Link href="/trail" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand)] hover:underline">
              Continue without an account <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Shown in place of a form when no api is configured, so nobody types into a form that cannot work. */
export function AccountsClosed() {
  return (
    <div className="rounded-2xl border border-[var(--color-shaky)]/40 bg-[var(--color-shaky-soft)] p-5">
      <p className="font-bold">Accounts aren&apos;t open on this copy of Hifz Trail yet</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
        There is no server behind this page, so rather than take your email for nothing, here is the truth: everything works without an account, on this device.
      </p>
      <Link href="/trail" className="btn btn-primary mt-4 w-full">
        Use Hifz Trail on this device
      </Link>
      <p className="mt-3 text-xs text-[var(--color-ink-faint)]">
        Running Hifz Trail for a madrasah? Point it at your own api with NEXT_PUBLIC_API_URL; the api lives in ./api.
      </p>
    </div>
  );
}
