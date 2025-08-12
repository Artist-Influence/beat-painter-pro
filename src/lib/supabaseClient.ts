import { createClient } from "@supabase/supabase-js";

// Lovable Supabase native integration: keys are injected by the platform.
// We also fall back to Vite env vars if available during local development.
const supabaseUrl = (window as any).__SUPABASE_URL__ ?? import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).__SUPABASE_ANON_KEY__ ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal: The UI will still render, but auth/data calls will fail until integration is connected.
  // eslint-disable-next-line no-console
  console.warn("Supabase not configured. Connect the green Supabase integration to enable auth & data.");
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);
