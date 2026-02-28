"use client";

import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safetywallet/ui";

interface PointsDistributionItem {
  reasonCode: string;
  totalAmount: number;
  count: number;
}

interface PointsChartProps {
  data: PointsDistributionItem[];
}

const REASON_LABELS: Record<string, string> = {
  POST_APPROVED: "게시물 승인",
  ATTENDANCE_REWARD: "출근 보상",
  MANUAL_AWARD: "수동 지급",
  MANUAL_REVOKE: "수동 회수",
};

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
];

export function PointsChart({ data }: PointsChartProps) {
  const normalized = data
    .map((item) => ({
      ...item,
      name: REASON_LABELS[item.reasonCode] || item.reasonCode,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>포인트 사유 분포</CardTitle>
        <CardDescription>
          선택 기간의 reasonCode 별 지급/회수 합계
        </CardDescription>
      </CardHeader>
      <CardContent className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={normalized}
              dataKey="totalAmount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {normalized.map((entry, index) => (
                <Cell
                  key={entry.reasonCode}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                typeof value === "number"
                  ? value.toLocaleString()
                  : String(value ?? "")
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
