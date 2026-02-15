import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Switch } from "../components/switch";

describe("Switch", () => {
  it("toggles checked state via click interaction", () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch aria-label="알림 스위치" onCheckedChange={onCheckedChange} />,
    );

    const toggle = screen.getByRole("switch", { name: "알림 스위치" });
    expect(toggle).toHaveAttribute("data-state", "unchecked");

    fireEvent.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

describe("Select", () => {
  it("renders options and allows selection when controlled open", () => {
    const onValueChange = vi.fn();

    render(
      <Select open onOpenChange={() => undefined} onValueChange={onValueChange}>
        <SelectTrigger aria-label="카테고리 선택">
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hazard">위험</SelectItem>
          <SelectItem value="safe">안전</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", {
      name: "카테고리 선택",
      hidden: true,
    });
    expect(trigger.className).toContain("border-input");

    const hazardOption = screen.getByRole("option", { name: "위험" });
    expect(hazardOption).toBeInTheDocument();

    fireEvent.click(hazardOption);

    expect(onValueChange).toHaveBeenCalledWith("hazard");
  });
});
