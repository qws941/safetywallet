import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiInsightsPage from "../page";
import {
  useAnomalyInsights,
  useDuplicateRecommendations,
  useIssueTriage,
  usePolicyQuery,
  useReviewCopilot,
  useSummaryReport,
} from "@/hooks/use-ai-insights-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/ai-insights",
}));

vi.mock("@/hooks/use-ai-insights-api", () => ({
  useIssueTriage: vi.fn(),
  useReviewCopilot: vi.fn(),
  useDuplicateRecommendations: vi.fn(),
  useSummaryReport: vi.fn(),
  useAnomalyInsights: vi.fn(),
  usePolicyQuery: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
  Badge: ({ children, variant }: { children: ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
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
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
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
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    />
  ),
}));

const mockUseIssueTriage = vi.mocked(useIssueTriage);
const mockUseReviewCopilot = vi.mocked(useReviewCopilot);
const mockUseDuplicateRecommendations = vi.mocked(useDuplicateRecommendations);
const mockUseSummaryReport = vi.mocked(useSummaryReport);
const mockUseAnomalyInsights = vi.mocked(useAnomalyInsights);
const mockUsePolicyQuery = vi.mocked(usePolicyQuery);

const toQueryResult = (value: unknown) => value as never;

function setupDefaultMocks() {
  mockUseIssueTriage.mockReturnValue(
    toQueryResult({ data: { items: [] }, isLoading: false }),
  );
  mockUseReviewCopilot.mockReturnValue(
    toQueryResult({
      data: { reviewCopilot: { overview: [], suggestedChecklist: [] } },
      isLoading: false,
    }),
  );
  mockUseDuplicateRecommendations.mockReturnValue(
    toQueryResult({ data: { candidates: [] }, isLoading: false }),
  );
  mockUseSummaryReport.mockReturnValue(
    toQueryResult({ data: undefined, isLoading: false }),
  );
  mockUseAnomalyInsights.mockReturnValue(
    toQueryResult({ data: { anomalies: [] }, isLoading: false }),
  );
  mockUsePolicyQuery.mockReturnValue(
    toQueryResult({ data: undefined, isFetching: false }),
  );
}

describe("AiInsightsPage", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it("renders page title", () => {
    render(<AiInsightsPage />);
    expect(screen.getByText("AI 운영 인사이트")).toBeInTheDocument();
  });

  it("shows loading banner when any query is loading", () => {
    mockUseIssueTriage.mockReturnValue(
      toQueryResult({ data: { items: [] }, isLoading: true }),
    );
    render(<AiInsightsPage />);
    expect(
      screen.getByText("최신 인사이트를 계산 중입니다."),
    ).toBeInTheDocument();
  });

  it("does not show loading banner when all queries are done", () => {
    render(<AiInsightsPage />);
    expect(
      screen.queryByText("최신 인사이트를 계산 중입니다."),
    ).not.toBeInTheDocument();
  });

  it("renders KPI chips when summary data is available", () => {
    mockUseSummaryReport.mockReturnValue(
      toQueryResult({
        data: {
          kpi: {
            totalPosts: 150,
            pendingPosts: 10,
            urgentPosts: 3,
            totalPointAmount: 5000,
          },
          summaryReport: ["요약 내용 1"],
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("제보")).toBeInTheDocument();
    expect(screen.getByText("150건")).toBeInTheDocument();
    expect(screen.getByText("검토대기")).toBeInTheDocument();
    expect(screen.getByText("10건")).toBeInTheDocument();
    expect(screen.getByText("긴급")).toBeInTheDocument();
    expect(screen.getByText("3건")).toBeInTheDocument();
    expect(screen.getByText("포인트")).toBeInTheDocument();
    expect(screen.getByText("5,000점")).toBeInTheDocument();
  });

  it("renders triage items", () => {
    mockUseIssueTriage.mockReturnValue(
      toQueryResult({
        data: {
          items: [
            {
              id: "t-1",
              category: "안전",
              riskLevel: "HIGH",
              isUrgent: true,
              score: 95,
              preview: "위험 상황 발견",
              reasons: ["미조치", "긴급"],
            },
          ],
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("위험 상황 발견")).toBeInTheDocument();
    expect(screen.getByText("안전")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("URGENT")).toBeInTheDocument();
    expect(screen.getByText("점수 95")).toBeInTheDocument();
    expect(screen.getByText("미조치 · 긴급")).toBeInTheDocument();
  });

  it("shows empty triage message", () => {
    render(<AiInsightsPage />);
    expect(screen.getByText("추천 항목이 없습니다.")).toBeInTheDocument();
  });

  it("renders review copilot checklist", () => {
    mockUseReviewCopilot.mockReturnValue(
      toQueryResult({
        data: {
          reviewCopilot: {
            overview: ["개요 1"],
            suggestedChecklist: ["체크 1", "체크 2"],
          },
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("개요 1")).toBeInTheDocument();
    expect(screen.getByText("- 체크 1")).toBeInTheDocument();
    expect(screen.getByText("- 체크 2")).toBeInTheDocument();
  });

  it("renders duplicate candidates", () => {
    mockUseDuplicateRecommendations.mockReturnValue(
      toQueryResult({
        data: {
          candidates: [
            {
              sourcePostId: "p-1",
              targetPostId: "p-2",
              similarity: 85,
              reason: "동일 위치",
              sourcePreview: "출입구 위험",
              targetPreview: "현관 위험",
            },
          ],
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("유사도 85%")).toBeInTheDocument();
    expect(screen.getByText("동일 위치")).toBeInTheDocument();
    expect(screen.getByText("A: 출입구 위험")).toBeInTheDocument();
    expect(screen.getByText("B: 현관 위험")).toBeInTheDocument();
  });

  it("shows empty duplicates message", () => {
    render(<AiInsightsPage />);
    expect(screen.getByText("중복 후보가 없습니다.")).toBeInTheDocument();
  });

  it("renders summary report lines", () => {
    mockUseSummaryReport.mockReturnValue(
      toQueryResult({
        data: {
          kpi: {
            totalPosts: 10,
            pendingPosts: 2,
            urgentPosts: 1,
            totalPointAmount: 100,
          },
          summaryReport: ["리포트 라인 1", "리포트 라인 2"],
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("리포트 라인 1")).toBeInTheDocument();
    expect(screen.getByText("리포트 라인 2")).toBeInTheDocument();
  });

  it("shows empty summary message", () => {
    render(<AiInsightsPage />);
    expect(screen.getByText("요약 리포트 준비 중입니다.")).toBeInTheDocument();
  });

  it("renders anomaly items", () => {
    mockUseAnomalyInsights.mockReturnValue(
      toQueryResult({
        data: {
          anomalies: [
            {
              type: "출근",
              day: "2026-03-01",
              message: "출근 급감",
              value: 5,
              baseline: 50,
              deviationRate: 90,
            },
          ],
        },
        isLoading: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("출근")).toBeInTheDocument();
    expect(screen.getByText("2026-03-01")).toBeInTheDocument();
    expect(screen.getByText("출근 급감")).toBeInTheDocument();
    expect(screen.getByText(/값 5/)).toBeInTheDocument();
  });

  it("shows empty anomalies message", () => {
    render(<AiInsightsPage />);
    expect(
      screen.getByText("탐지된 이상 징후가 없습니다."),
    ).toBeInTheDocument();
  });

  it("handles policy query input", () => {
    render(<AiInsightsPage />);
    const input = screen.getByPlaceholderText("예: 지각 감점 정책 한도는?");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, {
      target: { value: "포인트 정책" },
    });
    expect(input).toHaveValue("포인트 정책");
  });

  it("renders policy answer lines", () => {
    mockUsePolicyQuery.mockReturnValue(
      toQueryResult({
        data: { answer: ["정책 답변 라인 1"] },
        isFetching: false,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("정책 답변 라인 1")).toBeInTheDocument();
  });

  it("shows policy fetching state", () => {
    mockUsePolicyQuery.mockReturnValue(
      toQueryResult({
        data: undefined,
        isFetching: true,
      }),
    );
    render(<AiInsightsPage />);
    expect(screen.getByText("정책 답변 생성 중...")).toBeInTheDocument();
  });
});
