import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { stripUsCountryCode } from "@/lib/sms/phone";

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from arbitrary text. Used for auto-generating appliance slugs. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

/** "3 days ago" style relative time, for recently-sold and admin tables. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * US display format: `(973) 519-9717`.
 *
 * Accepts anything a caller realistically holds — ten digits, E.164
 * (`+15707500622`), eleven digits, or already-punctuated text — because the
 * numbers reaching this function come from three different places: ten-digit
 * columns in the database, E.164 environment values such as
 * `TWILIO_FROM_NUMBER`, and half-typed input from a form field.
 *
 * The country code has to come off BEFORE the ten-digit clamp below, not after.
 * Clamping first keeps `1570750062` and renders `+15707500622` as
 * `(157) 075-0062` — a plausible-looking number that is not the one configured.
 *
 * Deliberately not `normalizePhoneDigits`, which returns "" for anything that is
 * not exactly ten digits: this doubles as the progressive formatter behind the
 * lead and appointment phone fields, so partial input must survive keystroke by
 * keystroke rather than being blanked while the visitor is still typing.
 */
export function formatPhoneNumber(value: string): string {
  const digits = stripUsCountryCode(value.replace(/\D/g, "")).slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
