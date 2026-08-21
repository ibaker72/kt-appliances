import type { AppointmentPurposeId } from "@/lib/appointments/purposes";
import type { ApplianceCategory } from "@/lib/inventory/types";

/**
 * The wire format between the assistant server and the chat panel.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE
 * ---------------------------------------------------------------------------
 * The server returns *typed items*, never markup and never free-form text the
 * client has to parse. Every visible thing in the panel is one of the members of
 * `ChatItem` below, rendered by a component that knows its shape. Nothing the
 * language model produces is ever interpreted as HTML, as a link, or as a
 * command — the model can only fill the `text` of a message and choose from
 * actions the server already decided were available.
 *
 * That is what makes the AI layer optional rather than load-bearing: the
 * structured flows emit the same items with no model involved, so the panel
 * behaves identically whether or not a provider key is configured.
 *
 * Pure module — imported by both the route handler and the client components.
 */

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The public projection of an appliance.
 *
 * Built by explicit field selection in `inventory-tools.ts`, never by spreading
 * a row. Cost, margin, supplier, internal notes and draft state have no
 * representation here at all, so a future column on `appliances` cannot leak
 * into a chat response by being added.
 */
export interface ChatProduct {
  id: string;
  slug: string;
  href: string;
  title: string;
  brand: string;
  modelNumber: string | null;
  category: ApplianceCategory;
  categoryLabel: string;
  /** Whole US dollars. */
  price: number;
  priceLabel: string;
  /** Verified comparison price, or null. Never invented. */
  compareAtPriceLabel: string | null;
  conditionLabel: string;
  /** "Available" / "Reserved" / "Sold" — the label the listing itself shows. */
  statusLabel: string;
  /** True only when the unit is genuinely purchasable right now. */
  available: boolean;
  imageUrl: string | null;
  imageAlt: string;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/** Lead-capture flows the panel can open. Each maps to a real inquiry type. */
export const CHAT_LEAD_FLOWS = [
  "delivery-quote",
  "availability-check",
  "financing",
  "callback",
] as const;

export type ChatLeadFlow = (typeof CHAT_LEAD_FLOWS)[number];

/**
 * A button in the panel.
 *
 * Every member does something real: `step` asks the server for the next set of
 * items, `link` navigates, `call`/`text` open the handset, `lead` and
 * `appointment` open a validated form. There is no "display only" member, by
 * design — a button that looks live and does nothing is the failure mode this
 * union exists to make impossible.
 */
export type ChatAction =
  | { kind: "step"; id: string; label: string; emoji?: string; step: string }
  | { kind: "link"; id: string; label: string; emoji?: string; href: string }
  | { kind: "call"; id: string; label: string; emoji?: string }
  | { kind: "text"; id: string; label: string; emoji?: string; message?: string }
  | { kind: "lead"; id: string; label: string; emoji?: string; flow: ChatLeadFlow }
  | {
      kind: "appointment";
      id: string;
      label: string;
      emoji?: string;
      purpose?: AppointmentPurposeId;
    };

/* -------------------------------------------------------------------------- */
/* Transcript items                                                            */
/* -------------------------------------------------------------------------- */

export interface ChatBrowseLink {
  label: string;
  href: string;
}

/** Everything the panel can render, and everything the server can return. */
export type ChatItem =
  | { type: "user_message"; id: string; text: string }
  | { type: "assistant_message"; id: string; text: string; tone?: "default" | "warning" }
  | { type: "quick_actions"; id: string; label?: string; actions: ChatAction[] }
  | {
      type: "inventory_results";
      id: string;
      products: ChatProduct[];
      /** "View all 14 refrigerators" — omitted when there is nothing more to see. */
      browse: ChatBrowseLink | null;
      /** True when the results come from the local sample catalogue. */
      isDemo: boolean;
    }
  | {
      type: "appointment_form";
      id: string;
      purpose: AppointmentPurposeId;
      /** Attached automatically when the visitor is on a listing. */
      appliance: ChatProduct | null;
    }
  | {
      type: "appointment_confirmation";
      id: string;
      name: string;
      whenLabel: string;
      purposeLabel: string;
      applianceLabel: string | null;
      /** Claimed only when a text was actually sent. */
      smsConfirmationSent: boolean;
      maskedPhone: string;
    }
  | {
      type: "lead_form";
      id: string;
      flow: ChatLeadFlow;
      appliance: ChatProduct | null;
    }
  | { type: "lead_confirmation"; id: string; flow: ChatLeadFlow; text: string }
  | { type: "human_handoff"; id: string; text: string };

/** What the server sends back. */
export interface ChatResponse {
  items: ChatItem[];
  /** True when the reply was composed by the optional AI layer. */
  ai: boolean;
}

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Accumulated answers from the "find an appliance" flow.
 *
 * Held by the client and resent, so the server stays stateless — there is no
 * conversation to expire, resume or garbage-collect, and a reload simply starts
 * over. Every field is re-validated server-side on arrival; nothing here is
 * trusted to be a real category or a sane price.
 */
export interface ChatSearchFilters {
  category?: ApplianceCategory;
  /** One of the "what matters most" answers. */
  preference?: string;
  maxPrice?: number;
  brand?: string;
  /** Free text, when the visitor typed rather than tapped. */
  query?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}
