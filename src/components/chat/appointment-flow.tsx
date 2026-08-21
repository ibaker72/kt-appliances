"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";

import { bookChatAppointment, type ChatAppointmentResult } from "@/app/actions/chat";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track, trackAdsConversion } from "@/lib/analytics/track";
import { SMS_CONSENT_TEXT } from "@/lib/appointments/schema";
import {
  appointmentPurpose,
  isAppointmentPurposeId,
  type AppointmentPurposeId,
} from "@/lib/appointments/purposes";
import type { AppointmentSlot, DayOption } from "@/lib/appointments/availability";
import { siteConfig } from "@/lib/site-config";
import { cn, formatPhoneNumber } from "@/lib/utils";
import type { ChatProduct } from "@/lib/chat/types";
import { chatAttribution, newSubmissionToken } from "./chat-client";
import { ApplianceSummary } from "./inventory-results";
import { ConfirmationActions } from "./quick-actions";

/**
 * Booking, inside the panel.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS NOT ALLOWED TO DO
 * ---------------------------------------------------------------------------
 * It cannot show a confirmation for a booking that does not exist. The success
 * screen renders only from what the server returned, and the server returns it
 * only after the row is committed — see `bookAppointment`. A failed insert, a
 * taken slot and a validation error all come back as errors with the form still
 * on screen and the visitor's answers intact.
 *
 * It also cannot promise a text. `smsConfirmationSent` is set from the actual
 * send result, so while the A2P campaign is under review — or when the consent
 * box is left unticked — the confirmation simply does not mention one.
 *
 * ---------------------------------------------------------------------------
 * SLOTS
 * ---------------------------------------------------------------------------
 * Times come from `/api/appointments/availability`, which reads the appointments
 * table. That stops a shopper being offered a slot that is already gone, but it
 * is not the guarantee — Postgres is. If somebody wins the race in between, the
 * action returns `slotTaken` and this puts the visitor straight back on the
 * picker with fresh times rather than showing them an error they cannot act on.
 */

const labelClass =
  "mb-1 block font-display text-[11px] font-bold uppercase tracking-[0.07em] text-ink-700";

/**
 * 16px, not 15.
 *
 * `globals.css` sets `input, select, textarea { font-size: 16px }` in the base
 * layer precisely to stop iOS zooming the page when a field takes focus — but a
 * Tailwind text utility lives in the utilities layer and silently outranks it.
 * Inside a chat panel that zoom is much worse than on a page: it scales the
 * fixed panel past the viewport and leaves the shopper scrolling sideways to
 * find the button they were about to press.
 */
const inputClass =
  "w-full rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-[16px] text-ink-950 " +
  "placeholder:text-ink-400 focus:border-ink-900";

interface AvailabilityState {
  days: DayOption[];
  slots: AppointmentSlot[];
  date: string;
  loading: boolean;
  /** False when no database answered, so the copy stops short of a promise. */
  checked: boolean;
  failed: boolean;
}

const EMPTY_AVAILABILITY: AvailabilityState = {
  days: [],
  slots: [],
  date: "",
  loading: true,
  checked: false,
  failed: false,
};

interface AppointmentFlowProps {
  purpose: AppointmentPurposeId;
  appliance: ChatProduct | null;
  pathname: string;
  onClose: () => void;
  /** Lets the panel scroll the newest thing into view. */
  onGrew: () => void;
}

