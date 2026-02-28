import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TbmTab } from "../tbm-tab";
import {
  useCreateTbmRecord,
  useTbmRecord,
  useTbmRecords,
} from "@/hooks/use-api";

const toastMock = vi.fn();
const createAsyncMock = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-api", () => ({
  useCreateTbmRecord: vi.fn(),
  useTbmRecord: vi.fn(),
  useTbmRecords: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? "button"} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  useToast: () => ({ toast: toastMock }),
}));

const mockUseTbmRecords = vi.mocked(useTbmRecords);
const mockUseTbmRecord = vi.mocked(useTbmRecord);
const mockUseCreateTbmRecord = vi.mocked(useCreateTbmRecord);

describe("tbm tab", () => {
  beforeEach(() => {
    toastMock.mockReset();
    createAsyncMock.mockReset();

    mockUseTbmRecords.mockReturnValue({
      data: {
        records: [
          {
            tbm: {
              id: "tbm1",
              date: "2026-02-01",
              topic: "아침 TBM",
              weatherCondition: "맑음",
            },
            leaderName: "홍길동",
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useTbmRecords>);
    mockUseTbmRecord.mockReturnValue({
      data: {
        attendeeCount: 1,
        attendees: [
          {
            attendee: { id: "a1", attendedAt: "2026-02-01T01:00:00.000Z" },
            userName: "김철수",
          },
        ],
      },
    } as ReturnType<typeof useTbmRecord>);
    mockUseCreateTbmRecord.mockReturnValue({
      mutateAsync: createAsyncMock,
    } as ReturnType<typeof useCreateTbmRecord>);
  });

  it("creates tbm record", async () => {
    render(<TbmTab />);
    fireEvent.change(screen.getByPlaceholderText("주제"), {
      target: { value: "안전 점검" },
    });
    fireEvent.change(screen.getByDisplayValue(""), {
      target: { value: "2026-02-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "TBM 등록" }));

    await waitFor(() => {
      expect(createAsyncMock).toHaveBeenCalled();
    });
  });

  it("renders list and attendee details", () => {
    render(<TbmTab />);
    expect(screen.getByText("아침 TBM")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "참석자 보기" }));
    expect(screen.getByText(/참석자 목록/)).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
  });
});
