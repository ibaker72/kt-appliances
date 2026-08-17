import { CalendarClock, Clock, MapPin } from "lucide-react";

import { AppointmentForm } from "@/components/forms/appointment-form";
import { CallLink, DirectionsLink, TextLink } from "@/components/contact/contact-links";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { lastBookableDate, todayInZone } from "@/lib/appointments/time";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Book an Appointment",
  description:
    "Book a time to visit the KT Appliances warehouse in East Stroudsburg, PA — including after-hours appointments from 5:00 PM to 9:00 PM. Pick a date and time and we'll have the unit ready.",
  path: "/schedule",
});

/**
 * The calendar bounds are computed here, on the server, and passed down.
 *
 * Doing it in the client component instead would compute "today" from the
 * visitor's own clock, which is a different date from the warehouse's whenever
 * someone books late at night from another timezone — and a hydration mismatch
 * either way.
 */
export const dynamic = "force-dynamic";

export default function SchedulePage() {
  const minDate = todayInZone();
  const maxDate = lastBookableDate();

  return (
    <>
      <PageHeader
        title="Book a time to come see it"
        description={`Pick a slot and we'll have the appliance out, plugged in and ready when you arrive. The warehouse is at ${siteConfig.address.oneLine}, open daily ${siteConfig.hours.regular.label}, with after-hours visits ${siteConfig.hours.afterHours.label}.`}
        crumbs={[{ name: "Book an Appointment", path: "/schedule" }]}
        aside={
          <div className="border border-white/15 bg-white/[0.04] p-6 sm:p-7">
            <p className="text-ui font-semibold uppercase tracking-wide text-white/55">
              Rather just call?
            </p>
            <CallLink
              context="schedule-header"
              className="mt-3 block font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-white transition-colors hover:text-brand-400 sm:text-[2.5rem] tnum"
            >
              {siteConfig.phone.display}
            </CallLink>

            <ul className="mt-6 space-y-3 text-[14px] text-white/70">
              <li className="flex gap-3">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" strokeWidth={2} />
                <span>
                  {siteConfig.hours.regular.days} {siteConfig.hours.regular.label}
                  <br />
                  After hours {siteConfig.hours.afterHours.label}
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-400" strokeWidth={2} />
                <span>{siteConfig.address.oneLine}</span>
              </li>
            </ul>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              <TextLink
                context="schedule-header"
                message={`Hi ${siteConfig.name}, I'd like to book a time to visit.`}
                className={buttonStyles("outlineLight", "md", "w-full")}
              >
                Text Us
              </TextLink>
              <DirectionsLink
                context="schedule-header"
                className={buttonStyles("outlineLight", "md", "w-full")}
              >
                Directions
              </DirectionsLink>
            </div>
          </div>
        }
      />

      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="How appointments work" />
              <ul className="space-y-5 text-[15px] leading-relaxed text-ink-600">
                <li className="flex gap-3">
                  <CalendarClock
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-brand-500"
                    strokeWidth={2}
                  />
                  <span>
                    <strong className="font-semibold text-ink-900">Pick any slot.</strong> Daytime
                    visits run {siteConfig.hours.regular.label}. After-hours slots{" "}
                    {siteConfig.hours.afterHours.label.toLowerCase()} are the reason most people
                    book — the warehouse is closed to walk-ins then, but not to you.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Clock
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-brand-500"
                    strokeWidth={2}
                  />
                  <span>
                    <strong className="font-semibold text-ink-900">
                      Tell us what you&apos;re coming for.
                    </strong>{" "}
                    If you name the appliance, we&apos;ll have it pulled to the front and powered up
                    so you can see it run before you decide.
                  </span>
                </li>
                <li className="flex gap-3">
                  <MapPin
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-brand-500"
                    strokeWidth={2}
                  />
                  <span>
                    <strong className="font-semibold text-ink-900">Plans change.</strong> Call or
                    text {siteConfig.phone.display} any time and we&apos;ll move it. There is no
                    deposit and nothing to cancel.
                  </span>
                </li>
              </ul>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <div className="border border-line bg-white p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950 sm:text-2xl">
                  Pick a date and time
                </h2>
                <p className="mb-6 mt-2 text-[15px] leading-relaxed text-ink-600">
                  We&apos;ll confirm on the spot. Every field except your name, phone, date and time
                  is optional.
                </p>
                <AppointmentForm
                  minDate={minDate}
                  maxDate={maxDate}
                  formLocation="schedule-page"
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
