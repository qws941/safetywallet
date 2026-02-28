import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("@/app/login/login-client", () => ({
  default: () => <div>login-client-mock</div>,
}));

describe("app/login/page", () => {
  it("renders login client component", () => {
    render(<LoginPage />);
    expect(screen.getByText("login-client-mock")).toBeInTheDocument();
  });
});
