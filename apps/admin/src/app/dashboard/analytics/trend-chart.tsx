"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@safetywallet/ui";

interface TrendPoint {
  date: string;
  count: number;
  category?: string;
}

interface DailySeriesItem {
  date: string;
  posts: number;
  attendance: number;
}

interface TrendChartProps {
  postsTrend: TrendPoint[];
  attendanceTrend: TrendPoint[];
}

interface CategoryBarItem {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  HAZARD: "위험 요소",
  UNSAFE_BEHAVIOR: "불안전 행동",
  INCONVENIENCE: "불편 사항",
  SUGGESTION: "개선 제안",
  BEST_PRACTICE: "우수 사례",
};

function normalizeDailySeries(
  postsTrend: TrendPoint[],
  attendanceTrend: TrendPoint[],
): DailySeriesItem[] {
  const map = new Map<string, DailySeriesItem>();

  for (const row of postsTrend) {
    const current = map.get(row.date) ?? {
      date: row.date,
      posts: 0,
      attendance: 0,
    };
    current.posts += row.count;
    map.set(row.date, current);
  }

  for (const row of attendanceTrend) {
    const current = map.get(row.date) ?? {
      date: row.date,
      posts: 0,
      attendance: 0,
    };
    current.attendance += row.count;
    map.set(row.date, current);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildCategoryBars(postsTrend: TrendPoint[]): CategoryBarItem[] {
  const categoryMap = new Map<string, number>();

  for (const row of postsTrend) {
    const category = row.category || "UNKNOWN";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + row.count);
  }

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category: CATEGORY_LABELS[category] || category,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function TrendChart({ postsTrend, attendanceTrend }: TrendChartProps) {
  const dailySeries = normalizeDailySeries(postsTrend, attendanceTrend);
  const categoryBars = buildCategoryBars(postsTrend);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>일별 추이</CardTitle>
          <CardDescription>
            게시물/출근 집계를 동일 기간으로 비교합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="posts"
                name="게시물"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                name="출근"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>카테고리별 게시물</CardTitle>
          <CardDescription>선택 기간 기준 카테고리 분포입니다</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                interval={0}
                angle={-20}
                textAnchor="end"
                height={72}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                name="건수"
                fill="#7c3aed"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
