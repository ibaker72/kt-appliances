"use client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { siteConfig, smsHref, telHref } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import type { ChatAction } from "@/lib/chat/types";

/**
 * The buttons.
 *
 * Real `<button>` and `<a>` elements — never a clickable `<div>` — so keyboard
 * activation, focus rings and screen-reader semantics come from the platform
 * rather than being reimplemented badly. `call` and `text` are anchors because
 * they navigate to `tel:`/`sms:`; everything else is a button because it acts on
 * the page.
 *
 * Every kind in `ChatAction` does something. There is no decorative member and
 * no default case that silently swallows an unknown one — an action the panel
 * cannot perform simply is not rendered, which is the only honest way to fail.
 */

interface QuickActionsProps {
  label?: string;
  actions: ChatAction[];
  /** Runs a server step. */
  onStep: (step: string, label: string) => void;
  onAppointment: (purpose: string | undefined, label: string) => void;
  onLead: (flow: string, label: string) => void;
  /** Closes the panel when a link navigates away. */
  onNavigate: () => void;
  disabled?: boolean;
  /** Page context for analytics. Never anything the visitor typed. */
  context: string;
}

const buttonBase =
  "inline-flex w-full items-center gap-2 rounded-sm border border-ink-200 bg-white px-3 py-2.5 text-left " +
  "text-[14px] font-semibold text-ink-900 shadow-card transition-colors " +
  "hover:border-ink-900 hover:bg-bone-50 disabled:opacity-55 disabled:pointer-events-none";

const primaryBase =
  "inline-flex w-full items-center gap-2 rounded-sm border border-brand-500 bg-brand-500 px-3 py-2.5 text-left " +
  "text-[14px] font-semibold text-white shadow-card transition-colors " +
  "hover:border-brand-600 hover:bg-brand-600 disabled:opacity-55 disabled:pointer-events-none";

function Emoji({ value }: { value?: string }) {
  if (!value) return null;
  // Decorative: the label already says what the button does, so a screen reader
  // announcing "telephone receiver" adds nothing but noise.
  return (
    <span aria-hidden className="text-[15px] leading-none">
      {value}
    </span>
  );
}

export function QuickActions({
  label,
  actions,
  onStep,
  onAppointment,
  onLead,
  onNavigate,
  disabled,
  context,
}: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-2">
      {label ? (
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-500">
          {label}
        </p>
      ) : null}
      {/* `grid-cols-1` for the same reason as the transcript grid: a bare auto
          track cannot shrink below a long button label's min-content. */}
      <div className="grid grid-cols-1 gap-1.5">
        {actions.map((action) => {
          switch (action.kind) {
            case "call":
              return (
                <a
                  key={action.id}
                  href={telHref}
                  className={cn(primaryBase)}
                  onClick={() => {
                    track(ANALYTICS_EVENTS.chatCallClicked, { context });
                    track(ANALYTICS_EVENTS.phoneClick, { context: "chat" });
                  }}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </a>
              );

            case "text":
              return (
                <a
                  key={action.id}
                  href={smsHref(action.message)}
                  className={cn(buttonBase)}
                  onClick={() => {
                    track(ANALYTICS_EVENTS.chatTextClicked, {
                      context,
                      has_message: Boolean(action.message),
                    });
                    track(ANALYTICS_EVENTS.smsClick, { context: "chat" });
                  }}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </a>
              );

            case "link":
              return (
                <a
                  key={action.id}
                  href={action.href}
                  className={cn(buttonBase)}
                  onClick={() => {
                    track(ANALYTICS_EVENTS.chatQuickActionClicked, {
                      context,
                      action: "link",
                      // The destination, not the visitor's words.
                      destination: action.href,
                    });
                    if (action.href.startsWith("/financing")) {
                      track(ANALYTICS_EVENTS.chatFinancingClicked, { context });
                    }
                    onNavigate();
                  }}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </a>
              );

            case "appointment":
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={disabled}
                  className={cn(buttonBase)}
                  onClick={() => onAppointment(action.purpose, action.label)}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </button>
              );

            case "lead":
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={disabled}
                  className={cn(buttonBase)}
                  onClick={() => onLead(action.flow, action.label)}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </button>
              );

            case "step":
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={disabled}
                  className={cn(buttonBase)}
                  onClick={() => onStep(action.step, action.label)}
                >
                  <Emoji value={action.emoji} />
                  {action.label}
                </button>
              );
          }
        })}
      </div>
    </div>
  );
}

/** Shown under a confirmation. Static, because the conversation is finished. */
export function ConfirmationActions({
  applianceHref,
  onClose,
  context,
}: {
  applianceHref?: string | null;
  onClose: () => void;
  context: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-1.5">
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonBase}
        onClick={() => track(ANALYTICS_EVENTS.directionsClick, { context: "chat" })}
      >
        <Emoji value="📍" />
        Get directions
      </a>
      <a
        href={telHref}
        className={buttonBase}
        onClick={() => {
          track(ANALYTICS_EVENTS.chatCallClicked, { context });
          track(ANALYTICS_EVENTS.phoneClick, { context: "chat" });
        }}
      >
        <Emoji value="☎️" />
        Call {siteConfig.phone.display}
      </a>
      <a
        href={smsHref(`Hi ${siteConfig.name}, I just booked an appointment on your website.`)}
        className={buttonBase}
        onClick={() => {
          track(ANALYTICS_EVENTS.chatTextClicked, { context });
          track(ANALYTICS_EVENTS.smsClick, { context: "chat" });
        }}
      >
        <Emoji value="📱" />
        Text {siteConfig.name}
      </a>
      {applianceHref ? (
        <a href={applianceHref} className={buttonBase} onClick={onClose}>
          <Emoji value="🏬" />
          Back to the appliance
        </a>
      ) : null}
      <button type="button" className={buttonBase} onClick={onClose}>
        <Emoji value="🛒" />
        Continue shopping
      </button>
    </div>
  );
}
