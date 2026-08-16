import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** True when the public (read) credentials are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** True when the service-role key is present, enabling admin writes. */
export const isSupabaseWritable = Boolean(url && serviceRoleKey);

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
 * Service-role client. Bypasses RLS, so it must never be imported into a client
 * component or exposed through a public route handler. The `server-only` import
 * at the top of this module turns any such attempt into a build error.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!url || !serviceRoleKey) return null;
  writeClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return writeClient;
}

export const supabaseStorageBucket =
  process.env.SUPABASE_INVENTORY_BUCKET?.trim() || "appliance-images";
