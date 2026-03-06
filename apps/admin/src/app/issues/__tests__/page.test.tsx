import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IssuesPage from "../page";
import {
  useIssues,
  useCreateIssue,
  useIssueTemplates,
} from "@/hooks/use-issues-api";

const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));
const mutateAsyncMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/issues",
}));

vi.mock("@/hooks/use-issues-api", () => ({
  useIssues: vi.fn(),
  useCreateIssue: vi.fn(),
  useIssueTemplates: vi.fn(),
}));

vi.mock("../issue-template", () => ({
  buildIssueBody: vi.fn(() => "formatted body"),
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
    variant?: string;
  }) => (
    <button
      type={type ?? "button"}
      disabled={disabled}
      data-variant={variant}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <input
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    />
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Dialog: ({
    children,
    open,
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => <div data-open={open}>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  DialogTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-value={value} data-testid="select-wrapper">
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  useToast: () => ({ toast: toastFn }),
}));

const mockUseIssues = vi.mocked(useIssues);
const mockUseCreateIssue = vi.mocked(useCreateIssue);
const mockUseIssueTemplates = vi.mocked(useIssueTemplates);

const toIssuesResult = (value: unknown): ReturnType<typeof useIssues> =>
  value as never;

const sampleIssues = [
  {
    number: 1,
    title: "테스트 이슈",
    body: "이슈 내용",
    state: "open" as const,
    html_url: "https://github.com/org/repo/issues/1",
    created_at: "2026-03-01T00:00:00Z",
    user: { login: "testuser" },
    labels: [{ name: "bug", color: "d73a4a" }],
  },
];

const sampleTemplates = [
  {
    slug: "bug-report",
    name: "버그 리포트",
    labels: ["bug"],
    fields: [
      {
        id: "description",
        label: "설명",
        type: "textarea" as const,
        required: true,
        placeholder: "버그를 설명하세요",
      },
    ],
  },
];

describe("IssuesPage", () => {
  beforeEach(() => {
    toastFn.mockReset();
    mutateAsyncMock.mockReset();

    mockUseIssues.mockReturnValue(
      toIssuesResult({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      }),
    );
    mockUseCreateIssue.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as never);
    mockUseIssueTemplates.mockReturnValue({
      data: sampleTemplates,
      isLoading: false,
    } as never);
  });

  it("renders page title", () => {
    render(<IssuesPage />);
    expect(screen.getByText("이슈 관리")).toBeInTheDocument();
  });

  it("shows empty state when no issues", () => {
    render(<IssuesPage />);
    expect(screen.getByText("등록된 이슈가 없습니다")).toBeInTheDocument();
  });

  it("renders issue list", () => {
    mockUseIssues.mockReturnValue(
      toIssuesResult({
        data: sampleIssues,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      }),
    );
    render(<IssuesPage />);
    expect(screen.getByText("테스트 이슈")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const refetchMock = vi.fn();
    mockUseIssues.mockReturnValue(
      toIssuesResult({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("API 실패"),
        refetch: refetchMock,
        isFetching: false,
      }),
    );
    render(<IssuesPage />);
    expect(screen.getByText("API 실패")).toBeInTheDocument();
    fireEvent.click(screen.getByText("다시 시도"));
    expect(refetchMock).toHaveBeenCalled();
  });

  it("submits new issue via dialog form", async () => {
    mutateAsyncMock.mockResolvedValue({});
    render(<IssuesPage />);

    // Click "이슈 등록" button to open dialog
    fireEvent.click(screen.getAllByText("이슈 등록")[0]);

    // Fill title
    const titleInput = screen.getByPlaceholderText("이슈 제목을 입력하세요");
    fireEvent.change(titleInput, { target: { value: "새 이슈" } });

    // Fill required textarea field
    const textarea = screen.getByPlaceholderText("버그를 설명하세요");
    fireEvent.change(textarea, { target: { value: "상세 설명" } });

    // Submit
    const submitButtons = screen.getAllByText("이슈 등록");
    const submitBtn = submitButtons.find(
      (el) => el.getAttribute("type") === "submit",
    );
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "새 이슈",
          body: "formatted body",
          labels: ["bug"],
          assignCodex: true,
        }),
      );
    });
  });

  it("shows toast on successful issue creation", async () => {
    mutateAsyncMock.mockResolvedValue({});
    render(<IssuesPage />);

    fireEvent.click(screen.getAllByText("이슈 등록")[0]);
    const titleInput = screen.getByPlaceholderText("이슈 제목을 입력하세요");
    fireEvent.change(titleInput, { target: { value: "성공 이슈" } });
    const textarea = screen.getByPlaceholderText("버그를 설명하세요");
    fireEvent.change(textarea, { target: { value: "설명" } });

    const submitButtons = screen.getAllByText("이슈 등록");
    const submitBtn = submitButtons.find(
      (el) => el.getAttribute("type") === "submit",
    );
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ description: "이슈가 등록되었습니다." }),
      );
    });
  });

  it("shows error toast on failed issue creation", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("등록 실패"));
    render(<IssuesPage />);

    fireEvent.click(screen.getAllByText("이슈 등록")[0]);
    const titleInput = screen.getByPlaceholderText("이슈 제목을 입력하세요");
    fireEvent.change(titleInput, { target: { value: "실패 이슈" } });
    const textarea = screen.getByPlaceholderText("버그를 설명하세요");
    fireEvent.change(textarea, { target: { value: "설명" } });

    const submitButtons = screen.getAllByText("이슈 등록");
    const submitBtn = submitButtons.find(
      (el) => el.getAttribute("type") === "submit",
    );
    if (submitBtn) fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "등록 실패",
        }),
      );
    });
  });
});
