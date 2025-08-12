import React from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminSEO from "./admin/AdminSEO";
import StatsGrid from "./admin/components/StatsGrid";
import WeeklySessionsChart from "./admin/components/WeeklySessionsChart";
import RecentCampaignsTable from "./admin/components/RecentCampaignsTable";
import CreatorsTable from "./admin/components/CreatorsTable";

const trafficData = [
  { day: "Mon", sessions: 3200 },
  { day: "Tue", sessions: 4100 },
  { day: "Wed", sessions: 3900 },
  { day: "Thu", sessions: 4600 },
  { day: "Fri", sessions: 5200 },
  { day: "Sat", sessions: 4800 },
  { day: "Sun", sessions: 5700 },
];

const recentCampaigns = [
  { id: "CMP-8321", name: "Q3 Launch Hype", status: "Active", creators: 28, reach: "3.1M" },
  { id: "CMP-8294", name: "Summer Sampler", status: "Paused", creators: 14, reach: "1.2M" },
  { id: "CMP-8279", name: "Indie Spotlight", status: "Draft", creators: 8, reach: "—" },
  { id: "CMP-8260", name: "EDM Push Week 12", status: "Completed", creators: 52, reach: "9.4M" },
];

const recentCreators = [
  { handle: "@beatsbylana", genre: "EDM", followers: "820k", performance: "High" },
  { handle: "@lofi.loop", genre: "Lo‑fi", followers: "210k", performance: "Medium" },
  { handle: "@trapwavex", genre: "Trap", followers: "1.2M", performance: "High" },
  { handle: "@indieechoes", genre: "Indie", followers: "98k", performance: "Developing" },
];

const Admin: React.FC = () => {

  return (
    <div className="container mx-auto p-4">
      <AdminSEO />
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <nav className="flex items-center gap-2">
          <Input placeholder="Search…" className="w-44 md:w-72" aria-label="Search admin" />
          <Link to="/">
            <Button variant="secondary">Back to Studio</Button>
          </Link>
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <StatsGrid
          stats={{ creatorsCount: 1284, totalReach: "39.7M", activeCampaigns: 6, algorithmAccuracy: "95.0%" }}
        />

        <WeeklySessionsChart data={trafficData} />

        <RecentCampaignsTable campaigns={recentCampaigns} />

        <CreatorsTable creators={recentCreators} />
      </main>
    </div>
  );
};

export default Admin;
