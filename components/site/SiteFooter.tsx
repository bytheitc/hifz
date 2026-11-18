import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-card)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:px-6">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--color-ink-soft)]">
            A revision companion for people memorising the Qur&apos;an, and the teachers who hear them. Free and open source.
          </p>
        </div>
        <FooterCol title="Product" links={[["How it works", "/#how"], ["Features", "/#features"], ["For teachers", "/#teachers"], ["Open the app", "/trail"]]} />
        <FooterCol title="Account" links={[["Create an account", "/signup"], ["Sign in", "/signin"], ["Use without an account", "/trail"]]} />
        <FooterCol title="Project" links={[["Your data", "/#privacy"], ["FAQ", "/#faq"], ["Host your own", "/host"], ["Source code", "https://github.com/bytheitc/hifz"], ["Contribute", "https://github.com/bytheitc/hifz/issues"]]} />
      </div>
      <div className="border-t border-[var(--color-rule)]">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-[var(--color-ink-faint)] sm:px-6">
          Hifz Trail is a scheduling tool. It does not replace a teacher who hears your recitation.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-brand)]">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
