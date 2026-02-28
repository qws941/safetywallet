import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker, getInitialDateRange } from "./date-range-picker";

describe("DateRangePicker", () => {
  it("provides initial 30-day preset", () => {
    const initial = getInitialDateRange();
    expect(initial.preset).toBe("30d");
    expect(initial.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(initial.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("emits preset and custom range changes", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          preset: "30d",
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "최근 7일" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: "7d",
      }),
    );

    const dateInputs = screen.getAllByDisplayValue(/2026-02/);
    fireEvent.change(dateInputs[0], { target: { value: "2026-01-01" } });
    expect(onChange).toHaveBeenCalledWith({
      startDate: "2026-01-01",
      endDate: "2026-02-28",
      preset: "custom",
    });
  });
});
