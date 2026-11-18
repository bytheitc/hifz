"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#teachers", label: "For teachers" },
  { href: "/#privacy", label: "Your data" },
  { href: "/#faq", label: "FAQ" },
  { href: "/host", label: "Host your own" },
];

/** True when this browser already holds a trail: the front door says Continue, not Start. */
export function useReturning(): boolean {
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem("hifz-trail:v2") || window.localStorage.getItem("hifz-trail:portions:v1")));
    } catch {
      // Private mode: greet them as new.
    }
  }, []);
  return returning;
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const returning = useReturning();

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-[var(--color-parchment)]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--color-parchment)]/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-[var(--color-ink-soft)] lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-[var(--color-ink)]">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/signin" className="btn btn-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Sign in
          </Link>
          <Link href={returning ? "/trail" : "/signup"} className="btn btn-sm btn-primary">
            {returning ? "Open my trail" : "Get started free"}
          </Link>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl lg:hidden sm:ml-0"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav aria-label="Main" className="border-t border-[var(--color-rule)] bg-[var(--color-card)] px-4 pb-5 pt-2 lg:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-medium hover:bg-[var(--color-brand-soft)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/signin" className="btn btn-ghost">Sign in</Link>
            <Link href={returning ? "/trail" : "/signup"} className="btn btn-primary">
              {returning ? "Open my trail" : "Get started"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
