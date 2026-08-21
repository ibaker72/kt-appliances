"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { assistantSuppressed, describePageContext } from "@/lib/chat/context";
import { ChatLauncher } from "./chat-launcher";

/**
 * The assistant, mounted once for the whole public site.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PANEL IS LAZY
 * ---------------------------------------------------------------------------
 * This is a storefront judged on Core Web Vitals, and a chat widget is the
 * classic way to lose that: a bundle every visitor downloads for a feature most
 * of them never open. So the launcher is a button and a string, and `lazy()`
 * keeps the panel — with its forms, product cards and availability fetching — in
 * a separate chunk that is requested on the first click. Nothing about the
 * closed state hydrates anything else, and the launcher is `fixed`, so it
 * reserves no layout and cannot shift the page.
 *
 * ---------------------------------------------------------------------------
 * WHY IT READS THE PATHNAME RATHER THAN TAKING PROPS
 * ---------------------------------------------------------------------------
 * The assistant lives in the site layout, which does not know what the page
 * below it is rendering. It could be given an appliance from each product page,
 * but a component that is *told* which appliance it is looking at is a component
 * that can be told the wrong one — and the brief is explicit that client-supplied
 * product data must never be authoritative. The pathname is not a claim: it is
 * the URL the visitor is already on. The server derives the context from it and
 * re-reads the appliance from the database, so the price and status the panel
 * states are the ones the listing would print this second. That also means every
 * page gets context for free, including ones added later.
 */

const ChatPanel = lazy(() =>
  import("./chat-panel").then((module) => ({ default: module.ChatPanel })),
);

/** One nudge per browser session, and only after the visitor has settled. */
const TEASER_KEY = "kt_chat_nudged";
const TEASER_DELAY_MS = 12_000;

export function ApplianceAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const viewTracked = useRef(false);

  const suppressed = assistantSuppressed(pathname);
  const context = describePageContext(pathname);

  useEffect(() => {
    if (suppressed || viewTracked.current) return;
    viewTracked.current = true;
    track(ANALYTICS_EVENTS.chatLauncherViewed, { page: context.kind });
  }, [suppressed, context.kind]);

  /**
   * The nudge.
   *
   * Never an auto-open — that is the single most disliked behaviour a chat
   * widget has. A small line appears once per session after twelve seconds, is
   * dismissible, is skipped entirely for anyone who has asked for reduced
   * motion, and is skipped on a phone where it would sit over the content.
   */
  useEffect(() => {
    if (suppressed || open) return;
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;

    try {
      if (window.sessionStorage.getItem(TEASER_KEY) === "1") return;
    } catch {
      // Private browsing. Better to skip the nudge than to repeat it every page.
      return;
    }

    const timer = window.setTimeout(() => {
      setTeaser(teaserFor(context.kind));
      try {
        window.sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        /* best effort */
      }
    }, TEASER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [suppressed, open, context.kind]);

  const toggle = useCallback(() => {
    setTeaser(null);
    setOpen((current) => {
      if (!current) {
        track(ANALYTICS_EVENTS.chatOpened, { page: context.kind });
        try {
          window.sessionStorage.setItem(TEASER_KEY, "1");
        } catch {
          /* best effort */
        }
      }
      return !current;
    });
  }, [context.kind]);

  const close = useCallback(() => setOpen(false), []);

  if (suppressed) return null;

  return (
    <>
      <ChatLauncher
        ref={launcherRef}
        open={open}
        onToggle={toggle}
        teaser={teaser}
        onDismissTeaser={() => setTeaser(null)}
      />

      {open ? (
        // No fallback UI: the chunk is small and local, and a skeleton that
        // flashes for 40ms is worse than the panel simply appearing.
        <Suspense fallback={null}>
          <ChatPanel pathname={pathname} onClose={close} launcherRef={launcherRef} />
        </Suspense>
      ) : null}
    </>
  );
}

/** One line, matched to the page. Short enough to read without stopping. */
function teaserFor(kind: ReturnType<typeof describePageContext>["kind"]): string {
  switch (kind) {
    case "appliance":
      return "Questions about this one? I can check it or book you a time to see it.";
    case "category":
    case "inventory":
      return "Looking for something specific? I can search what's on the floor.";
    case "delivery":
      return "Want a delivery price for your ZIP? I can start that.";
    case "financing":
      return "Financing question? I can point you the right way.";
    default:
      return "Looking for an appliance? I can help.";
  }
}
