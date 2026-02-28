import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/profile/page";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useSiteInfo, useLeaveSite } from "@/hooks/use-api";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { getMockRouter } from "@/__tests__/mocks";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({
  useProfile: vi.fn(),
  useSiteInfo: vi.fn(),
  useLeaveSite: vi.fn(),
}));
vi.mock("@/hooks/use-push-subscription", () => ({
  usePushSubscription: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));
vi.mock("@safetywallet/ui", async () => {
  const actual = await vi.importActual("@safetywallet/ui");
  return {
    ...actual,
    AlertDialog: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogTrigger: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogHeader: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogTitle: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogDescription: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogFooter: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogCancel: ({ children }: { children: ReactNode }) => (
      <button type="button">{children}</button>
    ),
    AlertDialogAction: ({
      children,
      onClick,
      disabled,
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  };
});

describe("app/profile/page", () => {
  const logout = vi.fn();
  const setCurrentSite = vi.fn();
  const replaceSpy = vi
    .spyOn(window.location, "replace")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      logout,
      currentSiteId: "site-1",
      setCurrentSite,
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
    });
    vi.mocked(useProfile).mockReturnValue({
      data: { data: { user: { nameMasked: "홍*동", phone: "010-1111-2222" } } },
      isLoading: false,
    } as never);
    vi.mocked(useSiteInfo).mockReturnValue({
      data: { data: { site: { name: "송도현장", address: "인천" } } },
    } as never);
    vi.mocked(useLeaveSite).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: false,
      error: "",
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("renders profile and site info", () => {
    render(<ProfilePage />);
    expect(screen.getByText("홍*동")).toBeInTheDocument();
    expect(screen.getByText("송도현장")).toBeInTheDocument();
  });

  it("handles logout action", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /profile\.logout/ }));
    expect(logout).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith("/login/");
  });

  it("handles leave-site success", async () => {
    const mutate = vi.fn(
      (_payload: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    vi.mocked(useLeaveSite).mockReturnValue({
      mutate,
      isPending: false,
    } as never);

    render(<ProfilePage />);

    const leaveButtons = screen.getAllByRole("button", {
      name: /profile\.leaveSiteButton/,
    });
    fireEvent.click(leaveButtons[0]);
    fireEvent.click(leaveButtons[1]);

    await waitFor(() => {
      expect(setCurrentSite).toHaveBeenCalledWith(null);
      expect(getMockRouter().replace).toHaveBeenCalledWith("/home");
    });
  });
});
