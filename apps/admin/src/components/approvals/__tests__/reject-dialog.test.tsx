import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RejectDialog } from "../reject-dialog";
import { useRejectManualRequest } from "@/hooks/use-api";

const toastMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useRejectManualRequest: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    />
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  toast: toastMock,
}));

const mockUseRejectManualRequest = vi.mocked(useRejectManualRequest);

describe("RejectDialog", () => {
  beforeEach(() => {
    toastMock.mockReset();
    mutateMock.mockReset();
    mockUseRejectManualRequest.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as ReturnType<typeof useRejectManualRequest>);
  });

  it("returns null when closed", () => {
    const { container } = render(
      <RejectDialog isOpen={false} onClose={vi.fn()} approvalId="ap-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("validates rejection reason length", () => {
    render(<RejectDialog isOpen onClose={vi.fn()} approvalId="ap-1" />);

    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "짧음" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "거절 사유를 5자 이상 입력해주세요.",
      }),
    );
  });

  it("submits rejection and closes dialog on success", async () => {
    const onClose = vi.fn();
    mutateMock.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<RejectDialog isOpen onClose={onClose} approvalId="ap-1" />);

    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "요건 불충족" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        { id: "ap-1", reason: "요건 불충족" },
        expect.any(Object),
      );
      expect(onClose).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "요청이 거절되었습니다." }),
      );
    });
  });

  it("shows error toast on mutation failure", async () => {
    mutateMock.mockImplementation(
      (_payload, options: { onError?: (e: Error) => void }) => {
        options.onError?.(new Error("실패"));
      },
    );

    render(<RejectDialog isOpen onClose={vi.fn()} approvalId="ap-1" />);

    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "거절 사유 테스트" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: expect.stringContaining("거절 실패"),
        }),
      );
    });
  });
});
