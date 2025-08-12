import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Listen for auth changes first (sync-only in callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    // 2) Then fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Ensure a profile row exists for the authenticated user (deferred, no deadlocks)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        await supabase.from("profiles").upsert(
          { user_id: user.id, email: user.email },
          { onConflict: "user_id" }
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("upsert profile failed", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  return { user, loading };
};
