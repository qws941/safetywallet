import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RejectDialog } from "@/components/approvals/reject-dialog";

const { mockToast, mockMutate, mockUseRejectManualRequest } = vi.hoisted(
  () => ({
    mockToast: vi.fn(),
    mockMutate: vi.fn(),
    mockUseRejectManualRequest: vi.fn(),
  }),
);

vi.mock("@safetywallet/ui", async () => {
  const React = await import("react");
  return {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
    Card: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    CardHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    CardTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    CardContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    CardFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    toast: mockToast,
  };
});

vi.mock("@/hooks/use-api", () => ({
  useRejectManualRequest: () => mockUseRejectManualRequest(),
}));

describe("RejectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRejectManualRequest.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("returns null when not open", () => {
    const { container } = render(
      <RejectDialog approvalId="approval-1" isOpen={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows validation toast when reason too short", () => {
    render(<RejectDialog approvalId="approval-1" isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "짧음" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "거절 사유를 5자 이상 입력해주세요.",
      }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits reject mutation and closes dialog", async () => {
    const onClose = vi.fn();
    mockMutate.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<RejectDialog approvalId="approval-1" isOpen onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "근거 부족으로 반려합니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { id: "approval-1", reason: "근거 부족으로 반려합니다" },
        expect.any(Object),
      );
    });
    expect(onClose).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "요청이 거절되었습니다." }),
    );
  });

  it("shows pending state on submit button", () => {
    mockUseRejectManualRequest.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    render(<RejectDialog approvalId="approval-1" isOpen onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "처리 중..." }),
    ).toBeInTheDocument();
  });

  it("shows error toast on mutation failure", async () => {
    mockMutate.mockImplementation(
      (_payload: unknown, options: { onError?: (e: Error) => void }) => {
        options.onError?.(new Error("서버 오류"));
      },
    );

    render(<RejectDialog approvalId="approval-1" isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("거절 사유를 입력하세요"), {
      target: { value: "충분한 거절 사유를 입력합니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });
});
