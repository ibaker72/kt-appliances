import { AlertTriangle } from "lucide-react";

/**
 * Why the admin cannot reach the database, stated so it can be acted on.
 *
 * These failures used to reach the browser as an opaque 500 digest, which says
 * nothing about whether the fix is an environment variable, a migration, or the
 * wrong key. Never renders a secret — only which variable is at fault.
 */
export function AdminConfigNotice({ problem }: { problem?: string | null }) {
  return (
    <div className="rounded-md border border-line bg-white p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-950">
        <AlertTriangle aria-hidden className="size-4 shrink-0 text-brand-500" strokeWidth={2.5} />
        The database is not reachable
      </h2>

      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
        {problem ??
          "No database connected. Set the Supabase environment variables described in .env.example."}
      </p>

      <ol className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink-600">
        <li>
          <span className="font-semibold text-ink-900">1.</span> Confirm{" "}
          <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
          <code className="font-mono text-[13px]">SUPABASE_SERVICE_ROLE_KEY</code> are set for this
          environment. The service-role value must be the project&apos;s secret key, not the anon
          key.
        </li>
        <li>
          <span className="font-semibold text-ink-900">2.</span> Run the migrations in{" "}
          <code className="font-mono text-[13px]">supabase/migrations/</code> — including{" "}
          <code className="font-mono text-[13px]">0002_api_role_grants.sql</code>, which grants the
          API roles table access.
        </li>
        <li>
          <span className="font-semibold text-ink-900">3.</span> Redeploy, so the server picks up
          changed environment variables.
        </li>
      </ol>
    </div>
  );
}
