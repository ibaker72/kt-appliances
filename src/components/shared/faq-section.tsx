import { Plus } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, type FaqEntry } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

/**
 * Question-and-answer block.
 *
 * Answers are rendered in the markup (inside a `<details>`, which search engines
 * and assistants read) rather than injected by script, so the FAQPage schema
 * always describes visible content.
 */
export function FaqSection({
  entries,
  /** Emits FAQPage JSON-LD. Turn off when another block on the page already does. */
  withSchema = true,
  className,
  columns = 1,
}: {
  entries: FaqEntry[];
  withSchema?: boolean;
  className?: string;
  columns?: 1 | 2;
}) {
  if (entries.length === 0) return null;

  return (
    <div className={cn(columns === 2 ? "grid gap-x-12 md:grid-cols-2" : "", className)}>
      {withSchema ? <JsonLd data={faqSchema(entries)} /> : null}
      {columns === 2 ? (
        <>
          <FaqList entries={entries.filter((_, index) => index % 2 === 0)} />
          <FaqList entries={entries.filter((_, index) => index % 2 === 1)} />
        </>
      ) : (
        <FaqList entries={entries} />
      )}
    </div>
  );
}

function FaqList({ entries }: { entries: FaqEntry[] }) {
  return (
    <div className="border-t border-line">
      {entries.map((entry) => (
        <details key={entry.question} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-5 [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-[16.5px] font-bold leading-snug tracking-[-0.01em] text-ink-950 sm:text-[17.5px]">
              {entry.question}
            </h3>
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center border border-line text-ink-500 transition-transform duration-200 group-open:rotate-45 group-open:border-brand-500 group-open:bg-brand-500 group-open:text-white"
            >
              <Plus className="size-3.5" strokeWidth={2.75} />
            </span>
          </summary>
          <p className="pb-5 pr-10 text-[15px] leading-relaxed text-ink-600">{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}
