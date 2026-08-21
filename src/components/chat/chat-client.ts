"use client";

import { getAttribution, inferredSource } from "@/lib/analytics/attribution";
import type { ChatAttribution } from "@/app/actions/chat";
import { siteConfig } from "@/lib/site-config";
import type { ChatItem, ChatSearchFilters, ChatTurn } from "@/lib/chat/types";

/**
 * Talking to `/api/chat`.
 *
 * One function, one failure mode. Every network problem — offline, a 500, a
 * timeout, a body that is not the shape we expect — returns the same offline
 * items: a sentence that does not blame the visitor, and buttons that still
 * work, because `call` and `text` are `tel:`/`sms:` hrefs and need no server at
 * all.
 */

export interface ChatReply {
  items: ChatItem[];
  ai: boolean;
  /** Whether the server will accept typed questions. */
  freeText: boolean;
}

export type ChatRequestBody =
  | { kind: "greeting"; pathname: string }
  | { kind: "step"; step: string; pathname: string; filters?: ChatSearchFilters }
  | { kind: "message"; message: string; pathname: string; history: ChatTurn[] };

/** A shopper watching a typing dot gives up long before fetch would. */
const TIMEOUT_MS = 25_000;

let offlineCounter = 0;

function offlineItems(): ChatItem[] {
  offlineCounter += 1;
  const suffix = `${Date.now().toString(36)}-${offlineCounter}`;
  return [
    {
      type: "assistant_message",
      id: `offline-${suffix}`,
      text: `I can't reach our system right now. You can still browse inventory, or call or text ${siteConfig.phone.display} and we'll help you straight away.`,
      tone: "warning",
    },
    {
      type: "quick_actions",
      id: `offline-actions-${suffix}`,
      actions: [
        { kind: "call", id: `offline-call-${suffix}`, label: `Call ${siteConfig.phone.display}`, emoji: "☎️" },
        { kind: "text", id: `offline-text-${suffix}`, label: "Text the store", emoji: "📱" },
        { kind: "link", id: `offline-browse-${suffix}`, label: "Browse inventory", emoji: "🏬", href: "/inventory" },
      ],
    },
  ];
}

function isChatItemArray(value: unknown): value is ChatItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { type?: unknown }).type === "string" &&
        typeof (entry as { id?: unknown }).id === "string",
    )
  );
}

export async function askAssistant(body: ChatRequestBody): Promise<ChatReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data: unknown = await response.json();
    const items = (data as { items?: unknown }).items;

    // A 4xx/5xx from the route still carries usable items — it is built to.
    // Anything that is not the shape we expect falls back rather than rendering
    // whatever arrived.
    if (!isChatItemArray(items) || items.length === 0) {
      return { items: offlineItems(), ai: false, freeText: false };
    }

    return {
      items,
      ai: (data as { ai?: unknown }).ai === true,
      freeText: (data as { freeText?: unknown }).freeText === true,
    };
  } catch {
    return { items: offlineItems(), ai: false, freeText: false };
  } finally {
    clearTimeout(timer);
  }
}

/** The attribution snapshot every chat conversion carries, in the site's own shape. */
export function chatAttribution(): ChatAttribution {
  const attribution = getAttribution();
  return {
    source: inferredSource(attribution),
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    utmContent: attribution.utmContent,
    utmTerm: attribution.utmTerm,
    landingPage: attribution.landingPage,
    referrer: attribution.referrer,
  };
}

/**
 * Per-submission idempotency key.
 *
 * The client half of duplicate protection: a double-tap, a retried action or a
 * flaky connection all carry the same token, and a unique index in Postgres
 * collapses them onto one appointment. Matches `AppointmentForm`.
 */
export function newSubmissionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The last few turns, for an open-ended follow-up question.
 *
 * Only what was actually said, capped, and only ever advisory — the server
 * re-validates it and fences it as untrusted before it reaches a model.
 */
export function transcriptFrom(items: ChatItem[], limit = 6): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const item of items) {
    if (item.type === "user_message") turns.push({ role: "user", text: item.text });
    else if (item.type === "assistant_message") turns.push({ role: "assistant", text: item.text });
  }
  return turns.slice(-limit).map((turn) => ({ ...turn, text: turn.text.slice(0, 800) }));
}
