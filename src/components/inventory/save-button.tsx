"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { SAVED_COOKIE, SAVED_LIMIT, parseSaved, serializeSaved } from "@/lib/inventory/saved";
import { cn } from "@/lib/utils";

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function readCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${SAVED_COOKIE}=`))
    ?.slice(SAVED_COOKIE.length + 1);
}

/** Memoised against the raw cookie so the snapshot reference stays stable. */
function getSnapshot(): string[] {
  const raw = document.cookie;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    // decodeURIComponent throws a URIError on a stray "%", and a cookie is
    // attacker- and accident-writable. A malformed one means "nothing saved",
    // not a crashed page.
    try {
      cachedValue = parseSaved(decodeURIComponent(readCookie() ?? ""));
    } catch {
      cachedValue = EMPTY;
    }
  }
  return cachedValue;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Every mounted heart re-reads after a write, so a grid stays consistent. */
function writeSaved(slugs: string[]): void {
  document.cookie = `${SAVED_COOKIE}=${encodeURIComponent(serializeSaved(slugs))}; path=/; max-age=${
    60 * 60 * 24 * 180
  }; samesite=lax`;
  cachedRaw = null;
  for (const listener of listeners) listener();
}

export function useSavedSlugs(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/**
 * Save toggle on a product card.
 *
 * A client island inside an otherwise server-rendered card. Unlike comparison —
 * which is URL state and therefore works with scripting off — a personal list
 * has no meaningful no-JS behaviour that does not either post the whole page or
 * make every listing page dynamic, so this is the one control that needs
 * hydration. It renders unsaved on the server and corrects itself on mount,
 * which is why it carries no server-rendered state to mismatch.
 */
export function SaveButton({ slug, title, className }: { slug: string; title: string; className?: string }) {
  const saved = useSavedSlugs();
  const isSaved = saved.includes(slug);

  const toggle = useCallback(() => {
    const next = isSaved ? saved.filter((entry) => entry !== slug) : [slug, ...saved];
    writeSaved(next.slice(0, SAVED_LIMIT));
  }, [isSaved, saved, slug]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      className={cn(
        "z-10 grid size-8 place-items-center rounded-pill border transition",
        isSaved
          ? "border-brand-500 bg-white text-brand-500"
          : "border-line bg-white/95 text-ink-500 opacity-0 hover:text-ink-900 focus-visible:opacity-100 group-hover:opacity-100",
        className,
      )}
    >
      <Heart
        aria-hidden
        className="size-4"
        strokeWidth={2.5}
        fill={isSaved ? "currentColor" : "none"}
      />
      <span className="sr-only">{isSaved ? `Remove ${title} from saved` : `Save ${title}`}</span>
    </button>
  );
}

/**
 * Clears the whole saved list.
 *
 * Lives with the toggle so both sides of the cookie contract stay in one file.
 * `router.refresh()` re-runs the server page that read the cookie, so the grid
 * empties without a full reload.
 */
export function ClearSavedButton() {
  const router = useRouter();
  const saved = useSavedSlugs();

  if (saved.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        writeSaved([]);
        router.refresh();
      }}
      className="text-ui font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
    >
      Clear saved list
    </button>
  );
}
