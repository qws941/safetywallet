import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsafeWarningModal } from "@/components/unsafe-warning-modal";

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@safetywallet/ui", () => ({
  AlertDialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (nextOpen: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          close-dialog
        </button>
        {children}
      </div>
    ) : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("UnsafeWarningModal", () => {
  it("renders translated content when open", () => {
    render(<UnsafeWarningModal open onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.getByText("components.unsafeWarningTitle"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("components.unsafeWarningImprovementNote"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("components.unsafeWarningPrivacyNote"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("components.unsafeWarningAdminNote"),
    ).toBeInTheDocument();
  });

  it("calls cancel and confirm handlers from buttons", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <UnsafeWarningModal open onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    fireEvent.click(
      screen.getByRole("button", { name: "components.unsafeWarningConfirm" }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when dialog closes via onOpenChange(false)", () => {
    const onCancel = vi.fn();
    render(<UnsafeWarningModal open onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "close-dialog" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not render when open is false", () => {
    render(
      <UnsafeWarningModal
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });
});
