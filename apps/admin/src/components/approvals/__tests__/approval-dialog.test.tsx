import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalDialog } from "../approval-dialog";
import {
  useCreateManualApproval,
  useMembers,
  useMySites,
} from "@/hooks/use-api";

const toastMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useMySites: vi.fn(),
  useMembers: vi.fn(),
  useCreateManualApproval: vi.fn(),
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
    type,
    placeholder,
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
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

const mockUseMySites = vi.mocked(useMySites);
const mockUseMembers = vi.mocked(useMembers);
const mockUseCreateManualApproval = vi.mocked(useCreateManualApproval);

const toSitesResult = (value: unknown): ReturnType<typeof useMySites> =>
  value as ReturnType<typeof useMySites>;
const toMembersResult = (value: unknown): ReturnType<typeof useMembers> =>
  value as ReturnType<typeof useMembers>;

describe("ApprovalDialog", () => {
  beforeEach(() => {
    toastMock.mockReset();
    mutateMock.mockReset();

    mockUseMySites.mockReturnValue(
      toSitesResult({
        data: [{ siteId: "site-1", siteName: "현장 A" }],
      }),
    );
    mockUseMembers.mockReturnValue(
      toMembersResult({
        data: [{ user: { id: "user-1", name: "홍길동" } }],
      }),
    );
    mockUseCreateManualApproval.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as ReturnType<typeof useCreateManualApproval>);
  });

  it("returns null when closed", () => {
    const { container } = render(
      <ApprovalDialog isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("validates minimum reason length", () => {
    render(<ApprovalDialog isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue("현장 선택..."), {
      target: { value: "site-1" },
    });
    fireEvent.change(screen.getByDisplayValue("작업자 선택..."), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByPlaceholderText("승인 사유를 입력하세요"), {
      target: { value: "짧음" },
    });
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "사유는 10자 이상이어야 합니다.",
      }),
    );
  });

  it("submits and resets on success", async () => {
    const onClose = vi.fn();
    mutateMock.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<ApprovalDialog isOpen onClose={onClose} />);

    fireEvent.change(screen.getByDisplayValue("현장 선택..."), {
      target: { value: "site-1" },
    });
    fireEvent.change(screen.getByDisplayValue("작업자 선택..."), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByPlaceholderText("승인 사유를 입력하세요"), {
      target: { value: "현장 출입 승인 요청" },
    });
    fireEvent.change(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/), {
      target: { value: "2026-03-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          siteId: "site-1",
          reason: "현장 출입 승인 요청",
          validDate: new Date("2026-03-01").toISOString(),
        }),
        expect.any(Object),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows destructive toast on create failure", async () => {
    mutateMock.mockImplementation(
      (_payload, options: { onError?: (e: Error) => void }) => {
        options.onError?.(new Error("실패"));
      },
    );

    render(<ApprovalDialog isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue("현장 선택..."), {
      target: { value: "site-1" },
    });
    fireEvent.change(screen.getByDisplayValue("작업자 선택..."), {
      target: { value: "user-1" },
    });
    fireEvent.change(screen.getByPlaceholderText("승인 사유를 입력하세요"), {
      target: { value: "충분히 긴 승인 사유입니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: expect.stringContaining("승인 생성 실패"),
        }),
      );
    });
  });
});
