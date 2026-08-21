"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { submitChatLead, type ChatLeadResult } from "@/app/actions/chat";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { siteConfig, smsHref, telHref } from "@/lib/site-config";
import { cn, formatPhoneNumber } from "@/lib/utils";
import type { ChatLeadFlow, ChatProduct } from "@/lib/chat/types";
import { chatAttribution } from "./chat-client";
import { ApplianceSummary } from "./inventory-results";

/**
 * Lead capture, inside the panel.
 *
 * One component, four flows, because they differ only in which fields are asked
 * for and what the confirmation says — and because they all end in the same
 * place: `leadSchema` → `recordLead`, the pipeline every other form on this site
 * already uses. A chat lead lands in the same table, triggers the same owner
 * alert and appears in the same admin list as one from the delivery page.
 *
 * The order matters as much as the fields. Nothing here is shown until the
 * assistant has already given the visitor something — a search result, an
 * availability answer, a delivery explanation. Asking for a phone number before
 * being useful is how a chat widget gets closed.
 */

interface FlowConfig {
  title: string;
  intro: string;
  /** ZIP is required for a delivery quote and pointless for the others. */
  zip: "required" | "hidden";
  email: "optional" | "hidden";
  notesLabel: string;
  notesPlaceholder: string;
  submitLabel: string;
}

const FLOWS: Record<ChatLeadFlow, FlowConfig> = {
  "delivery-quote": {
    title: "Get a delivery quote",
    intro: "Tell us where it's going and we'll come back with a real number.",
    zip: "required",
    email: "optional",
    notesLabel: "Which appliance, and anything about the access?",
    notesPlaceholder: "e.g. French door fridge, second floor, narrow stairs",
    submitLabel: "Request a quote",
  },
  "availability-check": {
    title: "Have us confirm it",
    intro: "We'll check the unit is still on the floor before you make the trip.",
    zip: "hidden",
    email: "hidden",
    notesLabel: "Anything else we should check?",
    notesPlaceholder: "e.g. Can you measure the depth with the doors on?",
    submitLabel: "Ask us to confirm",
  },
  financing: {
    title: "Financing follow-up",
    intro: "Someone will go through the options with you for the purchase you have in mind.",
    zip: "hidden",
    email: "optional",
    notesLabel: "What are you looking to buy?",
    notesPlaceholder: "e.g. A washer and dryer set",
    submitLabel: "Have someone call me",
  },
  callback: {
    title: "Leave your number",
    intro: "We'll get back to you from the warehouse.",
    zip: "hidden",
    email: "hidden",
    notesLabel: "What can we help with?",
    notesPlaceholder: "e.g. Looking for a 30-inch electric range under $700",
    submitLabel: "Send it",
  },
};

const labelClass =
  "mb-1 block font-display text-[11px] font-bold uppercase tracking-[0.07em] text-ink-700";

/** 16px so a focused field does not zoom the panel on iOS — see `appointment-flow`. */
const inputClass =
  "w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-[16px] text-ink-950 " +
  "placeholder:text-ink-400 focus:border-ink-900";

