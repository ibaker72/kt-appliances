"use client";

import { Phone } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A bubble.
 *
 * Text is rendered as text. There is no markdown parser and no
 * `dangerouslySetInnerHTML` anywhere in this feature, so nothing the server or a
 * language model returns can become markup — which is what makes "the model
 * writes the message" safe in the first place.
 */

export function AssistantMessage({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "max-w-[92%] rounded-md px-3.5 py-2.5 text-[14.5px] leading-relaxed",
        tone === "warning"
          ? "border-l-[3px] border-brand-500 bg-brand-50 text-ink-900"
          : "bg-bone-100 text-ink-900",
      )}
    >
      {text}
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[85%] rounded-md bg-ink-950 px-3.5 py-2.5 text-[14.5px] leading-relaxed text-white">
      {text}
    </div>
  );
}

/**
 * The handoff.
 *
 * Visually distinct from an ordinary reply because it is a different kind of
 * statement: the assistant is stepping out of the way rather than answering.
 */
export function HumanHandoff({ text }: { text: string }) {
  return (
    <div className="max-w-[92%] rounded-md border border-ink-200 bg-white px-3.5 py-3 shadow-card">
      <p className="flex items-center gap-2 font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-500">
        <Phone aria-hidden className="size-3.5 text-brand-500" strokeWidth={2.5} />
        Talk to a person
      </p>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-900">{text}</p>
    </div>
  );
}

/**
 * The waiting state.
 *
 * `aria-hidden` on the dots and a real sentence for assistive tech: three
 * animated dots announce as nothing at all, and the base stylesheet's
 * reduced-motion rule already stops them moving for anyone who asked.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-bone-100 px-3.5 py-3">
      <span className="sr-only">Working on that…</span>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden
          className="size-1.5 animate-pulse rounded-full bg-ink-400"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </div>
  );
}
