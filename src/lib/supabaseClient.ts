import { createClient } from "@supabase/supabase-js";

// Lovable Supabase native integration: keys are injected by the platform.
// We also fall back to Vite env vars if available during local development.
const supabaseUrl = (window as any).__SUPABASE_URL__ ?? import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).__SUPABASE_ANON_KEY__ ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: any;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl as string, supabaseAnonKey as string);
} else {
  // Non-fatal: Export a safe stub so the app doesn't crash before Supabase is connected.
  // eslint-disable-next-line no-console
  console.warn("Supabase not configured. Connect the green Supabase integration to enable auth & data.");
  const stubError = () => {
    throw new Error("Supabase not configured. Click the green Supabase button to connect.");
  };
  client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: "not configured" } }),
      signInWithPassword: async () => stubError(),
      signUp: async () => stubError(),
      signOut: async () => ({}),
    },
    from: () => ({
      select: async () => stubError(),
      insert: async () => stubError(),
      update: async () => stubError(),
      upsert: async () => stubError(),
      delete: async () => stubError(),
    }),
  } as any;
}

export const supabase = client;

