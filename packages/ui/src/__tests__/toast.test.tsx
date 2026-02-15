import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../components/toast";

describe("Toast primitives", () => {
  it("renders toast content and accessibility controls", () => {
    render(
      <ToastProvider>
        <Toast open>
          <div>
            <ToastTitle>저장 완료</ToastTitle>
            <ToastDescription>변경 사항이 저장되었습니다.</ToastDescription>
          </div>
          <ToastAction altText="되돌리기">되돌리기</ToastAction>
          <ToastClose aria-label="toast-close" />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByText("저장 완료")).toBeInTheDocument();
    expect(screen.getByText("변경 사항이 저장되었습니다.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "되돌리기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "toast-close" }),
    ).toBeInTheDocument();
  });

  it("applies variant classes for destructive and success", () => {
    const { rerender } = render(
      <ToastProvider>
        <Toast open variant="destructive">
          <ToastTitle>실패</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(
      screen.getByText("실패").closest("[data-state]")?.className,
    ).toContain("destructive");

    rerender(
      <ToastProvider>
        <Toast open variant="success">
          <ToastTitle>성공</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(
      screen.getByText("성공").closest("[data-state]")?.className,
    ).toContain("border-green-500");
  });
});
