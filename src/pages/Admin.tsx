import React from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminSEO from "./admin/AdminSEO";
import UserStatsGrid from "./admin/components/UserStatsGrid";
import WeeklySessionsChart from "./admin/components/WeeklySessionsChart";
import UsersTable from "./admin/components/UsersTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEngagementTracker } from "@/hooks/useEngagementTracker";

const Admin: React.FC = () => {
  useEngagementTracker();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [profilesRes, sessionsRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("user_id,email"),
        supabase.from("user_sessions").select("user_id,started_at,duration_seconds"),
        supabase.from("visualizer_events").select("user_id"),
      ]);

      const profiles = profilesRes.data ?? [];
      const sessions = sessionsRes.data ?? [];
      const events = eventsRes.data ?? [];

      const usersMap: Record<string, { id: string; email: string | null; visualizers: number; totalMinutes: number; lastActive: string | null }> = {};

      profiles.forEach((p: any) => {
        if (!p.user_id) return;
        usersMap[p.user_id] = { id: p.user_id, email: p.email, visualizers: 0, totalMinutes: 0, lastActive: null };
      });

      events.forEach((e: any) => {
        if (!usersMap[e.user_id]) usersMap[e.user_id] = { id: e.user_id, email: null, visualizers: 0, totalMinutes: 0, lastActive: null };
        usersMap[e.user_id].visualizers += 1;
      });

      sessions.forEach((s: any) => {
        if (!usersMap[s.user_id]) usersMap[s.user_id] = { id: s.user_id, email: null, visualizers: 0, totalMinutes: 0, lastActive: null };
        usersMap[s.user_id].totalMinutes += (s.duration_seconds ?? 0) / 60;
        const end = new Date(new Date(s.started_at).getTime() + (s.duration_seconds ?? 0) * 1000).toISOString();
        if (!usersMap[s.user_id].lastActive || end > (usersMap[s.user_id].lastActive as string)) {
          usersMap[s.user_id].lastActive = end;
        }
      });

      const users = Object.values(usersMap).sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));

      const totalUsers = users.length;
      const totalVisualizers = events.length;
      const totalMinutes = sessions.reduce((acc: number, s: any) => acc + (s.duration_seconds ?? 0) / 60, 0);
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const activeLast24h = users.filter((u) => (u.lastActive ? new Date(u.lastActive).getTime() >= since : false)).length;

      // Build last 7 days sessions chart
      const now = new Date();
      const dayKeys: string[] = [];
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayKeys.push(key);
        labels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
      }
      const counts: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
      sessions.forEach((s: any) => {
        const k = new Date(s.started_at).toISOString().slice(0, 10);
        if (k in counts) counts[k] += 1;
      });
      const weekly = dayKeys.map((k, idx) => ({ day: labels[idx], sessions: counts[k] }));

      return { users, stats: { totalUsers, totalVisualizers, totalMinutes, activeLast24h }, weekly };
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="container mx-auto p-4">
      <AdminSEO />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <nav className="flex items-center gap-2">
          <Input placeholder="Search users…" className="w-44 md:w-72" aria-label="Search admin" />
          <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
          <Link to="/">
            <Button variant="secondary">Back to Studio</Button>
          </Link>
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {isLoading ? (
          <p>Loading…</p>
        ) : data ? (
          <>
            <UserStatsGrid stats={data.stats} />
            <WeeklySessionsChart data={data.weekly} />
            <UsersTable users={data.users} />
          </>
        ) : (
          <p>No data</p>
        )}
      </main>
    </div>
  );
};

export default Admin;
