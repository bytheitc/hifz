import Link from "next/link";
import { ACCOUNT_ENV, status } from "@/lib/account";
import { SignInForm } from "@/components/SignInForm";

export const metadata = { title: "Sign in - Hifz Trail" };

/**
 * Sign in, or the truth about why you cannot yet.
 *
 * There is no form here until there is somewhere for it to post to. An email
 * field that accepts an address and does nothing with it is a worse outcome
 * than a sentence explaining the state of things: the student waits for a
 * link that is never coming, and the app has taken their address for nothing.
 */
export default function SignIn() {
  const account = status();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16 sm:px-8">
      <Link
        href="/"
        className="text-sm text-[var(--color-ink-soft)] underline-offset-4 hover:underline dark:text-white/60"
      >
        Hifz Trail
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Sign in</h1>

      {account.kind === "not-configured" ? (
        <>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
            Accounts are not open yet. Nothing is being collected and there is
            no server behind this page, so rather than show you a form that
            cannot send you anything, here is where it stands.
          </p>

          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
            Everything the app does works without an account. Your trail, the
            daily queue, a halaqah register and handing records between a
            student and their teacher all run on the device you are reading
            this on.
          </p>

          <div className="mt-8">
            <Link
              href="/trail"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand)] px-6 text-sm font-medium text-white transition-opacity duration-150 ease-out active:opacity-80"
            >
              Use it on this device
            </Link>
          </div>

          <div className="mt-12 rounded-xl border border-[var(--color-rule)] p-4 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
              Running your own
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)] dark:text-white/60">
              The api lives in{" "}
              <code className="rounded bg-[var(--color-brand-soft)] px-1 py-0.5 text-[12px] dark:bg-white/10">
                ./api
              </code>{" "}
              and a madrasah running its own points the app at it with{" "}
              <code className="rounded bg-[var(--color-brand-soft)] px-1 py-0.5 text-[12px] dark:bg-white/10">
                {ACCOUNT_ENV.url}
              </code>
              . Until it is set the app stays device-only, which is the right
              default for a student memorising on their own.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)] dark:text-white/65">
            Signing in lets a trail follow you between devices. Everything
            still works without one.
          </p>

          <SignInForm />

          <p className="mt-8 text-xs leading-relaxed text-[var(--color-ink-soft)] dark:text-white/50">
            What you have and have not memorised is about as personal as data
            gets. With an account it is stored on the server this app is
            pointed at, rather than only in this browser.
          </p>
        </>
      )}
    </main>
  );
}
