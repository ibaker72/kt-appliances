import "server-only";

import {
  APPOINTMENT_PURPOSES,
  appointmentPurposeLabel,
  isAppointmentPurposeId,
  type AppointmentPurposeId,
} from "@/lib/appointments/purposes";
import { isApplianceCategory, type ApplianceCategory } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";
import { answerFreeText, isAiConfigured } from "./ai";
import { describePageContext, greetingFor, type PageContext } from "./context";
import {
  CHAT_BUDGET_BANDS,
  CHAT_PREFERENCES,
  applianceLabelFor,
  budgetBand,
  getChatAppliance,
  getChatCategories,
  searchChatInventory,
} from "./inventory-tools";
import { DELIVERY_ANSWER, FINANCING_ANSWER, TEXT_TEMPLATES, getStoreInfo } from "./store-info";
import type { ChatRequest } from "./schema";
import {
  CHAT_LEAD_FLOWS,
  type ChatAction,
  type ChatItem,
  type ChatProduct,
  type ChatResponse,
  type ChatSearchFilters,
} from "./types";

/**
 * The assistant.
 *
 * ---------------------------------------------------------------------------
 * STRUCTURE FIRST, MODEL SECOND
 * ---------------------------------------------------------------------------
 * Everything a shopper can accomplish here happens in this file, deterministically,
 * with no model involved: finding an appliance, checking whether a unit is
 * listed, opening a booking, capturing a delivery or financing lead, and
 * reaching a person. `answerFreeText` is consulted for exactly one request kind
 * — a typed question — and when it returns nothing the visitor still gets a
 * useful answer and a working set of buttons.
 *
 * That ordering is a deployment property, not a preference: this is a lead-
 * generation storefront, and an unconfigured or rate-limited AI provider must
 * not be able to take the conversion path down with it.
 *
 * ---------------------------------------------------------------------------
 * STATELESS
 * ---------------------------------------------------------------------------
 * There is no conversation on the server. A step carries the filters gathered so
 * far, the client replays them, and every one is re-validated here against the
 * real catalogues. A reload starts over, nothing expires, and there is no
 * session store to secure.
 */

let counter = 0;

/** Ids only need to be unique within a response — React keys, not identifiers. */
function id(prefix: string): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/* -------------------------------------------------------------------------- */
/* Reusable actions                                                            */
/* -------------------------------------------------------------------------- */

const callAction = (label = `Call ${siteConfig.phone.display}`): ChatAction => ({
  kind: "call",
  id: id("call"),
  label,
  emoji: "☎️",
});

const textAction = (message: string, label = "Text the store"): ChatAction => ({
  kind: "text",
  id: id("text"),
  label,
  emoji: "📱",
  message,
});

const stepAction = (step: string, label: string, emoji?: string): ChatAction => ({
  kind: "step",
  id: id("step"),
  label,
  emoji,
  step,
});

const linkAction = (href: string, label: string, emoji?: string): ChatAction => ({
  kind: "link",
  id: id("link"),
  label,
  emoji,
  href,
});

const appointmentAction = (
  label: string,
  purpose?: AppointmentPurposeId,
  emoji = "📅",
): ChatAction => ({
  kind: "appointment",
  id: id("appt"),
  label,
  emoji,
  purpose,
});

const leadAction = (
  flow: (typeof CHAT_LEAD_FLOWS)[number],
  label: string,
  emoji?: string,
): ChatAction => ({
  kind: "lead",
  id: id("lead"),
  label,
  emoji,
  flow,
});

function message(text: string, tone?: "default" | "warning"): ChatItem {
  return { type: "assistant_message", id: id("msg"), text, tone };
}

function actions(list: ChatAction[], label?: string): ChatItem {
  return { type: "quick_actions", id: id("acts"), label, actions: list };
}

/**
 * The escape hatch, offered everywhere it could matter.
 *
 * The rule this encodes: the assistant must never be the only way forward. Any
 * point at which it cannot answer, or a shopper simply wants a person, ends with
 * a phone number and a text button that work.
 */
function contactActions(textMessage: string = TEXT_TEMPLATES.general): ChatAction[] {
  return [callAction(), textAction(textMessage)];
}

/* -------------------------------------------------------------------------- */
/* Root menu                                                                   */
/* -------------------------------------------------------------------------- */

function rootActions(context: PageContext, appliance: ChatProduct | null): ChatAction[] {
  const list: ChatAction[] = [];

  // On a listing, the two things worth doing come first and carry this unit.
  if (appliance) {
    list.push(stepAction("availability", "Is this still available?", "📦"));
    list.push(appointmentAction("Schedule a time to see it", "view-appliance"));
  }

  list.push(stepAction("find", "Find an appliance", "🔍"));
  if (!appliance) list.push(stepAction("availability", "Check availability", "📦"));
  if (!appliance) list.push(appointmentAction("Make an appointment"));
  list.push(stepAction("delivery", "Delivery question", "🚚"));
  list.push(stepAction("financing", "Financing", "💳"));
  list.push(
    textAction(
      appliance ? TEXT_TEMPLATES.appliance(applianceLabelFor(appliance)) : TEXT_TEMPLATES.general,
    ),
  );
  list.push(callAction());

  return list;
}

