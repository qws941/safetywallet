export const PERIOD_OPTIONS = [
  { value: "60", label: "최근 1시간" },
  { value: "360", label: "최근 6시간" },
  { value: "1440", label: "최근 24시간" },
  { value: "10080", label: "최근 7일" },
];

export function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTime(bucket: string): string {
  const d = new Date(bucket);
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export function getErrorRateColor(rate: number): string {
  if (rate >= 10) return "text-red-600";
  if (rate >= 5) return "text-orange-500";
  if (rate >= 1) return "text-yellow-500";
  return "text-green-600";
}

export function getErrorRateBadge(rate: number) {
  if (rate >= 10) return "destructive" as const;
  if (rate >= 5) return "secondary" as const;
  return "outline" as const;
}
