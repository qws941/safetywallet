"use client";

import { Button, Input } from "@safetywallet/ui";

export type DatePresetKey = "7d" | "30d" | "90d" | "custom";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  preset: DatePresetKey;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(
  days: number,
): Pick<DateRangeValue, "startDate" | "endDate"> {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export function getInitialDateRange(): DateRangeValue {
  const initial = getPresetRange(30);
  return {
    ...initial,
    preset: "30d",
  };
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const applyPreset = (preset: Exclude<DatePresetKey, "custom">) => {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    onChange({
      ...getPresetRange(days),
      preset,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value.preset === "7d" ? "default" : "outline"}
          onClick={() => applyPreset("7d")}
        >
          최근 7일
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === "30d" ? "default" : "outline"}
          onClick={() => applyPreset("30d")}
        >
          최근 30일
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === "90d" ? "default" : "outline"}
          onClick={() => applyPreset("90d")}
        >
          최근 90일
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={value.startDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({
              ...value,
              preset: "custom",
              startDate: e.target.value,
            })
          }
          className="w-44"
        />
        <span className="text-muted-foreground text-sm">~</span>
        <Input
          type="date"
          value={value.endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({
              ...value,
              preset: "custom",
              endDate: e.target.value,
            })
          }
          className="w-44"
        />
      </div>
    </div>
  );
}
