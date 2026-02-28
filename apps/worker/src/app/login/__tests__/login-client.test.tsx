import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginClient from "@/app/login/login-client";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

describe("app/login/login-client", () => {
  const login = vi.fn();
  const setCurrentSite = vi.fn();
  const replaceSpy = vi
    .spyOn(window.location, "replace")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      login,
      setCurrentSite,
      isAuthenticated: false,
      _hasHydrated: true,
      currentSiteId: null,
      logout: vi.fn(),
      user: null,
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("redirects when already authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({
      login,
      setCurrentSite,
      isAuthenticated: true,
      _hasHydrated: true,
      currentSiteId: "s1",
      logout: vi.fn(),
      user: null,
    });

    render(<LoginClient />);

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/home/");
    });
  });

  it("disables submit until form is valid", () => {
    render(<LoginClient />);

    const button = screen.getByRole("button", { name: "로그인" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("휴대폰 번호"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByLabelText("생년월일"), {
      target: { value: "900101" },
    });

    expect(button).toBeEnabled();
  });

  it("logs in and sets site on successful request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user: { id: "u1", name: "홍길동" },
            accessToken: "at",
            refreshToken: "rt",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { siteId: "site-1" } }),
      } as Response);

    render(<LoginClient />);

    fireEvent.change(screen.getByLabelText("휴대폰 번호"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByLabelText("생년월일"), {
      target: { value: "900101" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
      expect(setCurrentSite).toHaveBeenCalledWith("site-1");
      expect(replaceSpy).toHaveBeenCalledWith("/home/");
    });
  });

  it("shows parsed error message on failed login", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { code: "USER_NOT_FOUND" } }),
    } as Response);

    render(<LoginClient />);

    fireEvent.change(screen.getByLabelText("휴대폰 번호"), {
      target: { value: "01012345678" },
    });
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByLabelText("생년월일"), {
      target: { value: "900101" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByText("계정을 찾을 수 없습니다.")).toBeInTheDocument();
    });
  });
});
