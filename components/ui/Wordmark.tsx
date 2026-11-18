import Link from "next/link";
import { Mark } from "@/components/Mark";

/** The mark and the name, linking home. */
export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`flex shrink-0 items-center gap-2 ${className}`} aria-label="Hifz Trail home">
      <Mark className="size-9" />
      <span className="whitespace-nowrap text-lg font-extrabold tracking-tight">
        Hifz <span className="text-[var(--color-brand)]">Trail</span>
      </span>
    </Link>
  );
}
