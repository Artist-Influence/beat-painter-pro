import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Users, FolderOpen } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  useEffect(() => {
    document.title = "Admin Dashboard – Audio Visual Studio";

    const desc =
      "Operator dashboard for campaigns, creators, and analytics in Audio Visual Studio.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/admin`;

    // Structured data (WebApplication)
    const ld = document.getElementById("ld-json-admin");
    if (ld) ld.remove();
    const script = document.createElement("script");
    script.id = "ld-json-admin";
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Audio Visual Studio Admin Dashboard",
      url: `${window.location.origin}/admin`,
      applicationCategory: "BusinessApplication",
      description: desc,
    });
    document.head.appendChild(script);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <nav className="flex items-center gap-2">
          <Input placeholder="Search…" className="w-44 md:w-72" aria-label="Search admin" />
          <Link to="/">
            <Button variant="secondary">Back to Studio</Button>
          </Link>
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stats */}
        <section aria-label="Key metrics" className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,284</div>
              <p className="text-sm text-muted-foreground">+12% vs last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">39.7M</div>
              <p className="text-sm text-muted-foreground">+8% available audience</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-sm text-muted-foreground">+1 this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Algorithm Accuracy</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95.0%</div>
              <p className="text-sm text-muted-foreground">+1.2% prediction rate</p>
            </CardContent>
          </Card>
        </section>

        {/* Chart */}
        <section aria-label="Weekly sessions" className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }}
                className="h-[260px]"
              >
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="sessions" />} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* Recent Campaigns */}
        <section aria-label="Recent campaigns" className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCampaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.creators} creators · {c.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{c.reach}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Creators table */}
        <section aria-label="Top creators" className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Creator Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Handle</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCreators.map((cr) => (
                    <TableRow key={cr.handle}>
                      <TableCell className="font-medium">{cr.handle}</TableCell>
                      <TableCell>{cr.genre}</TableCell>
                      <TableCell>{cr.followers}</TableCell>
                      <TableCell>{cr.performance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Admin;
