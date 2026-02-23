import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";

const mockUsePathname = vi.fn<() => string>();
const mockUseAuthStore = vi.fn();
const mockUseMySites = vi.fn();
const mockQueryClientProvider = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock("@/hooks/use-admin-api", () => ({
  useMySites: () => mockUseMySites(),
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class QueryClient {
    constructor(public options: unknown) {}
  },
  QueryClientProvider: ({
    client,
    children,
  }: {
    client: unknown;
    children: ReactNode;
  }) => {
    mockQueryClientProvider(client);
    return <div data-testid="query-client-provider">{children}</div>;
  },
}));

vi.mock("@safetywallet/ui", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

type ProviderAuthState = {
  user: { id: string } | null;
  isAdmin: boolean;
  _hasHydrated: boolean;
  currentSiteId: string | null;
  setSiteId: (siteId: string) => void;
};

const createAuthState = (overrides?: Partial<ProviderAuthState>) => ({
  ...baseAuthState(),
  ...overrides,
});

function baseAuthState(): ProviderAuthState {
  return {
    user: { id: "u-1" },
    isAdmin: true,
    _hasHydrated: true,
    currentSiteId: "site-1" as string | null,
    setSiteId: vi.fn(),
  };
}

describe("Providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuthStore.mockReturnValue(createAuthState());
    mockUseMySites.mockReturnValue({
      data: [{ siteId: "site-1", siteName: "송도 현장" }],
      isLoading: false,
    });
  });

  it("bypasses gate on login page", () => {
    mockUsePathname.mockReturnValue("/login");
    const setSiteId = vi.fn();
    mockUseAuthStore.mockReturnValue(
      createAuthState({
        _hasHydrated: false,
        currentSiteId: null,
        setSiteId,
      }),
    );

    render(
      <Providers>
        <div>로그인 자식</div>
      </Providers>,
    );

    expect(screen.getByText("로그인 자식")).toBeInTheDocument();
    expect(screen.queryByText("로딩 중...")).not.toBeInTheDocument();
    expect(setSiteId).not.toHaveBeenCalled();
  });

  it("shows hydration loading state", () => {
    mockUseAuthStore.mockReturnValue(createAuthState({ _hasHydrated: false }));

    render(
      <Providers>
        <div>자식</div>
      </Providers>,
    );

    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("renders children when user is missing", () => {
    mockUseAuthStore.mockReturnValue(createAuthState({ user: null }));

    render(
      <Providers>
        <div>콘텐츠</div>
      </Providers>,
    );

    expect(screen.getByText("콘텐츠")).toBeInTheDocument();
  });

  it("renders children when user is not admin", () => {
    mockUseAuthStore.mockReturnValue(createAuthState({ isAdmin: false }));

    render(
      <Providers>
        <div>일반 사용자 콘텐츠</div>
      </Providers>,
    );

    expect(screen.getByText("일반 사용자 콘텐츠")).toBeInTheDocument();
  });

  it("shows site loading when admin has no current site and sites are loading", () => {
    mockUseAuthStore.mockReturnValue(createAuthState({ currentSiteId: null }));
    mockUseMySites.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <Providers>
        <div>숨김 콘텐츠</div>
      </Providers>,
    );

    expect(
      screen.getByText("현장 정보를 불러오는 중입니다..."),
    ).toBeInTheDocument();
  });

  it("shows empty site assignment message when sites list is empty", () => {
    mockUseAuthStore.mockReturnValue(createAuthState({ currentSiteId: null }));
    mockUseMySites.mockReturnValue({ data: [], isLoading: false });

    render(
      <Providers>
        <div>숨김 콘텐츠</div>
      </Providers>,
    );

    expect(
      screen.getByText(
        "배정된 현장이 없습니다. 관리자에게 현장 배정을 요청하세요.",
      ),
    ).toBeInTheDocument();
  });

  it("auto-selects first site when admin has no current site and sites exist", async () => {
    const setSiteId = vi.fn();
    mockUseAuthStore.mockReturnValue(
      createAuthState({ currentSiteId: null, setSiteId }),
    );
    mockUseMySites.mockReturnValue({
      data: [
        { siteId: "site-a", siteName: "A 현장" },
        { siteId: "site-b", siteName: "B 현장" },
      ],
      isLoading: false,
    });

    render(
      <Providers>
        <div>관리자 콘텐츠</div>
      </Providers>,
    );

    await waitFor(() => {
      expect(setSiteId).toHaveBeenCalledWith("site-a");
    });
    expect(screen.getByText("관리자 콘텐츠")).toBeInTheDocument();
  });

  it("does not auto-select when currentSiteId already exists", () => {
    const setSiteId = vi.fn();
    mockUseAuthStore.mockReturnValue(
      createAuthState({ currentSiteId: "site-existing", setSiteId }),
    );

    render(
      <Providers>
        <div>기존 현장 콘텐츠</div>
      </Providers>,
    );

    expect(screen.getByText("기존 현장 콘텐츠")).toBeInTheDocument();
    expect(setSiteId).not.toHaveBeenCalled();
  });

  it("renders QueryClientProvider and Toaster", () => {
    render(
      <Providers>
        <div>래퍼 확인</div>
      </Providers>,
    );

    expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
    expect(mockQueryClientProvider).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
