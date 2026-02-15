import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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

  it("renders disabled trigger, placeholder, label, and separator", () => {
    render(
      <Select
        open
        onOpenChange={() => undefined}
        value=""
        onValueChange={() => undefined}
      >
        <SelectTrigger aria-label="상태 선택" disabled>
          <SelectValue placeholder="선택된 값 없음" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>현장 상태</SelectLabel>
            <SelectItem value="open">개방</SelectItem>
            <SelectSeparator data-testid="status-separator" />
            <SelectItem value="closed">폐쇄</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", {
      name: "상태 선택",
      hidden: true,
    });

    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("선택된 값 없음");
    expect(screen.getByText("현장 상태")).toBeInTheDocument();
    expect(screen.getByTestId("status-separator")).toBeInTheDocument();
  });
});
