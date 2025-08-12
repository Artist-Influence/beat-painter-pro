import React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TrafficPoint = { day: string; sessions: number };

const WeeklySessionsChart: React.FC<{ data: TrafficPoint[] }> = ({ data }) => {
  return (
    <section aria-label="Weekly sessions" className="lg:col-span-8">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }}
            className="h-[260px]"
          >
            <AreaChart data={data}>
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
  );
};

export default WeeklySessionsChart;
