/**
 * Conversion events tracked across the site.
 *
 * Names are shared by GA4 and the Meta Pixel so reporting lines up between the
 * two. `META_EVENT_MAP` translates them into the Pixel's standard events where a
 * sensible standard event exists; everything else is sent as a custom event.
 */
export const ANALYTICS_EVENTS = {
  phoneClick: "phone_click",
  smsClick: "sms_click",
  emailClick: "email_click",
  directionsClick: "directions_click",
  inventoryView: "inventory_view",
  categoryView: "category_view",
  productView: "product_view",
  productInquiry: "product_inquiry",
  deliveryInquiry: "delivery_inquiry",
  financingInquiry: "financing_inquiry",
  installationInquiry: "installation_inquiry",
  generalInquiry: "general_inquiry",
  afterHoursRequest: "after_hours_request",
  leadSubmitted: "lead_submitted",
  appointmentBooked: "appointment_booked",
  filterApplied: "filter_applied",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const META_EVENT_MAP: Partial<Record<AnalyticsEvent, string>> = {
  phone_click: "Contact",
  sms_click: "Contact",
  email_click: "Contact",
  product_view: "ViewContent",
  inventory_view: "ViewContent",
  category_view: "ViewContent",
  product_inquiry: "Lead",
  delivery_inquiry: "Lead",
  financing_inquiry: "Lead",
  installation_inquiry: "Lead",
  general_inquiry: "Lead",
  lead_submitted: "Lead",
  // Meta's standard event for a booked appointment. Distinct from "Lead" on
  // purpose: a booking is a firm commitment and should not be averaged into
  // enquiry conversion rates when optimising ad spend.
  appointment_booked: "Schedule",
};

export type AnalyticsPayload = Record<string, string | number | boolean | undefined | null>;
