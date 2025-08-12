import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("getUser error", error.message);
      }
      if (!mounted) return;
      setUser(user ?? null);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Ensure profile row exists
      if (u) {
        try {
          await supabase.from("user_profiles").upsert(
            { id: u.id, email: u.email },
            { onConflict: "id" }
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("upsert profile failed", e);
        }
      }
    });

    init();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};
