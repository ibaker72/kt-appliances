"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Error boundary for the public site.
 *
 * A shopper who hits this still has a warehouse they can phone, so the recovery
 * path is the same one the rest of the site pushes: retry, or call. The digest
 * is surfaced because it is the only handle support has on a server error the
 * shopper cannot see the logs for.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] render error:", error);
  }, [error]);

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-[2rem] font-extrabold leading-tight text-ink-950 sm:text-4xl">
          Something went wrong at our end
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
          This page failed to load. It is not something you did — try again, and if it keeps
          happening, call or text us and we will tell you what is on the floor directly.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonStyles("primary", "lg")}>
            <RotateCcw aria-hidden className="size-4" strokeWidth={2.5} />
            Try again
          </button>
          <CallLink context="error-boundary" className={buttonStyles("outline", "lg")}>
            Call {siteConfig.phone.display}
          </CallLink>
          <TextLink
            context="error-boundary"
            message={`Hi ${siteConfig.name}, your website hit an error. I was looking for an appliance.`}
            className={buttonStyles("outline", "lg")}
          >
            Text us
          </TextLink>
        </div>

        <p className="mt-8 text-ui text-ink-500">
          Or head back to{" "}
          <Link href="/inventory" className="font-semibold text-ink-800 underline underline-offset-4">
            current inventory
          </Link>
          .
        </p>

        {error.digest ? (
          <p className="mt-4 text-ui text-ink-400">
            Reference <span className="tnum">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </Container>
  );
}
