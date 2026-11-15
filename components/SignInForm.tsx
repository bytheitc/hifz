"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { describeFailure, login, register, rememberAccount, writeToken } from "@/lib/api";

/**
 * Sign in, or make an account.
 *
 * One form with a switch rather than two pages: the person arriving here
 * usually does not know or care which of the two they need, and making them
 * choose before typing is a step that exists only for the developer's
 * convenience.
 */
export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const registering = mode === "register";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailed(null);

    try {
      const result = registering
        ? await register({ email, password })
        : await login({ email, password });
      writeToken(result.token);
      rememberAccount(result.user);
      router.push("/trail");
    } catch (error) {
      setFailed(describeFailure(error));
      setBusy(false);
    }
  }

  const field =
    "min-h-12 w-full rounded-xl border border-[var(--color-rule)] bg-transparent px-3.5 text-base dark:border-white/15";

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div>
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.org"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          type="password"
          // Tells a password manager to offer a new one rather than fill the
          // old one in, which is the difference between a saved credential
          // and a silently failed sign-up.
          autoComplete={registering ? "new-password" : "current-password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={registering ? "At least 10 characters" : "Password"}
          className={field}
        />
        {registering && (
          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
            Length is what makes a password hard to guess. A short phrase you
            will remember beats a short one you will not.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-xl bg-[var(--color-brand)] text-sm font-medium text-white transition-opacity duration-150 ease-out active:opacity-80 disabled:opacity-50"
      >
        {busy ? "One moment" : registering ? "Create account" : "Sign in"}
      </button>

      <p
        aria-live="polite"
        className="min-h-[1rem] text-xs text-[var(--color-lost)]"
      >
        {failed}
      </p>

      <button
        type="button"
        onClick={() => {
          setMode(registering ? "login" : "register");
          setFailed(null);
        }}
        className="text-sm text-[var(--color-ink-soft)] underline-offset-4 hover:underline dark:text-white/60"
      >
        {registering ? "I already have an account" : "Create an account instead"}
      </button>
    </form>
  );
}
