"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { greetingFor, describePageContext } from "@/lib/chat/context";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/schema";
import type { ChatItem, ChatSearchFilters } from "@/lib/chat/types";
import { isApplianceCategory } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";
import { AppointmentFlow } from "./appointment-flow";
import { askAssistant, transcriptFrom } from "./chat-client";
import { ChatHeader } from "./chat-header";
import { AssistantMessage, HumanHandoff, TypingIndicator, UserMessage } from "./chat-message";
import { ContactFlow } from "./contact-flow";
import { InventoryResults } from "./inventory-results";
import { QuickActions } from "./quick-actions";

/**
 * The panel.
 *
 * ---------------------------------------------------------------------------
 * STATE
 * ---------------------------------------------------------------------------
 * A transcript of `ChatItem`s and the filters gathered so far. That is all. The
 * server is stateless, so a reload starts a fresh conversation and there is
 * nothing to expire — and nothing a visitor typed is written to storage, which
 * is why there is no `localStorage` here at all. What is remembered between
 * pages (that the panel has been opened, so the nudge does not reappear) lives
 * in `sessionStorage` and is a single boolean.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITY
 * ---------------------------------------------------------------------------
 * A labelled dialog with focus moved in on open and returned to the launcher on
 * close, Escape to dismiss, a focus trap across the panel's own controls, and a
 * polite live region so a screen-reader user hears the reply rather than being
 * left in silence. Every control is a real button, link, input or textarea.
 */

const PANEL_WIDTH = "sm:w-[400px]";

interface ChatPanelProps {
  pathname: string;
  onClose: () => void;
  /** Focused again when the panel closes. */
  launcherRef: React.RefObject<HTMLButtonElement | null>;
}

