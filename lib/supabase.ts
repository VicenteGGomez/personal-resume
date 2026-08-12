import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase access, used as the production storage backend for
 * both the résumé content and the visit analytics (see resume-store.ts and
 * analytics-store.ts). Uses the service role key, which bypasses Row Level
 * Security — every table this app touches denies anonymous access entirely
 * and is only ever read or written from server code.
 */

export function isSupabaseMode(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const RESUME_UPLOADS_BUCKET = "resume-uploads";
