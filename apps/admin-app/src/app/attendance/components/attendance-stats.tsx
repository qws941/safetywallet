"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@safetywallet/ui";
import { Users, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface AttendanceStatsProps {
  total: number;
  success: number;
  fail: number;
  anomalyCount: number;
}

export function AttendanceStats({
  total,
  success,
  fail,
  anomalyCount,
}: AttendanceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">오늘 출근</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}명</div>
          <p className="text-xs text-muted-foreground">전체 출근 시도</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">출근 성공</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{success}명</div>
          <p className="text-xs text-muted-foreground">정상 출근 처리</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">출근 실패</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fail}명</div>
          <p className="text-xs text-muted-foreground">인증/위치 실패</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">이상치</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{anomalyCount}건</div>
          <p className="text-xs text-muted-foreground">비정상 패턴 감지</p>
        </CardContent>
      </Card>
    </div>
  );
}
