import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const useEngagementTracker = () => {
  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = async () => {
      if (!user) return;
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) return;

      try {
        await supabase.from("user_sessions").insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          duration_seconds: 15,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Session heartbeat failed", e);
      }
    };

    if (user) {
      // Fire an immediate tick to capture presence, then every 15s
      tick();
      intervalRef.current = window.setInterval(tick, 15000);
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [user]);
};
