import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeletePolicyDialog } from "../delete-policy-dialog";

vi.mock("@safetywallet/ui", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

describe("DeletePolicyDialog", () => {
  it("renders confirmation copy and confirms delete", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeletePolicyDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("정책 삭제")).toBeInTheDocument();
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
