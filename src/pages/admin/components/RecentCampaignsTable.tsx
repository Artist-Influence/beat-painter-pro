import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Campaign = {
  id: string;
  name: string;
  status: string;
  creators: number;
  reach: string;
};

const RecentCampaignsTable: React.FC<{ campaigns: Campaign[] }> = ({ campaigns }) => {
  return (
    <section aria-label="Recent campaigns" className="lg:col-span-4">
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
              {campaigns.map((c) => (
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
  );
};

export default RecentCampaignsTable;
