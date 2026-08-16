import type { ReactNode } from "react";

/** Shared typography for the legal pages so all three read as one document set. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink-950 sm:text-2xl">
        {heading}
      </h2>
      <div className="mt-3 space-y-3.5 text-[15.5px] leading-relaxed text-ink-700 [&_a]:font-medium [&_a]:text-brand-500 [&_a]:underline [&_a]:underline-offset-2 [&_li]:flex [&_li]:gap-3 [&_ul]:mt-3 [&_ul]:space-y-2.5">
        {children}
      </div>
    </section>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return (
    <li>
      <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
      <span>{children}</span>
    </li>
  );
}
