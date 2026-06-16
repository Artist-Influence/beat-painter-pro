// Client-side export throttle: at most LIMIT exports per rolling WINDOW.
//
// NOTE: this lives in the browser (localStorage), so it deters casual over-use but
// is bypassable (clearing storage / incognito / another browser). A hard limit would
// need server-side per-user/IP enforcement, which this app (anonymous, no owned
// backend) can't do today.
const KEY = 'bp_export_log';
const WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours
export const EXPORT_LIMIT = 10;

function readLog(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((t) => typeof t === 'number') : [];
  } catch {
    return [];
  }
}

/** Current export budget: how many remain in the window and when one frees up. */
export function getExportQuota(): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const recent = readLog().filter((t) => now - t < WINDOW_MS);
  const remaining = Math.max(0, EXPORT_LIMIT - recent.length);
  // time until the oldest in-window export ages out (i.e. a slot frees up)
  const resetMs = recent.length >= EXPORT_LIMIT
    ? Math.max(0, WINDOW_MS - (now - Math.min(...recent)))
    : 0;
  return { allowed: remaining > 0, remaining, resetMs };
}

/** Record that an export was started (prunes the window as it writes). */
export function recordExport(): void {
  const now = Date.now();
  const recent = readLog().filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  try { localStorage.setItem(KEY, JSON.stringify(recent)); } catch { /* storage full / blocked */ }
}

/** Human-friendly "Xh Ym" for the reset countdown. */
export function formatResetIn(resetMs: number): string {
  const mins = Math.ceil(resetMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
