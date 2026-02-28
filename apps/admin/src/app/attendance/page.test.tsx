import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./page";
import { useAttendanceLogs, useUnmatchedRecords } from "@/hooks/use-attendance";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/hooks/use-attendance", () => ({
  useAttendanceLogs: vi.fn(),
  useUnmatchedRecords: vi.fn(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("./components/attendance-stats", () => ({
  AttendanceStats: ({ total }: { total: number }) => (
    <div data-testid="attendance-stats">stats:{total}</div>
  ),
}));

vi.mock("./components/attendance-logs-tab", () => ({
  AttendanceLogsTab: () => (
    <div data-testid="attendance-logs-tab">logs-tab</div>
  ),
}));

vi.mock("./components/unmatched-tab", () => ({
  UnmatchedTab: () => <div data-testid="unmatched-tab">unmatched-tab</div>,
}));

const mockUseAttendanceLogs = vi.mocked(useAttendanceLogs);
const mockUseUnmatchedRecords = vi.mocked(useUnmatchedRecords);
const mockUseAuthStore = vi.mocked(useAuthStore);

const toAttendanceLogsResult = (
  value: unknown,
): ReturnType<typeof useAttendanceLogs> => value as never;

const toUnmatchedResult = (
  value: unknown,
): ReturnType<typeof useUnmatchedRecords> => value as never;

describe("AttendancePage", () => {
  beforeEach(() => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        currentSiteId: "site-1",
      } as Parameters<typeof selector>[0]),
    );

    mockUseAttendanceLogs.mockReturnValue(
      toAttendanceLogsResult({
        data: {
          logs: [
            {
              id: "log-1",
              userName: "홍길동",
              result: "SUCCESS",
              checkinAt: "2026-02-22T01:00:00.000Z",
            },
          ],
        },
        isLoading: false,
      }),
    );

    mockUseUnmatchedRecords.mockReturnValue(
      toUnmatchedResult({
        data: {
          records: [{ id: "unmatched-1" }, { id: "unmatched-2" }],
        },
        isLoading: false,
      }),
    );
  });

  it("renders attendance heading and default logs tab", () => {
    render(<AttendancePage />);

    expect(screen.getByText("출근 현황")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-stats")).toHaveTextContent("stats:1");
    expect(screen.getByTestId("attendance-logs-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("unmatched-tab")).not.toBeInTheDocument();
  });

  it("switches to unmatched tab and shows unmatched badge count", () => {
    render(<AttendancePage />);

    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /미매칭 기록/ }));

    expect(screen.getByTestId("unmatched-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("attendance-logs-tab")).not.toBeInTheDocument();
  });
});
