import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttendanceGuard } from "@/components/attendance-guard";
import { useAttendanceToday } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({ useAttendanceToday: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));

describe("AttendanceGuard", () => {
  it("returns nothing when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: null,
      isAuthenticated: false,
      user: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useAttendanceToday>);

    const { container } = render(
      <AttendanceGuard>
        <div>protected</div>
      </AttendanceGuard>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows loading state while attendance is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      user: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAttendanceToday>);

    render(
      <AttendanceGuard>
        <div>protected</div>
      </AttendanceGuard>,
    );

    expect(
      screen.getByText("components.attendanceCheckingLabel"),
    ).toBeInTheDocument();
  });

  it("shows default warning when user has not attended", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      user: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: { attended: false, checkinAt: null },
      isLoading: false,
    } as ReturnType<typeof useAttendanceToday>);

    render(
      <AttendanceGuard>
        <div>protected</div>
      </AttendanceGuard>,
    );

    expect(
      screen.getByText("components.attendanceRequiredTitle"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("components.attendanceRequiredDescription"),
    ).toBeInTheDocument();
  });

  it("renders fallback when user has not attended and fallback provided", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      user: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: { attended: false, checkinAt: null },
      isLoading: false,
    } as ReturnType<typeof useAttendanceToday>);

    render(
      <AttendanceGuard fallback={<div>custom fallback</div>}>
        <div>protected</div>
      </AttendanceGuard>,
    );

    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(
      screen.queryByText("components.attendanceRequiredTitle"),
    ).not.toBeInTheDocument();
  });

  it("renders children when attendance confirmed", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      user: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: { attended: true, checkinAt: "2026-01-01T09:00:00.000Z" },
      isLoading: false,
    } as ReturnType<typeof useAttendanceToday>);

    render(
      <AttendanceGuard>
        <div>protected</div>
      </AttendanceGuard>,
    );

    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});
