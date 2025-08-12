import { supabase } from "@/integrations/supabase/client";

export type VisualizerEventType =
  | "visualizer_selected"
  | "recording_started"
  | "recording_completed"
  | "recording_stopped";

export async function logEvent(
  event_type: VisualizerEventType,
  opts?: { visualizer_key?: string | null; metadata?: Record<string, any> | null }
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    await supabase.from("visualizer_events").insert({
      user_id: user.id,
      event_type,
      visualizer_key: opts?.visualizer_key ?? null,
      metadata: opts?.metadata ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("logEvent failed", e);
  }
}