/* -------------------------------------------------------------------------- */
/* Context resolution                                                          */
/* -------------------------------------------------------------------------- */

interface ResolvedContext {
  context: PageContext;
  /** Re-read from the database, never taken from the client. */
  appliance: ChatProduct | null;
}

async function resolveContext(pathname: string): Promise<ResolvedContext> {
  const context = describePageContext(pathname);
  if (context.kind !== "appliance" || !context.applianceSlug) {
    return { context, appliance: null };
  }

  const resolved = await getChatAppliance({ slug: context.applianceSlug });
  return { context, appliance: resolved?.product ?? null };
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

/** Validates the filters a client replayed against the real catalogues. */
function sanitizeFilters(raw: ChatSearchFilters | undefined): ChatSearchFilters {
  if (!raw) return {};
  return {
    category:
      raw.category && isApplianceCategory(raw.category)
        ? (raw.category as ApplianceCategory)
        : undefined,
    preference: CHAT_PREFERENCES.some((entry) => entry.id === raw.preference)
      ? raw.preference
      : undefined,
    maxPrice:
      typeof raw.maxPrice === "number" && Number.isFinite(raw.maxPrice) && raw.maxPrice > 0
        ? Math.round(raw.maxPrice)
        : undefined,
    brand: raw.brand?.trim().slice(0, 60) || undefined,
    query: raw.query?.trim().slice(0, 80) || undefined,
  };
}

async function findStart(): Promise<ChatItem[]> {
  const categories = await getChatCategories();

  if (categories.length === 0) {
    return [
      message(
        "The catalogue is not loading right now, so I can't search it. The warehouse can tell you what's on the floor.",
        "warning",
      ),
      actions(contactActions()),
    ];
  }

  return [
    message("What type of appliance are you looking for?"),
    actions(
      categories.map((category) =>
        stepAction(`find:cat:${category.slug}`, category.label),
      ),
    ),
  ];
}

function findPreference(): ChatItem[] {
  return [
    message("Got it. What matters most?"),
    actions(CHAT_PREFERENCES.map((entry) => stepAction(`find:pref:${entry.id}`, entry.label))),
  ];
}

function findBudget(): ChatItem[] {
  return [
    message("What budget are you trying to stay under?"),
    actions(CHAT_BUDGET_BANDS.map((band) => stepAction(`find:budget:${band.id}`, band.label))),
  ];
}

/**
 * Runs the search and renders the outcome.
 *
 * Three genuinely different endings, and none of them fabricates a unit: results,
 * an honest empty state with real next steps, and a failed lookup that says so.
 */
async function runSearch(
  filters: ChatSearchFilters,
  appliance: ChatProduct | null,
): Promise<ChatItem[]> {
  const result = await searchChatInventory(filters);

  if (result.failed) {
    return [
      message(
        "I couldn't load inventory just now. The store can confirm what's available for you.",
        "warning",
      ),
      actions([...contactActions(), linkAction("/inventory", "Browse inventory", "🏬")]),
    ];
  }

  if (result.products.length === 0) {
    return [
      message(
        `I don't see an exact match on the floor right now, but ${siteConfig.name} may still be able to help — stock turns over quickly.`,
      ),
      actions([
        textAction(TEXT_TEMPLATES.general, "Text the store"),
        appointmentAction("Make an appointment"),
        leadAction("callback", "Leave your number", "📞"),
        linkAction("/inventory", "Browse everything", "🏬"),
      ]),
    ];
  }

  const items: ChatItem[] = [
    message(
      result.total > result.products.length
        ? `Here ${result.products.length === 1 ? "is one" : `are ${result.products.length}`} of ${result.total} matches on the floor right now.`
        : `Here ${result.products.length === 1 ? "is the match" : `are the ${result.products.length} matches`} on the floor right now.`,
    ),
    {
      type: "inventory_results",
      id: id("results"),
      products: result.products,
      browse:
        result.browseHref && result.browseLabel
          ? { href: result.browseHref, label: result.browseLabel }
          : null,
      isDemo: result.isDemo,
    },
    actions(
      [
        appointmentAction("Book a time to see one"),
        leadAction("availability-check", "Have us confirm one before I drive over", "✅"),
        textAction(TEXT_TEMPLATES.general),
        stepAction("find", "Search again", "🔍"),
      ],
      "What next?",
    ),
  ];

  if (appliance) {
    // Keep the unit they were already looking at reachable — they came from it.
    items.splice(2, 0, message(`Still want the ${applianceLabelFor(appliance)}? It's just above.`));
  }

  return items;
}

/**
 * "Check availability".
 *
 * The wording is the point. The database says what is *listed*; it does not hold
 * anything for anyone, and this application has no reservation system. So the
 * answer is always "currently listed as available", never "it's yours" — and the
 * next step offered is having the warehouse confirm it before a wasted drive.
 */
function availabilityForAppliance(appliance: ChatProduct): ChatItem[] {
  const label = applianceLabelFor(appliance);

  if (!appliance.available) {
    return [
      message(
        `The ${label} is currently listed as ${appliance.statusLabel.toLowerCase()}, so I can't promise it. We often have something close.`,
      ),
      actions([
        stepAction("find", "Find something similar", "🔍"),
        textAction(TEXT_TEMPLATES.availability(label), "Ask the store about it"),
        callAction(),
      ]),
    ];
  }

  return [
    message(
      `The ${label} is currently listed as available at ${appliance.priceLabel}. That's what our system shows — it isn't a hold.`,
    ),
    message("Want us to confirm it before you make the trip?"),
    actions([
      leadAction("availability-check", "Yes, text me to confirm", "✅"),
      appointmentAction("Make an appointment", "view-appliance"),
      callAction(),
      textAction(TEXT_TEMPLATES.availability(label)),
    ]),
  ];
}

function availabilityStart(): ChatItem[] {
  return [
    message("Happy to check. Which appliance do you mean?"),
    actions([
      stepAction("find", "Search inventory", "🔍"),
      linkAction("/inventory", "Browse everything", "🏬"),
      textAction(TEXT_TEMPLATES.general, "Text the store the model"),
      callAction(),
    ]),
  ];
}

function appointmentMenu(appliance: ChatProduct | null): ChatItem[] {
  const purposeActions = APPOINTMENT_PURPOSES.map((purpose) =>
    appointmentAction(
      appointmentPurposeLabel(purpose, Boolean(appliance) && purpose.id === "view-appliance"),
      purpose.id,
      undefined,
    ),
  );

  // On a listing, "see this appliance" leads — the shopper should never have to
  // search for the unit they are already looking at.
  if (appliance) {
    const index = purposeActions.findIndex((action) => action.kind === "appointment" && action.purpose === "view-appliance");
    if (index > 0) purposeActions.unshift(...purposeActions.splice(index, 1));
  }

  return [
    message("Absolutely. What would you like to schedule?"),
    actions(purposeActions),
  ];
}

function deliveryStep(appliance: ChatProduct | null): ChatItem[] {
  return [
    message(DELIVERY_ANSWER),
    actions([
      leadAction("delivery-quote", "Get a delivery quote", "🚚"),
      appointmentAction("Talk it through in person", "delivery-consult"),
      textAction(TEXT_TEMPLATES.delivery),
      linkAction("/delivery-installation", "Delivery details", "📄"),
      ...(appliance ? [linkAction(appliance.href, "Back to this appliance")] : []),
    ]),
  ];
}

function financingStep(): ChatItem[] {
  return [
    message(FINANCING_ANSWER),
    actions([
      linkAction("/financing", "View financing", "💳"),
      appointmentAction("Book a financing chat", "financing"),
      leadAction("financing", "Have someone call me", "📞"),
      textAction(TEXT_TEMPLATES.financing),
    ]),
  ];
}

function storeStep(): ChatItem[] {
  const store = getStoreInfo();
  return [
    message(
      `We're at ${store.address}. Walk-in hours are ${store.hours.walkIn}, and evening visits are by appointment.`,
    ),
    actions([
      linkAction("/contact", "Hours & directions", "📍"),
      appointmentAction("Book a visit", "warehouse-visit"),
      callAction(),
      textAction(TEXT_TEMPLATES.general),
    ]),
  ];
}

function handoffStep(appliance: ChatProduct | null): ChatItem[] {
  return [
    {
      type: "human_handoff",
      id: id("handoff"),
      text: `Easiest thing is to talk to us directly — ${siteConfig.phone.display}, open daily ${siteConfig.hours.regular.label}.`,
    },
    actions([
      callAction(),
      textAction(
        appliance ? TEXT_TEMPLATES.appliance(applianceLabelFor(appliance)) : TEXT_TEMPLATES.general,
      ),
      leadAction("callback", "Leave your number instead", "📝"),
    ]),
  ];
}

/* -------------------------------------------------------------------------- */
/* Router                                                                      */
/* -------------------------------------------------------------------------- */

async function handleStep(
  step: string,
  filters: ChatSearchFilters,
  resolved: ResolvedContext,
): Promise<ChatItem[]> {
  const [head, key, value] = step.split(":");
  const { appliance } = resolved;

  switch (head) {
    case "find": {
      if (key === "cat") {
        // The leaf is validated against the real category list, so a made-up
        // segment falls back to asking rather than reaching the database.
        if (!value || !isApplianceCategory(value)) return findStart();
        return findPreference();
      }
      if (key === "pref") return findBudget();
      if (key === "budget") {
        const band = value ? budgetBand(value) : null;
        return runSearch({ ...filters, maxPrice: band?.maxPrice }, appliance);
      }
      return findStart();
    }

    case "results":
      return runSearch(filters, appliance);

    case "availability":
      return appliance ? availabilityForAppliance(appliance) : availabilityStart();

    case "appointment":
      return appointmentMenu(appliance);

    case "appt": {
      const purpose: AppointmentPurposeId =
        key && isAppointmentPurposeId(key) ? key : "warehouse-visit";
      return [
        {
          type: "appointment_form",
          id: id("appt-form"),
          purpose,
          // Attached automatically, and only when it is a real, resolved unit.
          appliance: purpose === "view-appliance" ? appliance : null,
        },
      ];
    }

    case "lead": {
      const flow = CHAT_LEAD_FLOWS.find((entry) => entry === key);
      if (!flow) return handoffStep(appliance);
      return [{ type: "lead_form", id: id("lead-form"), flow, appliance }];
    }

    case "delivery":
      return deliveryStep(appliance);

    case "financing":
      return financingStep();

    case "store":
      return storeStep();

    case "human":
      return handoffStep(appliance);

    case "root":
    default:
      return [
        message(greetingFor(resolved.context, appliance ? applianceLabelFor(appliance) : null)),
        actions(rootActions(resolved.context, appliance)),
      ];
  }
}

/**
 * A typed question.
 *
 * With no AI provider configured this is not reachable — the panel hides the
 * input entirely rather than accepting text it cannot answer. It stays handled
 * here anyway, because "the endpoint is public" means a request can arrive
 * whether or not a button exists for it.
 */
async function handleMessage(
  text: string,
  history: Array<{ role: "user" | "assistant"; text: string }>,
  resolved: ResolvedContext,
): Promise<{ items: ChatItem[]; ai: boolean }> {
  const { appliance, context } = resolved;

  const fallback = (): ChatItem[] => [
    message(
      "I can't answer that one, but I can search inventory, book a time, or put you straight through to the warehouse.",
      "warning",
    ),
    actions(rootActions(context, appliance)),
  ];

  if (!isAiConfigured()) return { items: fallback(), ai: false };

  const answer = await answerFreeText({
    message: text,
    history,
    appliance,
    categoryLabel: context.categorySlug ?? null,
  });

  if (!answer) return { items: fallback(), ai: false };

  const items: ChatItem[] = [message(answer.text)];

  if (answer.products.length > 0) {
    items.push({
      type: "inventory_results",
      id: id("results"),
      products: answer.products,
      browse: answer.browse,
      isDemo: false,
    });
  }

  // Every answer ends somewhere useful. The follow-ups are chosen by the server
  // from what actually happened, not by the model.
  const follow: ChatAction[] = [];
  if (answer.products.length > 0) {
    follow.push(appointmentAction("Book a time to see one"));
    follow.push(leadAction("availability-check", "Confirm one for me", "✅"));
  } else if (answer.searchedAndEmpty) {
    follow.push(stepAction("find", "Search another way", "🔍"));
    follow.push(leadAction("callback", "Leave your number", "📝"));
  } else {
    follow.push(stepAction("find", "Find an appliance", "🔍"));
    follow.push(appointmentAction("Make an appointment"));
  }
  follow.push(
    textAction(
      appliance ? TEXT_TEMPLATES.appliance(applianceLabelFor(appliance)) : TEXT_TEMPLATES.general,
    ),
  );
  follow.push(callAction());
  items.push(actions(follow));

  return { items, ai: true };
}

/** The one entry point the route handler calls. */
export async function runAssistant(request: ChatRequest): Promise<ChatResponse> {
  const resolved = await resolveContext(request.pathname);

  if (request.kind === "greeting") {
    return {
      items: [
        message(
          greetingFor(
            resolved.context,
            resolved.appliance ? applianceLabelFor(resolved.appliance) : null,
          ),
        ),
        actions(rootActions(resolved.context, resolved.appliance)),
      ],
      ai: false,
    };
  }

  if (request.kind === "step") {
    const items = await handleStep(
      request.step,
      sanitizeFilters(request.filters),
      resolved,
    );
    return { items, ai: false };
  }

  return handleMessage(request.message, request.history, resolved);
}

/** Whether the panel should offer a free-text box. Read by the route. */
export function freeTextAvailable(): boolean {
  return isAiConfigured();
}
