import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

/**
 * A question and its answer, stated outright, near the top of the page.
 *
 * This exists for the reader first and the machine second. Someone who lands on
 * a service-area page from "does KT deliver to Stroudsburg" has exactly one
 * question, and making them read three paragraphs of positioning to find "yes"
 * is a bad page whether or not an assistant is also reading it.
 *
 * The rules the copy has to follow:
 *   - the first word answers the question (usually "Yes", sometimes "No")
 *   - the whole answer stands alone, quoted with none of its surroundings
 *   - no marketing throat-clearing before the substance
 *
 * The answer text passed here is the same string used in the page's FAQ schema,
 * never a separate one — schema must describe what is on the page.
 */
export function QuickAnswer({
  question,
  answer,
  children,
  className,
}: {
  question: string;
  /** Plain text, so it can be reused verbatim in FAQ structured data. */
  answer: string;
  /** Optional follow-on detail or CTAs, shown under the answer. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-l-[3px] border-brand-500 bg-bone-50 p-6 sm:p-8", className)}>
      <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] text-ink-950 sm:text-2xl">
        {question}
      </h2>
      <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-700">{answer}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

/**
 * Full-bleed variant for the band directly under a page header.
 *
 * Kept beside `QuickAnswer` rather than made a prop of it because the two get
 * used in different places — one inside an existing section, one as its own.
 */
export function QuickAnswerBand({
  question,
  answer,
  children,
}: {
  question: string;
  answer: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-bone-50">
      <Container className="py-8 sm:py-10">
        <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] text-ink-950 sm:text-2xl">
          {question}
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-700">{answer}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </Container>
    </section>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;
}

/**
 * A labelled fact table.
 *
 * Address, hours, phone, distance, ZIP coverage — the details an assistant has
 * to extract to answer a question about the business, laid out as a description
 * list so the label/value relationship survives being read without the styling.
 */
export function FactGrid({
  facts,
  columns = 4,
  className,
}: {
  facts: Fact[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  if (facts.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid gap-px border border-line bg-line sm:grid-cols-2",
        columns === 3 ? "lg:grid-cols-3" : columns === 4 ? "lg:grid-cols-4" : "",
        className,
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="bg-white p-5">
          <dt className="text-ui font-semibold uppercase tracking-wide text-ink-500">{fact.label}</dt>
          <dd className="mt-2 font-display text-[15px] font-bold leading-snug text-ink-950">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
