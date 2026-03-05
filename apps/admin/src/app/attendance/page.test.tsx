import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./page";
import { useAttendanceLogs } from "@/hooks/use-attendance";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/hooks/use-attendance", () => ({
  useAttendanceLogs: vi.fn(),
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

const mockUseAttendanceLogs = vi.mocked(useAttendanceLogs);
const mockUseAuthStore = vi.mocked(useAuthStore);

const toAttendanceLogsResult = (
  value: unknown,
): ReturnType<typeof useAttendanceLogs> => value as never;

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
  });

  it("renders attendance heading and default logs tab", () => {
    render(<AttendancePage />);

    expect(screen.getByText("출근 현황")).toBeInTheDocument();
    expect(screen.getByTestId("attendance-stats")).toHaveTextContent("stats:1");
    expect(screen.getByTestId("attendance-logs-tab")).toBeInTheDocument();
    expect(screen.getByText("연동 현황")).toBeInTheDocument();
  });
});
