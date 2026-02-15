import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalDialog } from "@/components/approvals/approval-dialog";

const {
  mockToast,
  mockMutate,
  mockUseMySites,
  mockUseMembers,
  mockUseCreateManualApproval,
} = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockMutate: vi.fn(),
  mockUseMySites: vi.fn(),
  mockUseMembers: vi.fn(),
  mockUseCreateManualApproval: vi.fn(),
}));

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
  useMySites: () => mockUseMySites(),
  useMembers: (siteId?: string) => mockUseMembers(siteId),
  useCreateManualApproval: () => mockUseCreateManualApproval(),
}));

describe("ApprovalDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMySites.mockReturnValue({
      data: [{ siteId: "site-1", siteName: "서울 현장" }],
    });
    mockUseMembers.mockReturnValue({
      data: [
        {
          user: { id: "user-1", nameMasked: "홍길동", phone: "010-1234-5678" },
        },
      ],
    });
    mockUseCreateManualApproval.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it("returns null when closed", () => {
    const { container } = render(
      <ApprovalDialog isOpen={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows validation toast for short reason", () => {
    render(<ApprovalDialog isOpen onClose={vi.fn()} />);

    const [siteSelect, memberSelect] = screen.getAllByRole("combobox");

    fireEvent.change(siteSelect, {
      target: { value: "site-1" },
    });
    fireEvent.change(memberSelect, {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByPlaceholderText("승인 사유를 입력하세요"), {
      target: { value: "짧음" },
    });
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "사유는 10자 이상이어야 합니다.",
      }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits approval request with selected values", async () => {
    const onClose = vi.fn();
    mockMutate.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<ApprovalDialog isOpen onClose={onClose} />);

    const [siteSelect, memberSelect] = screen.getAllByRole("combobox");
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);

    fireEvent.change(siteSelect, {
      target: { value: "site-1" },
    });
    fireEvent.change(memberSelect, {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByPlaceholderText("승인 사유를 입력하세요"), {
      target: { value: "수동 승인 사유 충분히 입력" },
    });
    fireEvent.change(dateInput, {
      target: { value: "2026-02-14" },
    });

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          siteId: "site-1",
          reason: "수동 승인 사유 충분히 입력",
        }),
        expect.any(Object),
      );
    });
    expect(onClose).toHaveBeenCalled();
  });
});