export function ChatPanel({ pathname, onClose, launcherRef }: ChatPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const context = describePageContext(pathname);

  /**
   * Optimistic first paint.
   *
   * The greeting logic is a pure function shared with the server, so the panel
   * opens with the right contextual line immediately rather than showing a
   * blank box — or a generic line that visibly swaps for the real one — while
   * the round trip happens. The server's reply, which knows the actual
   * appliance, replaces this.
   */
  const [items, setItems] = useState<ChatItem[]>(() => [
    { type: "assistant_message", id: "greeting-local", text: greetingFor(context) },
  ]);
  const [filters, setFilters] = useState<ChatSearchFilters>({});
  const [loading, setLoading] = useState(true);
  const [freeText, setFreeText] = useState(false);
  const [draft, setDraft] = useState("");

  const scrollToEnd = useCallback(() => {
    // Two frames: one for React to commit, one for layout to settle after an
    // image or a newly mounted form changes the scroll height.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      });
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Opening                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const reply = await askAssistant({ kind: "greeting", pathname });
      if (cancelled) return;
      setItems(reply.items);
      setFreeText(reply.freeText);
      setLoading(false);
      scrollToEnd();
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately once per mount: the panel unmounts on close, so reopening is
    // a fresh conversation and a pathname change while open should not restart
    // the greeting mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Dialog behaviour                                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Move focus into the dialog without stealing it from the first control a
    // keyboard user would want.
    const first = panel.querySelector<HTMLElement>("button, a[href], input, textarea");
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panel!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Return focus to the launcher, so a keyboard user lands back where they
    // were rather than at the top of the document.
    const launcher = launcherRef.current;
    return () => launcher?.focus();
  }, [launcherRef]);

  useEffect(() => {
    // Lock the page behind the sheet on small screens only. At `sm` and up the
    // panel is a floating card and the page underneath stays usable.
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Talking to the server                                                  */
  /* ---------------------------------------------------------------------- */

  const send = useCallback(
    async (
      body: Parameters<typeof askAssistant>[0],
      echo?: string,
      nextFilters?: ChatSearchFilters,
    ) => {
      setLoading(true);
      if (nextFilters) setFilters(nextFilters);

      if (echo) {
        setItems((current) => [
          ...current,
          { type: "user_message", id: `echo-${Date.now()}-${current.length}`, text: echo },
        ]);
      }
      scrollToEnd();

      const reply = await askAssistant(body);
      setItems((current) => [...current, ...reply.items]);
      setFreeText((current) => reply.freeText || current);
      setLoading(false);
      scrollToEnd();
    },
    [scrollToEnd],
  );

  const onStep = useCallback(
    (step: string, label: string) => {
      track(ANALYTICS_EVENTS.chatQuickActionClicked, { action: step, page: context.kind });

      // The filter the step just answered is recorded here, then replayed with
      // the request — the server holds no conversation of its own.
      const [head, key, value] = step.split(":");
      let next = filters;

      if (head === "find" && key === "cat" && value && isApplianceCategory(value)) {
        next = { ...filters, category: value };
      } else if (head === "find" && key === "pref" && value) {
        next = { ...filters, preference: value };
      } else if (head === "find" && !key) {
        // Starting over clears what was gathered, so a second search is not
        // silently narrowed by the first.
        next = {};
      }

      if (head === "find" && key === "budget") {
        track(ANALYTICS_EVENTS.chatInventorySearch, {
          category: next.category ?? "any",
          preference: next.preference ?? "none",
          budget: value ?? "any",
        });
      }
      if (head === "availability") {
        track(ANALYTICS_EVENTS.chatAvailabilityStarted, { page: context.kind });
      }
      if (head === "financing") track(ANALYTICS_EVENTS.chatFinancingClicked, { page: context.kind });
      if (head === "human") track(ANALYTICS_EVENTS.chatHumanHandoff, { page: context.kind });

      void send({ kind: "step", step, pathname, filters: next }, label, next);
    },
    [filters, pathname, send, context.kind],
  );

  const onAppointment = useCallback(
    (purpose: string | undefined, label: string) => {
      const step = purpose ? `appt:${purpose}` : "appointment";
      track(ANALYTICS_EVENTS.chatQuickActionClicked, { action: step, page: context.kind });
      void send({ kind: "step", step, pathname, filters }, label);
    },
    [filters, pathname, send, context.kind],
  );

  const onLead = useCallback(
    (flow: string, label: string) => {
      track(ANALYTICS_EVENTS.chatQuickActionClicked, { action: `lead:${flow}`, page: context.kind });
      void send({ kind: "step", step: `lead:${flow}`, pathname, filters }, label);
    },
    [filters, pathname, send, context.kind],
  );

  const onSubmitMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft("");
    // Length and content of the question never leave the browser as analytics —
    // only that one was asked.
    track(ANALYTICS_EVENTS.chatMessageSent, { page: context.kind });
    void send(
      {
        kind: "message",
        message: text.slice(0, MAX_MESSAGE_LENGTH),
        pathname,
        history: transcriptFrom(items),
      },
      text,
    );
  }, [draft, loading, items, pathname, send, context.kind]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-white",
        // At `sm` and up it becomes a floating card clear of the viewport edges.
        // Height follows the conversation up to a cap, rather than being pinned:
        // a two-line greeting in a 640px box reads as a broken panel. `min-h-0`
        // on the scroll area below is what lets the flex column shrink to fit.
        "sm:inset-auto sm:bottom-4 sm:right-4 sm:max-h-[min(640px,calc(100dvh-2rem))] sm:rounded-md sm:border sm:border-ink-200 sm:shadow-lift",
        PANEL_WIDTH,
      )}
    >
      <ChatHeader onClose={onClose} titleId={titleId} />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4"
      >
        {/*
          `grid-cols-1`, not a bare `grid`.

          A bare grid gets one `auto` track, whose minimum is the min-content of
          its widest item — so the horizontally scrolling day picker in the
          booking form sizes the whole column to the full width of the day chips
          and every bubble stretches with it. On a 390px phone that measured
          503px of content in a 390px panel: horizontal overflow inside a fixed
          sheet, which is unusable. `grid-cols-1` is `repeat(1, minmax(0, 1fr))`,
          pinning the track minimum at zero so the day row clips and scrolls the
          way it was written to. The browser suite asserts the measurement.
        */}
        <div aria-live="polite" aria-atomic="false" className="grid grid-cols-1 gap-2.5">
          {items.map((item) => {
            switch (item.type) {
              case "user_message":
                return <UserMessage key={item.id} text={item.text} />;

              case "assistant_message":
                return <AssistantMessage key={item.id} text={item.text} tone={item.tone} />;

              case "human_handoff":
                return <HumanHandoff key={item.id} text={item.text} />;

              case "quick_actions":
                return (
                  <QuickActions
                    key={item.id}
                    label={item.label}
                    actions={item.actions}
                    onStep={onStep}
                    onAppointment={onAppointment}
                    onLead={onLead}
                    onNavigate={onClose}
                    disabled={loading}
                    context={context.kind}
                  />
                );

              case "inventory_results":
                return (
                  <InventoryResults
                    key={item.id}
                    products={item.products}
                    browse={item.browse}
                    isDemo={item.isDemo}
                    onNavigate={onClose}
                  />
                );

              case "appointment_form":
                return (
                  <AppointmentFlow
                    key={item.id}
                    purpose={item.purpose}
                    appliance={item.appliance}
                    pathname={pathname}
                    onClose={onClose}
                    onGrew={scrollToEnd}
                  />
                );

              case "lead_form":
                return (
                  <ContactFlow
                    key={item.id}
                    flow={item.flow}
                    appliance={item.appliance}
                    pathname={pathname}
                    onGrew={scrollToEnd}
                  />
                );

              // Confirmations are rendered by the flow that produced them, so
              // they never arrive as standalone transcript items. Listed for
              // exhaustiveness — a new item type is a compile error, not a
              // silently blank bubble.
              case "appointment_confirmation":
              case "lead_confirmation":
                return null;
            }
          })}

          {loading ? <TypingIndicator /> : null}
        </div>
      </div>

      {/*
        The free-text box appears only when the server says it can answer. With
        no AI provider configured there is nothing behind it, and an input that
        replies "I can't answer that" to everything is worse than no input.
      */}
      {freeText ? (
        <div className="border-t border-line bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — the convention
                // people already have from every other chat box.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmitMessage();
                }
              }}
              placeholder="Ask about sizes, brands, anything…"
              className="max-h-24 min-h-[42px] flex-1 resize-none rounded-sm border border-ink-200 px-3 py-2.5 text-[16px] text-ink-950 placeholder:text-ink-400 focus:border-ink-900"
            />
            <button
              type="button"
              onClick={onSubmitMessage}
              disabled={loading || draft.trim().length === 0}
              aria-label="Send question"
              className="grid size-[42px] shrink-0 place-items-center rounded-sm border border-brand-500 bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-45"
            >
              <SendHorizonal aria-hidden className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
