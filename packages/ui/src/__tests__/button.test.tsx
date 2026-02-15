import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "../components/button";

describe("Button", () => {
  it("renders without crash and applies default classes", () => {
    render(<Button>저장</Button>);

    const button = screen.getByRole("button", { name: "저장" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("h-10");
  });

  it("applies variant and size classes correctly", () => {
    render(
      <Button variant="destructive" size="lg">
        삭제
      </Button>,
    );

    const button = screen.getByRole("button", { name: "삭제" });
    expect(button.className).toContain("bg-destructive");
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("px-8");
  });

  it("handles click interaction and disabled state", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>클릭</Button>);

    fireEvent.click(screen.getByRole("button", { name: "클릭" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        클릭
      </Button>,
    );

    expect(screen.getByRole("button", { name: "클릭" })).toBeDisabled();
  });

  it("exposes utility variants for consumers", () => {
    expect(buttonVariants({ variant: "outline", size: "sm" })).toContain(
      "border",
    );
    expect(buttonVariants({ variant: "link" })).toContain("underline");
  });
});
