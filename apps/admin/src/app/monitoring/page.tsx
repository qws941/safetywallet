"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import { Activity } from "lucide-react";
import {
  useMonitoringSummary,
  useMonitoringMetrics,
  useMonitoringTopErrors,
} from "@/hooks/use-monitoring-api";
import { SummaryCards } from "./components/summary-cards";
import { TimeSeriesChart } from "./components/time-series-chart";
import { EndpointsTable } from "./components/endpoints-table";
import { ErrorsTable } from "./components/errors-table";
import { PERIOD_OPTIONS } from "./components/helpers";

export default function MonitoringPage() {
  const [period, setPeriod] = useState("60");
  const periodMinutes = Number(period);

  const from = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - periodMinutes);
    return d.toISOString();
  }, [periodMinutes]);

  const { data: summary, isLoading: summaryLoading } =
    useMonitoringSummary(periodMinutes);

  const { data: timeMetrics, isLoading: timeLoading } = useMonitoringMetrics(
    "time",
    from,
  );

  const { data: endpointMetrics, isLoading: endpointLoading } =
    useMonitoringMetrics("endpoint", from);

  const { data: topErrors, isLoading: errorsLoading } =
    useMonitoringTopErrors(from);

  const maxRequests = useMemo(() => {
    if (!timeMetrics?.rows?.length) return 1;
    return Math.max(...timeMetrics.rows.map((r) => r.totalRequests), 1);
  }, [timeMetrics]);

  const maxEndpointRequests = useMemo(() => {
    if (!endpointMetrics?.rows?.length) return 1;
    return Math.max(...endpointMetrics.rows.map((r) => r.totalRequests), 1);
  }, [endpointMetrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            운영 모니터링
          </h1>
          <p className="text-muted-foreground mt-1">
            API 성능 및 에러율 실시간 모니터링
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {/* Time Series Chart */}
      <TimeSeriesChart
        timeMetrics={timeMetrics}
        isLoading={timeLoading}
        maxRequests={maxRequests}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EndpointsTable
          endpointMetrics={endpointMetrics}
          isLoading={endpointLoading}
          maxEndpointRequests={maxEndpointRequests}
        />
        <ErrorsTable topErrors={topErrors} isLoading={errorsLoading} />
      </div>
    </div>
  );
}
