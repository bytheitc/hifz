/**
 * Where accounts will live, and an honest answer until they do.
 *
 * The app has always worked with no account and must keep working that way:
 * the device-only path is not a trial of the real thing, it is the real
 * thing for most people memorising on their own. An account is for someone
 * who wants their trail to follow them between a phone and a laptop, or a
 * madrasah that holds records across many circles.
 *
 * This module is the seam. Nothing above it knows what is behind it, so a
 * madrasah running its own api changes one environment variable and nothing
 * else.
 *
 * What is NOT built yet, and what the interface must not pretend about:
 * there is no server, no session, no sync. `status()` reports
 * `not-configured` until the environment below is set, and the sign-in page
 * says so in words rather than showing a form that cannot work. A dead form
 * that swallows an email address is worse than no form.
 *
 * Before accounts open, three things are not optional, and none of them is
 * code: consent from a guardian for students who are children, a written
 * answer to how long records are kept and how they are deleted, and the
 * line in the app that currently promises everything stays on the device.
 * That promise is true today. It stops being true the moment a trail is
 * uploaded, and it has to change in the same release, not after it.
 */

export const ACCOUNT_ENV = {
  url: "NEXT_PUBLIC_API_URL",
} as const;

export type AccountStatus =
  /** No backend is wired up. The device-only path is the whole app. */
  | { readonly kind: "not-configured" }
  | { readonly kind: "signed-out" }
  | { readonly kind: "signed-in"; readonly email: string }
  /** Signed in AND this device's trail has reached the server at least once.
   *  Kept apart from `signed-in` because the difference is the whole
   *  question a student is asking when they read that line. */
  | { readonly kind: "synced"; readonly email: string };

/**
 * Whether an api has been pointed at.
 *
 * One variable, because the api holds its own secrets: the browser needs
 * only the address to send to. There is no publishable key to leak and
 * nothing for a half-finished deployment to half-configure.
 */
export function accountsConfigured(
  env: Record<string, string | undefined> = readEnv()
): boolean {
  return isSet(env[ACCOUNT_ENV.url]);
}

/** The api's base address, without a trailing slash so that joining paths
 *  does not produce a double one. */
export function apiUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  return isSet(raw) ? (raw as string).replace(/\/+$/, "") : null;
}

function isSet(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Read from `process.env` at build time. Next inlines `NEXT_PUBLIC_*` into
 * the bundle, so these have to be written out in full rather than looked up
 * by a computed key - an indexed read would be left as a runtime lookup
 * against an object that does not exist in the browser.
 */
function readEnv(): Record<string, string | undefined> {
  return { [ACCOUNT_ENV.url]: process.env.NEXT_PUBLIC_API_URL };
}

export function status(): AccountStatus {
  if (!accountsConfigured()) return { kind: "not-configured" };
  // Reached only once a provider is wired in. Until then the branch above
  // is the only one that can run, and saying "signed-out" here is the
  // truthful placeholder: configured, nobody signed in.
  return { kind: "signed-out" };
}

/**
 * What the header may claim about where a trail lives.
 *
 * Kept here rather than written into the page so that the sentence cannot
 * drift away from the truth: the day a trail syncs, this returns something
 * else, and every place that shows it changes at once.
 */
export function describeWhereDataLives(account: AccountStatus): string {
  switch (account.kind) {
    case "not-configured":
    case "signed-out":
      return "Everything stays on this device";
    case "signed-in":
      // Signed in, but this trail has never reached the server. Saying
      // "synced" here is the lie this function exists to prevent: a student
      // who believed it would clear their browser and lose everything.
      return `Signed in as ${account.email} - not synced yet`;
    case "synced":
      return `Synced to ${account.email}`;
  }
}
