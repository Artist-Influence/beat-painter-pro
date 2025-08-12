import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Users, FolderOpen } from "lucide-react";

export interface Stats {
  creatorsCount: number | string;
  totalReach: string;
  activeCampaigns: number | string;
  algorithmAccuracy: string;
}

const StatCard: React.FC<{ title: string; value: string | number; Icon: React.ComponentType<any>; subtitle: string }>=({ title, value, Icon, subtitle })=>{
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

const StatsGrid: React.FC<{ stats: Stats }> = ({ stats }) => {
  return (
    <section aria-label="Key metrics" className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Total Creators" value={stats.creatorsCount} Icon={Users} subtitle="+12% vs last month" />
      <StatCard title="Total Reach" value={stats.totalReach} Icon={BarChart3} subtitle="+8% available audience" />
      <StatCard title="Active Campaigns" value={stats.activeCampaigns} Icon={FolderOpen} subtitle="+1 this week" />
      <StatCard title="Algorithm Accuracy" value={stats.algorithmAccuracy} Icon={Activity} subtitle="+1.2% prediction rate" />
    </section>
  );
};

export default StatsGrid;
