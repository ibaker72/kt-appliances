import { AlertTriangle } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { isAdminConfigured } from "@/lib/admin/auth";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const configured = isAdminConfigured();

  return (
    <div className="mx-auto w-full max-w-md py-10 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-950">
        Warehouse admin
      </h1>
      <p className="mt-2 text-[15px] text-ink-600">
        Sign in to manage inventory, photos and customer leads.
      </p>

      {configured ? (
        <div className="mt-8 border border-line bg-white p-6 sm:p-7">
          <LoginForm next={next} />
        </div>
      ) : (
        <div className="mt-8 border border-line bg-white p-6 sm:p-7">
          <AlertTriangle aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
          <h2 className="mt-4 font-display text-xl font-bold text-ink-950">Admin not configured</h2>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">
            This deployment has no admin credentials set, so sign-in is disabled and the admin area
            is closed. Set both of these environment variables and redeploy:
          </p>
          <ul className="mt-4 space-y-2 border-t border-line pt-4 font-mono text-[13px] text-ink-800">
            <li>ADMIN_PASSWORD</li>
            <li>ADMIN_SESSION_SECRET</li>
          </ul>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-500">
            <code className="font-mono">ADMIN_SESSION_SECRET</code> must be at least 16 characters —
            generate one with <code className="font-mono">openssl rand -base64 32</code>. Managing
            inventory additionally requires the Supabase variables described in{" "}
            <code className="font-mono">.env.example</code>.
          </p>
        </div>
      )}
    </div>
  );
}
