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

  /**
   * Website chat assistant.
   *
   * The funnel, in order: the bubble is seen, it is opened, an action is taken,
   * and one of the four conversions fires. Every payload carries context — the
   * page kind, the action, the appliance category — and never a name, a phone
   * number, an email or anything the visitor typed. See `track()` call sites in
   * `components/chat`.
   */
  chatLauncherViewed: "chat_launcher_viewed",
  chatOpened: "chat_opened",
  chatQuickActionClicked: "chat_quick_action_clicked",
  chatInventorySearch: "chat_inventory_search",
  chatInventoryResultClicked: "chat_inventory_result_clicked",
  chatAvailabilityStarted: "chat_availability_started",
  chatMessageSent: "chat_message_sent",
  chatLeadStarted: "chat_lead_started",
  chatLeadSubmitted: "chat_lead_submitted",
  chatAppointmentStarted: "chat_appointment_started",
  chatAppointmentSlotSelected: "chat_appointment_slot_selected",
  chatAppointmentBooked: "chat_appointment_booked",
  chatDeliveryQuoteRequested: "chat_delivery_quote_requested",
  chatFinancingClicked: "chat_financing_clicked",
  chatCallClicked: "chat_call_clicked",
  chatTextClicked: "chat_text_clicked",
  chatHumanHandoff: "chat_human_handoff",
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

  // Chat conversions map onto the same standard events as their non-chat
  // equivalents, so a booking made in the panel is optimised for identically to
  // one made on /schedule and neither is double-counted as the other.
  chat_call_clicked: "Contact",
  chat_text_clicked: "Contact",
  chat_lead_submitted: "Lead",
  chat_delivery_quote_requested: "Lead",
  chat_appointment_booked: "Schedule",
  chat_inventory_result_clicked: "ViewContent",
};

export type AnalyticsPayload = Record<string, string | number | boolean | undefined | null>;
