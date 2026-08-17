/**
 * Appointment scheduling time.
 *
 * The warehouse is in East Stroudsburg, PA, so every slot a customer picks is a
 * wall-clock time in `America/New_York` — and the server that stores it may be
 * running anywhere. These helpers convert between the two without a date
 * library: `Intl` already ships the IANA database in Node and every browser, and
 * a dependency here would be 70 KB to do what twenty lines of arithmetic do.
 *
 * Pure module, no `server-only`: the booking form renders the same slot labels
 * the server validates against, and the tests exercise both across a DST
 * boundary.
 */

export const BUSINESS_TIME_ZONE = "America/New_York";

/**
 * How far ahead a booking must be. A slot fifteen minutes from now is not an
 * appointment anyone can prepare for — the customer would arrive before the
 * owner had read the alert.
 */
export const MIN_LEAD_TIME_MINUTES = 30;

/** How far out the calendar opens. Beyond this the date is almost always a typo. */
export const MAX_DAYS_AHEAD = 90;

/**
 * Minutes to add to UTC to get local wall-clock time in `timeZone` at `instant`.
 * Eastern Daylight Time is -240, Eastern Standard Time is -300.
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;

  // "GMT-04:00", or plain "GMT" at zero offset.
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(formatted ?? "");
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * `("2026-08-24", "14:30")` in New York → the corresponding UTC instant.
 *
 * Two passes, because the offset depends on the instant we are trying to find.
 * The first pass guesses using the offset at the same wall time read as UTC; the
 * second corrects it. That matters twice a year: without the second pass, a
 * booking on the far side of a DST transition lands an hour out, which for a
 * 5 PM after-hours appointment is the difference between an open warehouse and a
 * locked one.
 */
export function wallTimeToUtc(
  date: string,
  time: string,
  timeZone: string = BUSINESS_TIME_ZONE,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])];

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute);

  // Reject dates that rolled over — Date.UTC accepts Feb 31 and silently
  // produces March 3, which would confirm an appointment on a day nobody chose.
  const rolled = new Date(wallAsUtcMs);
  if (rolled.getUTCFullYear() !== year || rolled.getUTCMonth() !== month - 1 || rolled.getUTCDate() !== day) {
    return null;
  }

  const firstGuess = new Date(wallAsUtcMs - zoneOffsetMinutes(rolled, timeZone) * 60_000);
  return new Date(wallAsUtcMs - zoneOffsetMinutes(firstGuess, timeZone) * 60_000);
}

/**
 * `"14:30"` → `"2:30 PM"`.
 *
 * Slot labels are built by hand rather than through `Intl` because a slot is a
 * time of day with no date attached — routing it through a formatter would mean
 * inventing a date to format it on, and inventing one near a DST boundary shifts
 * the label by an hour.
 */
export function formatSlotLabel(slot: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(slot);
  if (!match) return slot;

  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

/** Today's date in the business timezone as `YYYY-MM-DD`, for form minimums. */
export function todayInZone(timeZone: string = BUSINESS_TIME_ZONE, now: Date = new Date()): string {
  // `en-CA` formats as YYYY-MM-DD, which is exactly what <input type="date"> wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The last date the booking form accepts, as `YYYY-MM-DD`. */
export function lastBookableDate(
  timeZone: string = BUSINESS_TIME_ZONE,
  now: Date = new Date(),
): string {
  return todayInZone(timeZone, new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000));
}

function formatIn(
  value: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

/** `Monday, August 24 at 2:30 PM` — the customer-facing form. */
export function formatAppointmentDateTime(
  value: Date | string,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  const day = formatIn(value, timeZone, { weekday: "long", month: "long", day: "numeric" });
  const time = formatAppointmentTime(value, timeZone);
  return day && time ? `${day} at ${time}` : "";
}

/** `Mon Aug 24 at 2:30 PM` — the compact form, for the owner's alert. */
export function formatAppointmentShort(
  value: Date | string,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  const day = formatIn(value, timeZone, { weekday: "short", month: "short", day: "numeric" });
  const time = formatAppointmentTime(value, timeZone);
  return day && time ? `${day} at ${time}` : "";
}

/** `Monday, August 24`. */
export function formatAppointmentDay(
  value: Date | string,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  return formatIn(value, timeZone, { weekday: "long", month: "long", day: "numeric" });
}

/**
 * `2:30 PM`.
 *
 * Intl separates the time from AM/PM with U+202F (narrow no-break space) in
 * current Node and browsers. In an SMS that renders as a stray box on some
 * handsets and, worse, silently pushes the body past the 160-character GSM-7
 * limit into a second billed segment. Normalised to a plain space.
 */
export function formatAppointmentTime(
  value: Date | string,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  return formatIn(value, timeZone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(/[\u202f\u00a0]/g, " ");
}
