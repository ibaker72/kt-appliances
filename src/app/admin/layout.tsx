import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LayoutDashboard, LogOut, MessageSquare, Package } from "lucide-react";

import { logoutAction } from "@/app/admin/actions";
import { Wordmark } from "@/components/brand/wordmark";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/leads", label: "Leads", icon: MessageSquare },
];

/**
 * Admin shell.
 *
 * Deliberately separate from the public site chrome: no marketing header, no
 * mobile call bar, no analytics conversion tracking. The nav renders only for an
 * authenticated session, so the login page shows nothing but the login form.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authenticated = await isAdminAuthenticated();

  return (
    <div className="flex min-h-screen flex-col bg-bone-100">
      <header className="on-dark sticky top-0 z-40 border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href={authenticated ? "/admin" : "/"} aria-label="KT Appliances admin">
              <Wordmark tone="light" size="sm" withTagline={false} />
            </Link>
            <span className="hidden border border-white/20 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 sm:inline-block">
              Admin
            </span>
          </div>

          {authenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 px-3 py-2 text-[13px] text-white/60 transition-colors hover:text-white sm:flex"
              >
                View site
                <ExternalLink aria-hidden className="size-3.5" strokeWidth={2.25} />
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex min-h-10 items-center gap-1.5 border border-white/20 px-3 py-2 font-display text-[11.5px] font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-white hover:text-ink-950"
                >
                  <LogOut aria-hidden className="size-3.5" strokeWidth={2.5} />
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>

        {authenticated ? (
          <nav aria-label="Admin sections" className="border-t border-ink-800">
            <ul className="mx-auto flex w-full max-w-[1400px] items-center gap-1 overflow-x-auto px-2 no-scrollbar sm:px-4">
              {NAV.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-12 items-center gap-2 whitespace-nowrap px-3 font-display text-[12.5px] font-bold uppercase tracking-[0.05em] text-white/65 transition-colors hover:text-white"
                  >
                    <Icon aria-hidden className="size-4" strokeWidth={2.25} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
