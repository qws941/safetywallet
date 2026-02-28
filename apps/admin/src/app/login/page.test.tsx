import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@safetywallet/types";
import LoginPage from "./page";
import { ApiError } from "@/lib/api";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const mockApiFetch = vi.fn();

const authState = {
  login: vi.fn(),
  logout: vi.fn(),
  setSiteId: vi.fn(),
  user: null as { id: string } | null,
  isAdmin: false,
  _hasHydrated: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) =>
    selector(authState),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isAdmin = false;
    authState._hasHydrated = true;
  });

  it("renders login form and disables submit until both fields are entered", () => {
    render(<LoginPage />);

    expect(screen.getByText("송도세브란스 관리자")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "로그인" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "admin" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "secret" },
    });
    expect(submit).not.toBeDisabled();
  });

  it("redirects hydrated admin user to dashboard", async () => {
    authState.user = { id: "u1" };
    authState.isAdmin = true;

    render(<LoginPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("logs in and sets default site from memberships", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        user: {
          id: "admin-1",
          phone: "010",
          nameMasked: "관*자",
          role: UserRole.SITE_ADMIN,
        },
        tokens: { accessToken: "acc", refreshToken: "ref" },
      })
      .mockResolvedValueOnce({
        memberships: [{ site: { id: "site-1", name: "현장", active: true } }],
      });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(authState.login).toHaveBeenCalled();
      expect(authState.setSiteId).toHaveBeenCalledWith("site-1");
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("falls back to /sites when memberships are empty", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        user: {
          id: "admin-1",
          phone: "010",
          nameMasked: "관*자",
          role: UserRole.SUPER_ADMIN,
        },
        tokens: { accessToken: "acc", refreshToken: "ref" },
      })
      .mockResolvedValueOnce({ memberships: [] })
      .mockResolvedValueOnce([{ id: "site-2", name: "현장2" }]);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "pw" },
    });
    fireEvent.keyDown(screen.getByLabelText("비밀번호"), { key: "Enter" });

    await waitFor(() => {
      expect(authState.setSiteId).toHaveBeenCalledWith("site-2");
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows permission error for non-admin role and stops flow", async () => {
    mockApiFetch.mockResolvedValueOnce({
      user: {
        id: "worker-1",
        phone: "010",
        nameMasked: "작*자",
        role: UserRole.WORKER,
      },
      tokens: { accessToken: "acc", refreshToken: "ref" },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "worker" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(screen.getByText("관리자 권한이 없습니다")).toBeInTheDocument();
    });
    expect(authState.login).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows ApiError status and rate-limit messages", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("아이디"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "pw" },
    });

    mockApiFetch.mockRejectedValueOnce(
      new ApiError("too many", 429, "RATE_LIMIT_EXCEEDED"),
    );
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => {
      expect(
        screen.getByText("요청이 너무 많습니다. 잠시 후 다시 시도하세요."),
      ).toBeInTheDocument();
    });

    mockApiFetch.mockRejectedValueOnce(new ApiError("unauthorized", 401));
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => {
      expect(
        screen.getByText("아이디 또는 비밀번호가 올바르지 않습니다"),
      ).toBeInTheDocument();
    });
  });
});