export function ContactFlow({
  flow,
  appliance,
  pathname,
  onGrew,
}: {
  flow: ChatLeadFlow;
  appliance: ChatProduct | null;
  pathname: string;
  onGrew: () => void;
}) {
  const config = FLOWS[flow];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ChatLeadResult | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track(ANALYTICS_EVENTS.chatLeadStarted, { flow, has_appliance: Boolean(appliance) });
    if (flow === "availability-check") {
      track(ANALYTICS_EVENTS.chatAvailabilityStarted, { has_appliance: Boolean(appliance) });
    }
  }, [flow, appliance]);

  useEffect(() => {
    if (result?.status !== "success") return;
    // Flow only — never the name, the number, the ZIP or the free text.
    track(ANALYTICS_EVENTS.chatLeadSubmitted, { flow });
    if (flow === "delivery-quote") {
      track(ANALYTICS_EVENTS.chatDeliveryQuoteRequested, {});
      track(ANALYTICS_EVENTS.deliveryInquiry, { context: "chat" });
    }
    track(ANALYTICS_EVENTS.leadSubmitted, { form_location: `website_chat_${flow}` });
    successRef.current?.focus();
    onGrew();
  }, [result, flow, onGrew]);

  async function submit() {
    if (pending) return;
    setPending(true);
    try {
      setResult(
        await submitChatLead({
          flow,
          name,
          phone,
          email: config.email === "hidden" ? "" : email,
          zip: config.zip === "hidden" ? "" : zip,
          message: notes,
          applianceId: appliance?.id,
          pathname,
          attribution: chatAttribution(),
          website,
        }),
      );
    } finally {
      setPending(false);
      onGrew();
    }
  }

  if (result?.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-line bg-bone-50 p-4"
      >
        <Check aria-hidden className="size-6 text-success-600" strokeWidth={2.5} />
        <p className="mt-2 text-[14px] leading-relaxed text-ink-900">{result.text}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          Need an answer now?{" "}
          <a href={telHref} className="font-semibold text-brand-500 underline underline-offset-4">
            Call {siteConfig.phone.display}
          </a>{" "}
          or{" "}
          <a
            href={smsHref(`Hi ${siteConfig.name}, I just sent a request through your website chat.`)}
            className="font-semibold text-brand-500 underline underline-offset-4"
          >
            text us
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-ink-200 bg-white p-3.5 shadow-card">
      <p className="font-display text-[13px] font-bold uppercase tracking-[0.07em] text-ink-700">
        {config.title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{config.intro}</p>

      {appliance ? (
        <div className="mt-3">
          <ApplianceSummary product={appliance} />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2.5">
        <div>
          <label className={labelClass} htmlFor={`chat-lead-name-${flow}`}>
            Name
          </label>
          <input
            id={`chat-lead-name-${flow}`}
            className={cn(inputClass, result?.status === "error" && result.errors?.name && "border-brand-500")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={120}
            placeholder="First and last name"
            aria-invalid={result?.status === "error" && Boolean(result.errors?.name)}
          />
          <FieldError message={result?.status === "error" ? result.errors?.name : undefined} />
        </div>

        <div>
          <label className={labelClass} htmlFor={`chat-lead-phone-${flow}`}>
            Mobile phone
          </label>
          <input
            id={`chat-lead-phone-${flow}`}
            className={cn(inputClass, result?.status === "error" && result.errors?.phone && "border-brand-500")}
            value={phone}
            onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(973) 555-0123"
            aria-invalid={result?.status === "error" && Boolean(result.errors?.phone)}
          />
          <FieldError message={result?.status === "error" ? result.errors?.phone : undefined} />
        </div>

        {config.zip === "required" ? (
          <div>
            <label className={labelClass} htmlFor={`chat-lead-zip-${flow}`}>
              Delivery ZIP code
            </label>
            <input
              id={`chat-lead-zip-${flow}`}
              className={cn(inputClass, result?.status === "error" && result.errors?.zip && "border-brand-500")}
              value={zip}
              onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="18301"
              aria-invalid={result?.status === "error" && Boolean(result.errors?.zip)}
            />
            <FieldError message={result?.status === "error" ? result.errors?.zip : undefined} />
          </div>
        ) : null}

        {config.email === "optional" ? (
          <div>
            <label className={labelClass} htmlFor={`chat-lead-email-${flow}`}>
              Email <span className="font-sans normal-case text-ink-400">(optional)</span>
            </label>
            <input
              id={`chat-lead-email-${flow}`}
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              maxLength={200}
              placeholder="you@example.com"
            />
            <FieldError message={result?.status === "error" ? result.errors?.email : undefined} />
          </div>
        ) : null}

        <div>
          <label className={labelClass} htmlFor={`chat-lead-notes-${flow}`}>
            {config.notesLabel}{" "}
            <span className="font-sans normal-case text-ink-400">(optional)</span>
          </label>
          <textarea
            id={`chat-lead-notes-${flow}`}
            className={cn(inputClass, "resize-y")}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            placeholder={config.notesPlaceholder}
          />
        </div>
      </div>

      {/* Honeypot. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={`chat-lead-website-${flow}`}>Website</label>
        <input
          id={`chat-lead-website-${flow}`}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {result?.status === "error" && result.message ? (
        <p
          role="alert"
          className="mt-3 border-l-[3px] border-brand-500 bg-brand-50 py-2 pl-3 text-[13px] font-medium text-ink-900"
        >
          {result.message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => void submit()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-brand-500 bg-brand-500 px-4 py-3 text-[14px] font-semibold text-white shadow-card transition-colors hover:border-brand-600 hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-55"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          config.submitLabel
        )}
      </button>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
        By submitting, you agree {siteConfig.name} may contact you about this request. See our{" "}
        <a href="/privacy" className="text-ink-700 underline underline-offset-2">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] font-medium text-brand-500">{message}</p>;
}
