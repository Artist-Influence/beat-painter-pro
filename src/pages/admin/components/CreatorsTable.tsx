import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Creator = {
  handle: string;
  genre: string;
  followers: string;
  performance: string;
};

const CreatorsTable: React.FC<{ creators: Creator[] }> = ({ creators }) => {
  return (
    <section aria-label="Top creators" className="lg:col-span-12">
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
              {creators.map((cr) => (
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
  );
};

export default CreatorsTable;
