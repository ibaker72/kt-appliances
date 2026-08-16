import Link from "next/link";
import { MessageSquareText, Phone } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Closing conversion band. Texting is presented first because it is the fastest
 * way to get an answer on a specific unit and converts best on mobile traffic.
 */
export function ContactCta({
  title = "Looking for something specific?",
  description = "Tell us the appliance, the brand or the size you need. Stock changes daily, and we'll tell you what's on the floor right now — or what's coming in.",
  message = `Hi ${siteConfig.name}, I'm looking for a specific appliance. Can you tell me what you have available?`,
  context = "contact-cta",
}: {
  title?: string;
  description?: string;
  message?: string;
  context?: string;
}) {
  return (
    <section className="on-dark bg-ink-950 text-white">
      <Container className="grid gap-8 py-14 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="min-w-0 lg:col-span-7">
          <h2 className="font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-4xl lg:text-[2.85rem]">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/70">{description}</p>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="flex flex-col gap-3">
            <TextLink
              context={context}
              message={message}
              className={buttonStyles("primary", "lg", "w-full")}
            >
              <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
              Text {siteConfig.phone.display}
            </TextLink>
            <CallLink context={context} className={buttonStyles("outlineLight", "lg", "w-full")}>
              <Phone aria-hidden className="size-4" strokeWidth={2.5} />
              Call the warehouse
            </CallLink>
          </div>
          <p className="mt-4 text-center text-[13px] text-white/50">
            Open daily {siteConfig.hours.regular.label} ·{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-white">
              After-hours by appointment
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
