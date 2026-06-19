import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type UserRow = {
  id: string;
  email: string | null;
  visualizers: number;
  totalMinutes: number;
  lastActive: string | null;
};

const UsersTable: React.FC<{ users: UserRow[] }> = ({ users }) => {
  return (
    <section aria-label="Users table" className="lg:col-span-12">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Visualizers</TableHead>
                <TableHead>Time Spent (min)</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "-"}</TableCell>
                  <TableCell>{u.visualizers}</TableCell>
                  <TableCell>{Math.round(u.totalMinutes)}</TableCell>
                  <TableCell>
                    {u.lastActive ? new Date(u.lastActive).toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default UsersTable;
