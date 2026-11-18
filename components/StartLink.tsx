"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The main way in.
 *
 * Someone who already has a trail is not a visitor being persuaded, they are
 * a person coming back to work they have been doing for months, and the front
 * door should say so. It does not redirect them past the page - a landing
 * page that bounces you is infuriating when you came to read it, and the
 * difference between "Start" and "Continue" is enough.
 *
 * Renders as "Start" until the check has run, because that is what a first
 * visitor sees and guessing wrong in that direction is the harmless way
 * round.
 */
export function StartLink() {
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("hifz-trail:v2");
      const legacy = window.localStorage.getItem("hifz-trail:portions:v1");
      setReturning(Boolean(raw) || Boolean(legacy));
    } catch {
      // Private mode, or storage disabled. A first-time greeting is the
      // right thing to show someone whose trail we cannot see.
    }
  }, []);

  return (
    <Link
      href="/trail"
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand)] px-6 text-sm font-medium text-[var(--color-card)] transition-opacity duration-150 ease-out active:opacity-80 sm:text-[15px]"
    >
      {returning ? "Continue your trail" : "Start on this device"}
    </Link>
  );
}
