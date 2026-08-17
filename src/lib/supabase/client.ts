import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** True when the public (read) credentials are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** True when usable service-role credentials are present, enabling admin writes. */
export const isSupabaseWritable = Boolean(url && serviceRoleKey) && serviceRoleKey !== anonKey;

let readClient: SupabaseClient | null = null;
let writeClient: SupabaseClient | null = null;

/**
 * Read-only client using the anon key. Row Level Security limits this to
 * published, non-draft inventory — see the migration for the exact policies.
 */
export function getSupabaseReadClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  readClient ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return readClient;
}

/**
 * The single most common way this is misconfigured: the anon/publishable key
 * pasted into SUPABASE_SERVICE_ROLE_KEY. The resulting client authenticates as
 * `anon`, so every privileged query fails at the database with "permission
 * denied for table …" — an error that reads like a schema problem and is not.
 *
 * Checked by comparison rather than by decoding the key, so nothing about either
 * secret is inspected or logged.
 */
const serviceRoleKeyIsAnonKey = Boolean(
  serviceRoleKey && anonKey && serviceRoleKey === anonKey,
);

/**
 * Why privileged database access is unavailable, or null when it is fine.
 *
 * Deliberately returns a cause rather than a boolean: "no key set" and "the
 * wrong key is set" need different fixes, and the admin UI should say which.
 * Never include the values themselves.
 */
export function adminClientConfigProblem(): string | null {
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  if (!serviceRoleKey) return "SUPABASE_SERVICE_ROLE_KEY is not set.";
  if (serviceRoleKeyIsAnonKey) {
    return "SUPABASE_SERVICE_ROLE_KEY holds the same value as NEXT_PUBLIC_SUPABASE_ANON_KEY. Set it to the project's service-role secret.";
  }
  return null;
}

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a client
 * component or exposed through a public route handler. The `server-only` import
 * at the top of this module turns any such attempt into a build error.
 *
 * Returns null only when privileged access is genuinely unavailable — it never
 * falls back to the anon key, because a silent downgrade turns an authorization
 * misconfiguration into a confusing runtime failure deep inside a query.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!url || !serviceRoleKey || serviceRoleKeyIsAnonKey) return null;
  writeClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return writeClient;
}

export const supabaseStorageBucket =
  process.env.SUPABASE_INVENTORY_BUCKET?.trim() || "appliance-images";
