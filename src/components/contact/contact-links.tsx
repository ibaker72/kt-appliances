"use client";

import type { ReactNode } from "react";
import { directionsHref, mailtoHref, siteConfig, smsHref, telHref } from "@/lib/site-config";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

interface ContactLinkProps {
  children: ReactNode;
  className?: string;
  /** Where on the site the click happened — shows up in GA4 / Pixel params. */
  context?: string;
  "aria-label"?: string;
}

/** `tel:` link that reports a phone_click conversion. */
export function CallLink({ children, className, context, ...rest }: ContactLinkProps) {
  return (
    <a
      href={telHref}
      className={className}
      onClick={() => track(ANALYTICS_EVENTS.phoneClick, { context, phone: siteConfig.phone.display })}
      {...rest}
    >
      {children}
    </a>
  );
}

interface TextLinkProps extends ContactLinkProps {
  /** Pre-filled SMS body. Keep it short — long bodies get truncated by some clients. */
  message?: string;
}

/** `sms:` link with an optional pre-filled body, reporting an sms_click conversion. */
export function TextLink({ children, className, context, message, ...rest }: TextLinkProps) {
  return (
    <a
      href={smsHref(message)}
      className={className}
      onClick={() => track(ANALYTICS_EVENTS.smsClick, { context, has_message: Boolean(message) })}
      {...rest}
    >
      {children}
    </a>
  );
}

export function EmailLink({ children, className, context, ...rest }: ContactLinkProps) {
  return (
    <a
      href={mailtoHref}
      className={className}
      onClick={() => track(ANALYTICS_EVENTS.emailClick, { context })}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Opens Google Maps directions in a new tab and reports a directions_click. */
export function DirectionsLink({ children, className, context, ...rest }: ContactLinkProps) {
  return (
    <a
      href={directionsHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track(ANALYTICS_EVENTS.directionsClick, { context })}
      {...rest}
    >
      {children}
    </a>
  );
}
