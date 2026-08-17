"use server";

import { headers } from "next/headers";

import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  appointmentSchema,
  type AppointmentFormState,
} from "@/lib/appointments/schema";
import { AppointmentPersistenceError, bookAppointment } from "@/lib/appointments/service";
import { formatAppointmentDateTime } from "@/lib/appointments/time";
import { maskPhoneNumber } from "@/lib/sms/phone";

/**
 * Public appointment booking.
 *
 * Same defence in depth as `submitLead`, in the same order: honeypot, per-IP
 * rate limit, then schema validation. Nothing reaches the database or Twilio
 * until all three pass — which is also what keeps this from becoming an open SMS
 * relay, since the only number it will ever text is the one supplied in a
 * submission that survived all three gates, plus the owner's number from server
 * configuration.
 */

const SUCCESS_MESSAGE = "Your appointment is confirmed.";

/**
 * Bookings are once-in-a-while events, so the window is tighter than the lead
 * form's: five in five minutes is generous for a person and uninteresting to
 * anyone trying to use the form as a message pump.
 */
const RATE_LIMIT = { max: 5, windowMs: 5 * 60_000 };

export async function submitAppointment(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const raw = Object.fromEntries(formData.entries());

  // Honeypot — hidden from humans, irresistible to bots.
  if (typeof raw.website === "string" && raw.website.trim().length > 0) {
    // Report success so the bot has nothing to learn from the response.
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const requestHeaders = await headers();
  const limit = checkRateLimit(
    clientKey(requestHeaders, "appointment"),
    RATE_LIMIT.max,
    RATE_LIMIT.windowMs,
  );
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many booking attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s), or call us directly.`,
    };
  }

  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      errors,
    };
  }

  const appointment = parsed.data;

  try {
    const result = await bookAppointment(appointment);

    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      confirmation: {
        scheduledForLabel: formatAppointmentDateTime(
          appointment.scheduledFor,
          appointment.timeZone,
        ),
        // The screen claims a text was sent only when one actually was. A
        // skipped send (consent withheld, SMS disabled while A2P is pending) and
        // a failed send both report false, so the customer is never told to
        // watch for a message that is not coming.
        smsConfirmationSent: result.notifications.customer.status === "sent",
        maskedPhone: maskPhoneNumber(appointment.phone),
      },
    };
  } catch (error) {
    if (error instanceof AppointmentPersistenceError) {
      // The booking genuinely did not save. Say so rather than showing a
      // confirmation for an appointment that does not exist.
      console.error("[appointments] booking failed to persist:", error.message);
      return {
        status: "error",
        message:
          "We could not save that appointment. Please call or text us and we'll book it for you.",
      };
    }

    console.error("[appointments] submission failed:", error);
    return {
      status: "error",
      message: "Something went wrong on our end. Please call or text us and we'll take care of it.",
    };
  }
}
