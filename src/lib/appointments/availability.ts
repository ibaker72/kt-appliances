import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { APPOINTMENT_SLOTS, AFTER_HOURS_FROM } from "./schema";
import {
  BUSINESS_TIME_ZONE,
  MAX_DAYS_AHEAD,
  MIN_LEAD_TIME_MINUTES,
  formatAppointmentDay,
  formatSlotLabel,
  lastBookableDate,
  todayInZone,
  wallTimeToUtc,
} from "./time";

/**
 * Which appointment slots are actually open.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND IS NOT
 * ---------------------------------------------------------------------------
 * This is a *display* filter. It exists so the chat assistant does not offer a
 * shopper a time that is already taken, and so a slot in the past never appears
 * as bookable. It is not the thing that prevents double booking — it cannot be,
 * because between reading availability and inserting a booking another request
 * can insert the same slot.
 *
 * The guarantee lives in Postgres: `appointments_active_slot_idx` (migration
 * 0007) is a partial unique index on `scheduled_for` over the statuses that
 * occupy the warehouse. Two concurrent bookings for 1:30 PM both pass the check
 * here; exactly one survives the insert, and the loser is told the slot went.
 * See `AppointmentSlotTakenError` in `service.ts`.
 *
 * ---------------------------------------------------------------------------
 * WITHOUT A DATABASE
 * ---------------------------------------------------------------------------
 * With no Supabase credentials there are no stored bookings to conflict with, so
 * every in-hours future slot reads as open and `databaseChecked` is false. The
 * caller can then avoid claiming more than it knows — the chat panel says "we'll
 * confirm the time" rather than "that time is free".
 */

export interface AppointmentSlot {
  /** `HH:MM`, 24-hour, in the business timezone. */
  value: string;
  /** `1:30 PM`. */
  label: string;
  available: boolean;
  /** True for slots in the appointment-only evening window. */
  afterHours: boolean;
}

export interface DayAvailability {
  /** `YYYY-MM-DD` in the business timezone. */
  date: string;
  /** `Monday, August 24`. */
  label: string;
  timeZone: string;
  slots: AppointmentSlot[];
  openCount: number;
  /**
   * False when no database was reachable, so "available" means "in hours and in
   * the future" rather than "checked against the book".
   */
  databaseChecked: boolean;
}

/** Test seam. Production reads the appointments table. */
export interface AvailabilityDeps {
  /** UTC ISO strings of active bookings that start within the window. */
  bookedInstants: (fromIso: string, toIso: string) => Promise<string[] | null>;
  now: () => Date;
}

/** Statuses that occupy the warehouse. Must match the partial unique index. */
const BLOCKING_STATUSES = ["confirmed", "rescheduled", "completed"] as const;

async function readBookedInstants(fromIso: string, toIso: string): Promise<string[] | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const { data, error } = await client
    .from("appointments")
    .select("scheduled_for")
    .in("status", BLOCKING_STATUSES)
    .gte("scheduled_for", fromIso)
    .lt("scheduled_for", toIso);

  if (error) {
    // Reported as "unknown" rather than "everything is free": offering a slot we
    // could not verify is how a customer ends up driving to a double booking.
    console.error("[appointments] availability lookup failed:", error.message);
    return null;
  }

  return (data ?? [])
    .map((row) => (row as { scheduled_for?: unknown }).scheduled_for)
    .filter((value): value is string => typeof value === "string");
}

const defaultDeps: AvailabilityDeps = {
  bookedInstants: readBookedInstants,
  now: () => new Date(),
};

/** `YYYY-MM-DD` and within the bookable window. */
export function isBookableDate(date: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= todayInZone(BUSINESS_TIME_ZONE, now) && date <= lastBookableDate(BUSINESS_TIME_ZONE, now);
}

/**
 * Every slot on one day, marked open or taken.
 *
 * Out-of-range dates return an empty slot list rather than throwing: a stale
 * chat panel asking for yesterday should render "no times on that day" and let
 * the visitor pick another, not surface an error.
 */
