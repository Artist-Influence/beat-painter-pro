import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Timer, BarChart3, Activity } from "lucide-react";

export interface UserStats {
  totalUsers: number;
  totalVisualizers: number;
  totalMinutes: number;
  activeLast24h: number;
}

const StatCard: React.FC<{ title: string; value: string | number; Icon: React.ComponentType<any>; subtitle?: string }>=({ title, value, Icon, subtitle })=>{
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

const UserStatsGrid: React.FC<{ stats: UserStats }> = ({ stats }) => {
  return (
    <section aria-label="Key metrics" className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Total Users" value={stats.totalUsers} Icon={Users} />
      <StatCard title="Visualizers Made" value={stats.totalVisualizers} Icon={BarChart3} />
      <StatCard title="Time Spent" value={`${Math.round(stats.totalMinutes)} min`} Icon={Timer} />
      <StatCard title="Active (24h)" value={stats.activeLast24h} Icon={Activity} />
    </section>
  );
};

export default UserStatsGrid;
