"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReturning } from "@/components/site/SiteNav";

/**
 * The two ways in. Someone coming back sees Continue, not Start: they are a
 * person returning to months of work, not a visitor being persuaded.
 */
export function HeroActions() {
  const returning = useReturning();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/trail" className="btn btn-primary h-13 px-6 text-base">
          {returning ? "Continue my trail" : "Start without an account"} <ArrowRight className="size-4" />
        </Link>
        <Link href="/signup" className="btn btn-ghost h-13 px-6 text-base">
          Create a free account
        </Link>
      </div>
      <p className="mt-3 text-sm text-[var(--color-ink-faint)]">
        {returning ? "Your trail is saved in this browser." : "Starting without an account keeps everything on this device."}
      </p>
    </div>
  );
}