export async function getDayAvailability(
  date: string,
  overrides: Partial<AvailabilityDeps> = {},
): Promise<DayAvailability> {
  const deps = { ...defaultDeps, ...overrides };
  const now = deps.now();

  const empty: DayAvailability = {
    date,
    label: "",
    timeZone: BUSINESS_TIME_ZONE,
    slots: [],
    openCount: 0,
    databaseChecked: false,
  };

  if (!isBookableDate(date, now)) return empty;

  // Anchor the day label on midday so it cannot be pushed onto the neighbouring
  // date by a DST shift at the boundary.
  const midday = wallTimeToUtc(date, "12:00", BUSINESS_TIME_ZONE);
  if (!midday) return empty;

  const dayStart = wallTimeToUtc(date, "00:00", BUSINESS_TIME_ZONE);
  const nextDay = new Date((dayStart ?? midday).getTime() + 26 * 3_600_000);

  const booked = await deps.bookedInstants(
    (dayStart ?? midday).toISOString(),
    nextDay.toISOString(),
  );
  const takenMs = new Set((booked ?? []).map((iso) => Date.parse(iso)).filter(Number.isFinite));

  const earliest = now.getTime() + MIN_LEAD_TIME_MINUTES * 60_000;
  const latest = now.getTime() + MAX_DAYS_AHEAD * 86_400_000;

  const slots: AppointmentSlot[] = APPOINTMENT_SLOTS.map((value) => {
    const instant = wallTimeToUtc(date, value, BUSINESS_TIME_ZONE);
    const ms = instant?.getTime() ?? Number.NaN;
    const inWindow = Number.isFinite(ms) && ms >= earliest && ms <= latest;

    return {
      value,
      label: formatSlotLabel(value),
      available: inWindow && !takenMs.has(ms),
      afterHours: value >= AFTER_HOURS_FROM,
    };
  });

  return {
    date,
    label: formatAppointmentDay(midday, BUSINESS_TIME_ZONE),
    timeZone: BUSINESS_TIME_ZONE,
    slots,
    openCount: slots.filter((slot) => slot.available).length,
    databaseChecked: booked !== null,
  };
}

export interface DayOption {
  date: string;
  /** `Sat, Aug 22`. */
  label: string;
  /** `Today` / `Tomorrow`, when that is what it is. */
  relativeLabel: string | null;
  openCount: number;
}

/**
 * The next `count` days that still have an open slot.
 *
 * Bounded by `scanLimit` days so a warehouse booked solid for a month cannot
 * turn one panel render into ninety database reads. Days are read in parallel;
 * each is one indexed range scan.
 */
export async function getUpcomingDays(
  count = 7,
  overrides: Partial<AvailabilityDeps> = {},
  scanLimit = 21,
): Promise<DayOption[]> {
  const deps = { ...defaultDeps, ...overrides };
  const now = deps.now();

  const candidates = Array.from({ length: scanLimit }, (_, index) =>
    todayInZone(BUSINESS_TIME_ZONE, new Date(now.getTime() + index * 86_400_000)),
  );

  const days = await Promise.all(
    candidates.map((date) => getDayAvailability(date, overrides)),
  );

  const today = todayInZone(BUSINESS_TIME_ZONE, now);
  const tomorrow = todayInZone(BUSINESS_TIME_ZONE, new Date(now.getTime() + 86_400_000));

  return days
    .filter((day) => day.openCount > 0)
    .slice(0, count)
    .map((day) => {
      const midday = wallTimeToUtc(day.date, "12:00", BUSINESS_TIME_ZONE);
      return {
        date: day.date,
        label: midday
          ? new Intl.DateTimeFormat("en-US", {
              timeZone: BUSINESS_TIME_ZONE,
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(midday)
          : day.date,
        relativeLabel: day.date === today ? "Today" : day.date === tomorrow ? "Tomorrow" : null,
        openCount: day.openCount,
      };
    });
}

/**
 * Whether one specific slot is currently free.
 *
 * Used to give a shopper a straight answer before they fill in their details.
 * Still advisory — the insert is what decides.
 */
export async function isSlotOpen(
  date: string,
  time: string,
  overrides: Partial<AvailabilityDeps> = {},
): Promise<boolean> {
  const day = await getDayAvailability(date, overrides);
  return day.slots.some((slot) => slot.value === time && slot.available);
}
