"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@safetywallet/ui";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export const runtime = "edge";

interface ElectionRow {
  month: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
}

export default function VotesPage() {
  const router = useRouter();
  const siteId = useAuthStore((s) => s.currentSiteId);

  const getElectionRows = (): ElectionRow[] => {
    const rows: ElectionRow[] = [];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Generate last 11 months + current + next 2 months
    for (let i = -2; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      let status: "UPCOMING" | "ACTIVE" | "ENDED" = "ENDED";
      if (month === currentMonthStr) {
        status = "ACTIVE";
      } else if (month > currentMonthStr) {
        status = "UPCOMING";
      }

      rows.push({ month, status });
    }

    // Sort desc (newest first)
    return rows.sort((a, b) => b.month.localeCompare(a.month));
  };

  const elections = getElectionRows();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="bg-green-500">
            진행중
          </Badge>
        );
      case "UPCOMING":
        return <Badge variant="secondary">예정</Badge>;
      default:
        return <Badge variant="outline">종료</Badge>;
    }
  };

  if (!siteId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            현장을 선택해주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">투표 관리</h1>
        <Button onClick={() => router.push("/votes/new")}>
          <Plus className="h-4 w-4 mr-2" />새 투표 시작
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>투표 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>해당 월</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elections.map((election) => (
                <TableRow
                  key={election.month}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/votes/${election.month}`)}
                >
                  <TableCell className="font-medium">
                    {election.month.split("-")[0]}년{" "}
                    {parseInt(election.month.split("-")[1])}월
                  </TableCell>
                  <TableCell>{getStatusBadge(election.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      상세보기
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