export function AppointmentFlow({
  purpose,
  appliance,
  pathname,
  onClose,
  onGrew,
}: AppointmentFlowProps) {
  const purposeId = isAppointmentPurposeId(purpose) ? purpose : "warehouse-visit";
  const purposeMeta = appointmentPurpose(purposeId);

  const [availability, setAvailability] = useState<AvailabilityState>(EMPTY_AVAILABILITY);
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ChatAppointmentResult | null>(null);

  const [submissionToken] = useState(newSubmissionToken);
  const successRef = useRef<HTMLDivElement>(null);
  const groupId = useId();

  /**
   * Fetch, then show the spinner while it runs.
   *
   * The resolve step is a pure module function (`resolveAvailability`) that
   * returns the next state rather than writing it, so the mount effect below can
   * start the load without a synchronous state write — and every caller gets the
   * same fall-through-to-the-next-open-day behaviour for free.
   */
  const reload = useCallback(async (date?: string) => {
    setAvailability((current) => ({ ...current, loading: true, failed: false }));
    setAvailability(await resolveAvailability(date ?? todayGuess()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    track(ANALYTICS_EVENTS.chatAppointmentStarted, {
      purpose: purposeId,
      has_appliance: Boolean(appliance),
    });

    // `EMPTY_AVAILABILITY` already reads as loading, so the first load needs no
    // state write until it has an answer.
    void (async () => {
      const next = await resolveAvailability(todayGuess());
      if (!cancelled) setAvailability(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [purposeId, appliance]);

  useEffect(() => {
    if (result?.status !== "success") return;
    track(ANALYTICS_EVENTS.chatAppointmentBooked, { purpose: purposeId });
    track(ANALYTICS_EVENTS.appointmentBooked, { form_location: "website_chat_appointment" });
    // The strongest conversion this site produces, reported to Google Ads on the
    // same footing as a booking made on /schedule — and, like it, only after the
    // server accepted the booking.
    trackAdsConversion();
    successRef.current?.focus();
    onGrew();
  }, [result, purposeId, onGrew]);

  async function submit() {
    if (pending) return;
    setPending(true);
    try {
      const response = await bookChatAppointment({
        name,
        phone,
        email,
        date: availability.date,
        time: slot,
        purpose: purposeId,
        notes,
        smsConsent,
        applianceId: appliance?.id,
        submissionToken,
        pathname,
        attribution: chatAttribution(),
        website,
      });

      setResult(response);

      if (response.status === "error" && response.slotTaken) {
        // The picker is the fix, so reopen it with fresh times.
        setSlot("");
        await reload(availability.date);
      }
    } finally {
      setPending(false);
      onGrew();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Confirmation                                                           */
  /* ---------------------------------------------------------------------- */

  if (result?.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-line bg-bone-50 p-4"
      >
        <CalendarCheck aria-hidden className="size-6 text-success-600" strokeWidth={2} />
        <h3 className="mt-2 font-display text-[17px] font-bold text-ink-950">You&apos;re booked!</h3>

        <dl className="mt-3 space-y-1.5 text-[13.5px]">
          <Row label="Name" value={result.name} />
          <Row label="When" value={result.whenLabel} />
          <Row label="What for" value={result.purposeLabel} />
          {result.applianceLabel ? <Row label="Appliance" value={result.applianceLabel} /> : null}
          <Row
            label="Where"
            value={`${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}`}
          />
          <Row label="Phone" value={siteConfig.phone.display} />
        </dl>

        <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
          {/* Claimed only when a text actually went out. */}
          {result.smsConfirmationSent
            ? `We've sent a confirmation text to ${result.maskedPhone}. `
            : ""}
          Need to change your appointment? Call or text {siteConfig.phone.display}.
        </p>

        <ConfirmationActions
          applianceHref={appliance?.href ?? null}
          onClose={onClose}
          context="chat-appointment"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Form                                                                   */
  /* ---------------------------------------------------------------------- */

  const openSlots = availability.slots.filter((entry) => entry.available);

  return (
    <div className="rounded-md border border-ink-200 bg-white p-3.5 shadow-card">
      <p className="font-display text-[13px] font-bold uppercase tracking-[0.07em] text-ink-700">
        {purposeMeta.label}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{purposeMeta.description}</p>

      {appliance ? (
        <div className="mt-3">
          <ApplianceSummary product={appliance} />
        </div>
      ) : null}

      {/* --- When ---------------------------------------------------------- */}
      {/*
        A labelled group, built from a div and `role="group"` rather than
        `<fieldset>/<legend>`.
        
        Not a style preference. A fieldset carries `min-inline-size: min-content`
        from the UA stylesheet, and Chrome applies it to the fieldset's anonymous
        content box where an author `min-width: 0` cannot reach it. The day row
        below scrolls horizontally, so under a fieldset its full width leaks out
        as the *panel's* width: measured at 503px inside a 390px phone, which is
        horizontal overflow on the one surface that must never have it. The
        accessible name is identical either way — verified in the browser suite.
      */}
      <div role="group" aria-labelledby={`${groupId}-day`} className="mt-4 min-w-0">
        <p id={`${groupId}-day`} className={labelClass}>
          Pick a day
        </p>
        {availability.loading ? (
          <p className="text-[13px] text-ink-500">Loading times…</p>
        ) : availability.failed ? (
          <p className="text-[13px] text-ink-700">
            We couldn&apos;t load times right now. Call or text {siteConfig.phone.display} and
            we&apos;ll book it for you.
          </p>
        ) : availability.days.length === 0 ? (
          <p className="text-[13px] text-ink-700">
            No open slots in the next few weeks. Call or text {siteConfig.phone.display} and
            we&apos;ll find you a time.
          </p>
        ) : (
          <div className="no-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
            {availability.days.map((day) => (
              <button
                key={day.date}
                type="button"
                aria-pressed={day.date === availability.date}
                className={cn(
                  "shrink-0 rounded-sm border px-3 py-2 text-[12.5px] font-semibold transition-colors",
                  day.date === availability.date
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-ink-200 bg-white text-ink-800 hover:border-ink-900",
                )}
                onClick={() => {
                  setSlot("");
                  void reload(day.date);
                }}
              >
                {day.relativeLabel ?? day.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!availability.loading && !availability.failed && openSlots.length > 0 ? (
        <div role="group" aria-labelledby={`${groupId}-time`} className="mt-3 min-w-0">
          <p id={`${groupId}-time`} className={labelClass}>
            Pick a time
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {openSlots.map((entry) => (
              <button
                key={entry.value}
                type="button"
                aria-pressed={entry.value === slot}
                className={cn(
                  "rounded-sm border px-2 py-2 text-[12.5px] font-semibold tnum transition-colors",
                  entry.value === slot
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-ink-200 bg-white text-ink-800 hover:border-ink-900",
                )}
                onClick={() => {
                  setSlot(entry.value);
                  track(ANALYTICS_EVENTS.chatAppointmentSlotSelected, {
                    purpose: purposeId,
                    after_hours: entry.afterHours,
                  });
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {openSlots.some((entry) => entry.afterHours) ? (
            <p className="mt-1.5 text-[12px] text-ink-500">
              {siteConfig.hours.afterHours.note} Evening slots are yours alone — the warehouse is
              closed to walk-ins then.
            </p>
          ) : null}
          {/* Said only when it is true: with no database reachable, the times
              above are the schedule, not a checked book. */}
          {!availability.checked ? (
            <p className="mt-1.5 text-[12px] text-ink-500">
              We&apos;ll confirm this time with you when we get your request.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* --- Who ----------------------------------------------------------- */}
      {slot ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="grid gap-2.5">
            <div>
              <label className={labelClass} htmlFor="chat-appt-name">
                Name
              </label>
              <input
                id="chat-appt-name"
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
              <label className={labelClass} htmlFor="chat-appt-phone">
                Mobile phone
              </label>
              <input
                id="chat-appt-phone"
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

            <div>
              <label className={labelClass} htmlFor="chat-appt-email">
                Email <span className="font-sans normal-case text-ink-400">(optional)</span>
              </label>
              <input
                id="chat-appt-email"
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

            <div>
              <label className={labelClass} htmlFor="chat-appt-notes">
                Anything we should know?{" "}
                <span className="font-sans normal-case text-ink-400">(optional)</span>
              </label>
              <textarea
                id="chat-appt-notes"
                className={cn(inputClass, "resize-y")}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                placeholder="e.g. I'll need help loading it"
              />
            </div>
          </div>

          {/* Honeypot — hidden from people, irresistible to bots. */}
          <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
            <label htmlFor="chat-appt-website">Website</label>
            <input
              id="chat-appt-website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <label className="mt-3 flex gap-2.5 text-[12px] leading-relaxed text-ink-600">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              checked={smsConsent}
              onChange={(event) => setSmsConsent(event.target.checked)}
            />
            <span>{SMS_CONSENT_TEXT}</span>
          </label>

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
                Booking…
              </>
            ) : (
              "Confirm appointment"
            )}
          </button>

          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
            Booking does not require agreeing to texts — we use your number to confirm this
            appointment. By submitting, you agree {siteConfig.name} may contact you about this
            request. See our{" "}
            <a href="/privacy" className="text-ink-700 underline underline-offset-2">
              privacy policy
            </a>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[74px] shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 font-semibold text-ink-950">{value}</dd>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] font-medium text-brand-500">{message}</p>;
}

interface AvailabilityPayload {
  day: { date: string; slots: AppointmentSlot[]; databaseChecked: boolean };
  days: DayOption[];
}

/**
 * One call to the availability route.
 *
 * Returns null for every failure — offline, a non-200, a body that is not the
 * shape we expect — so the caller has exactly one error branch and no way to
 * render a slot grid from a response it did not understand.
 */
async function fetchAvailability(date: string): Promise<AvailabilityPayload | null> {
  try {
    const response = await fetch(
      `/api/appointments/availability?date=${encodeURIComponent(date)}`,
    );
    const data: unknown = await response.json();
    if (!response.ok || (data as { ok?: unknown }).ok !== true) return null;

    const day = (data as Partial<AvailabilityPayload>).day;
    if (!day || !Array.isArray(day.slots)) return null;

    const days = (data as Partial<AvailabilityPayload>).days;
    return { day, days: Array.isArray(days) ? days : [] };
  } catch {
    return null;
  }
}

/**
 * One day of slots, as the state the component should adopt.
 *
 * A day with nothing left falls through to the first day the server says has
 * something. One retry, never a loop: `days` only ever lists days that already
 * have open slots.
 */
async function resolveAvailability(date: string): Promise<AvailabilityState> {
  const first = await fetchAvailability(date);
  if (!first) return { ...EMPTY_AVAILABILITY, loading: false, failed: true };

  let { day, days } = first;
  if (day.slots.length === 0 && days.length > 0 && days[0].date !== day.date) {
    const second = await fetchAvailability(days[0].date);
    if (second) ({ day, days } = second);
  }

  return {
    days,
    slots: day.slots,
    date: day.date,
    loading: false,
    checked: day.databaseChecked,
    failed: false,
  };
}

/**
 * Today, in the warehouse's timezone, from the browser's clock.
 *
 * Only ever a *request* for a day: the server recomputes the bookable window in
 * `America/New_York` and returns the day it actually served, so a visitor in
 * another timezone gets the right grid rather than a hydration mismatch.
 */
function todayGuess(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
