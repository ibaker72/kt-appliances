"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Field, HoneypotField, TextAreaField } from "@/components/forms/form-fields";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { buttonStyles } from "@/components/ui/button";
import { submitLead } from "@/app/actions/leads";
import { initialLeadFormState, type InquiryType } from "@/lib/leads/schema";
import { ANALYTICS_EVENTS, type AnalyticsEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { getAttribution, inferredSource } from "@/lib/analytics/attribution";
import { siteConfig } from "@/lib/site-config";
import { cn, formatPhoneNumber } from "@/lib/utils";

const INQUIRY_EVENT: Record<InquiryType, AnalyticsEvent> = {
  appliance: ANALYTICS_EVENTS.productInquiry,
  delivery: ANALYTICS_EVENTS.deliveryInquiry,
  financing: ANALYTICS_EVENTS.financingInquiry,
  installation: ANALYTICS_EVENTS.installationInquiry,
  "after-hours": ANALYTICS_EVENTS.afterHoursRequest,
  general: ANALYTICS_EVENTS.generalInquiry,
};

export interface LeadFormProps {
  inquiryType: InquiryType;
  /** Identifies which form on which page produced the lead. */
  formLocation: string;
  submitLabel?: string;
  /** Shown above the fields. */
  title?: string;
  description?: string;
  /** Message textarea. Off for the short product/delivery forms. */
  showMessage?: boolean;
  messageLabel?: string;
  messagePlaceholder?: string;
  defaultMessage?: string;
  showZip?: boolean;
  zipRequired?: boolean;
  showEmail?: boolean;
  /** Appliance context attached automatically to the lead. */
  applianceId?: string;
  applianceSlug?: string;
  applianceLabel?: string;
  className?: string;
  /** `light` renders for dark backgrounds. */
  tone?: "dark" | "light";
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full")}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Sending…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function LeadForm({
  inquiryType,
  formLocation,
  submitLabel = "Send Request",
  title,
  description,
  showMessage = true,
  messageLabel = "What are you looking for?",
  messagePlaceholder,
  defaultMessage = "",
  showZip = true,
  zipRequired = false,
  showEmail = true,
  applianceId,
  applianceSlug,
  applianceLabel,
  className,
  tone = "dark",
}: LeadFormProps) {
  const [state, formAction] = useActionState(submitLead, initialLeadFormState);
  const [phone, setPhone] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const light = tone === "light";

  useEffect(() => {
    if (state.status !== "success") return;
    track(INQUIRY_EVENT[inquiryType], { form_location: formLocation, appliance: applianceLabel });
    track(ANALYTICS_EVENTS.leadSubmitted, { inquiry_type: inquiryType, form_location: formLocation });
    // No field reset needed — on success the form unmounts and the confirmation
    // panel below takes its place. Move focus there so it is announced.
    successRef.current?.focus();
  }, [state.status, inquiryType, formLocation, applianceLabel]);

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "border p-6 sm:p-8",
          light ? "border-white/20 bg-white/5" : "border-line bg-bone-50",
          className,
        )}
      >
        <CheckCircle2
          aria-hidden
          className="size-8 text-success-600"
          strokeWidth={2}
        />
        <h3
          className={cn(
            "mt-4 font-display text-xl font-bold sm:text-2xl",
            light ? "text-white" : "text-ink-950",
          )}
        >
          Request received
        </h3>
        <p className={cn("mt-2.5 text-[15px] leading-relaxed", light ? "text-white/75" : "text-ink-600")}>
          {state.message}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <CallLink context={formLocation} className={buttonStyles(light ? "white" : "dark", "md")}>
            Call {siteConfig.phone.display}
          </CallLink>
          <TextLink
            context={formLocation}
            message={`Hi ${siteConfig.name}, I just submitted a request on your website.`}
            className={buttonStyles(light ? "outlineLight" : "outline", "md")}
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
        // Attribution lives in sessionStorage; attach it at submit time so the
        // campaign that produced the click travels with the lead.
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
      {title ? (
        <h3
          className={cn(
            "font-display text-xl font-bold sm:text-2xl",
            light ? "text-white" : "text-ink-950",
          )}
        >
          {title}
        </h3>
      ) : null}
      {description ? (
        <p
          className={cn(
            "mb-6 mt-2 text-[15px] leading-relaxed",
            light ? "text-white/70" : "text-ink-600",
          )}
        >
          {description}
        </p>
      ) : null}

      <input type="hidden" name="inquiryType" value={inquiryType} />
      <input type="hidden" name="formLocation" value={formLocation} />
      {applianceId ? <input type="hidden" name="applianceId" value={applianceId} /> : null}
      {applianceSlug ? <input type="hidden" name="applianceSlug" value={applianceSlug} /> : null}
      {applianceLabel ? <input type="hidden" name="applianceLabel" value={applianceLabel} /> : null}
      <HoneypotField />

      <div className={cn("grid gap-4", showZip && showEmail ? "sm:grid-cols-2" : "")}>
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="First and last name"
          error={state.errors?.name}
          className={showZip && showEmail ? "sm:col-span-2" : ""}
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
        {showZip ? (
          <Field
            label="ZIP Code"
            name="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="18301"
            optional={!zipRequired}
            error={state.errors?.zip}
            hint="Helps us quote delivery."
          />
        ) : null}
        {showEmail ? (
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={200}
            placeholder="you@example.com"
            optional
            error={state.errors?.email}
            className={showZip ? "sm:col-span-2" : ""}
          />
        ) : null}
      </div>

      {showMessage ? (
        <TextAreaField
          label={messageLabel}
          name="message"
          className="mt-4"
          optional
          maxLength={2000}
          defaultValue={defaultMessage}
          placeholder={
            messagePlaceholder ??
            "Tell us the appliance, brand or size you need — or ask us anything about a listing."
          }
          error={state.errors?.message}
        />
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className={cn(
            "mt-4 border-l-[3px] border-brand-500 py-2 pl-3 text-[14px] font-medium",
            light ? "bg-white/5 text-white" : "bg-brand-50 text-ink-900",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-5">
        <SubmitButton label={submitLabel} />
      </div>

      <p className={cn("mt-3.5 text-[12.5px] leading-relaxed", light ? "text-white/50" : "text-ink-500")}>
        We use your number to respond to this request only. No marketing texts, no list sharing. See
        our{" "}
        <a
          href="/privacy"
          className={cn("underline underline-offset-2", light ? "text-white/70" : "text-ink-700")}
        >
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
