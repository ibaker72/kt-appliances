"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarCheck, Loader2 } from "lucide-react";

import {
  CheckboxField,
  Field,
  HoneypotField,
  SelectField,
  TextAreaField,
} from "@/components/forms/form-fields";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { buttonStyles } from "@/components/ui/button";
import { submitAppointment } from "@/app/actions/appointments";
import {
  AFTER_HOURS_FROM,
  APPOINTMENT_SERVICE_LABELS,
  APPOINTMENT_SERVICE_TYPES,
  APPOINTMENT_SLOTS,
  SMS_CONSENT_TEXT,
  initialAppointmentFormState,
} from "@/lib/appointments/schema";
import { formatSlotLabel } from "@/lib/appointments/time";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { getAttribution, inferredSource } from "@/lib/analytics/attribution";
import { siteConfig } from "@/lib/site-config";
import { cn, formatPhoneNumber } from "@/lib/utils";

export interface AppointmentFormProps {
  /** `YYYY-MM-DD`, computed on the server so the calendar bounds never drift. */
  minDate: string;
  maxDate: string;
  formLocation: string;
  applianceId?: string;
  applianceSlug?: string;
  applianceLabel?: string;
  className?: string;
}

const SERVICE_OPTIONS = APPOINTMENT_SERVICE_TYPES.map((value) => ({
  value,
  label: APPOINTMENT_SERVICE_LABELS[value],
}));

const SLOT_OPTIONS = APPOINTMENT_SLOTS.map((slot) => ({
  value: slot,
  label: slot >= AFTER_HOURS_FROM ? `${formatSlotLabel(slot)} (after hours)` : formatSlotLabel(slot),
}));

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full")}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Booking…
        </>
      ) : (
        "Book Appointment"
      )}
    </button>
  );
}

export function AppointmentForm({
  minDate,
  maxDate,
  formLocation,
  applianceId,
  applianceSlug,
  applianceLabel,
  className,
}: AppointmentFormProps) {
  const [state, formAction] = useActionState(submitAppointment, initialAppointmentFormState);
  const [phone, setPhone] = useState("");
  const successRef = useRef<HTMLDivElement>(null);

  /**
   * Minted once per mount and resubmitted unchanged.
   *
   * This is the client half of duplicate protection: a double-click, a retried
   * action or a refreshed POST all carry the same token, and a unique index in
   * Postgres collapses them onto one appointment. The disabled submit button
   * above is a courtesy — it does nothing about a retry that never touched the
   * button, which is exactly the case that would otherwise send a second text.
   */
  const [submissionToken] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    track(ANALYTICS_EVENTS.appointmentBooked, { form_location: formLocation });
    successRef.current?.focus();
  }, [state.status, formLocation]);

  if (state.status === "success") {
    const confirmation = state.confirmation;

    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn("border border-line bg-bone-50 p-6 sm:p-8", className)}
      >
        <CalendarCheck aria-hidden className="size-8 text-success-600" strokeWidth={2} />
        <h3 className="mt-4 font-display text-xl font-bold text-ink-950 sm:text-2xl">
          Appointment confirmed
        </h3>

        {confirmation?.scheduledForLabel ? (
          <p className="mt-2.5 text-[15px] font-semibold text-ink-900">
            {confirmation.scheduledForLabel}
          </p>
        ) : null}

        {/*
          The one claim on this screen that has to be earned. `smsConfirmationSent`
          is set from the actual send result, so while the A2P campaign is under
          review — or when the visitor did not tick the consent box — this simply
          does not appear, rather than promising a text that is not coming.
        */}
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          {confirmation?.smsConfirmationSent
            ? `We've sent a confirmation text to ${confirmation.maskedPhone}. We'll contact you if anything changes.`
            : "We'll contact you if anything changes."}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <CallLink context={formLocation} className={buttonStyles("dark", "md")}>
            Call {siteConfig.phone.display}
          </CallLink>
          <TextLink
            context={formLocation}
            message={`Hi ${siteConfig.name}, I just booked an appointment on your website.`}
            className={buttonStyles("outline", "md")}
          >
            Text Us
          </TextLink>
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        const attribution = getAttribution();
        formData.set("source", inferredSource(attribution));
        formData.set("utmSource", attribution.utmSource ?? "");
        formData.set("utmMedium", attribution.utmMedium ?? "");
        formData.set("utmCampaign", attribution.utmCampaign ?? "");
        formData.set("utmContent", attribution.utmContent ?? "");
        formData.set("utmTerm", attribution.utmTerm ?? "");
        formData.set("landingPage", attribution.landingPage ?? "");
        formData.set("referrer", attribution.referrer ?? "");
        formAction(formData);
      }}
      className={cn("relative", className)}
      noValidate
    >
      <input type="hidden" name="formLocation" value={formLocation} />
      <input type="hidden" name="submissionToken" value={submissionToken} />
      {applianceId ? <input type="hidden" name="applianceId" value={applianceId} /> : null}
      {applianceSlug ? <input type="hidden" name="applianceSlug" value={applianceSlug} /> : null}
      {applianceLabel ? <input type="hidden" name="applianceLabel" value={applianceLabel} /> : null}
      <HoneypotField />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="First and last name"
          error={state.errors?.name}
          className="sm:col-span-2"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="(973) 555-0123"
          value={phone}
          onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
          error={state.errors?.phone}
          hint="We'll call or text you back at this number."
        />
        <Field
          label="ZIP Code"
          name="zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="18301"
          optional
          error={state.errors?.zip}
          hint="Helps us quote delivery."
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={200}
          placeholder="you@example.com"
          optional
          error={state.errors?.email}
          className="sm:col-span-2"
        />

        <SelectField
          label="What's the visit for?"
          name="serviceType"
          options={SERVICE_OPTIONS}
          defaultValue="warehouse-visit"
          error={state.errors?.serviceType}
          className="sm:col-span-2"
        />

        <Field
          label="Date"
          name="date"
          type="date"
          required
          min={minDate}
          max={maxDate}
          error={state.errors?.date}
        />
        <SelectField
          label="Time"
          name="time"
          options={SLOT_OPTIONS}
          defaultValue="10:00"
          error={state.errors?.time}
          hint={siteConfig.hours.afterHours.note}
        />
      </div>

      <TextAreaField
        label="Anything we should know?"
        name="notes"
        className="mt-4"
        optional
        maxLength={2000}
        rows={3}
        placeholder="e.g. Looking at the 30-inch electric range, and I'll need help loading it."
        error={state.errors?.notes}
      />

      <CheckboxField
        name="smsConsent"
        className="mt-5 border-t border-line pt-5"
        label={SMS_CONSENT_TEXT}
        error={state.errors?.smsConsent}
      />

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-4 border-l-[3px] border-brand-500 bg-brand-50 py-2 pl-3 text-[14px] font-medium text-ink-900"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-5">
        <SubmitButton />
      </div>

      <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-500">
        Booking does not require agreeing to texts. We use your number to confirm this
        appointment. See our{" "}
        <a href="/privacy" className="text-ink-700 underline underline-offset-2">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
