import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";

vi.mock("@/components/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));
vi.mock("@/i18n", () => ({
  I18nProvider: ({
    children,
    initialLocale,
  }: {
    children: React.ReactNode;
    initialLocale?: string;
  }) => (
    <div data-testid="i18n-provider" data-locale={initialLocale}>
      {children}
    </div>
  ),
}));
vi.mock("@safetywallet/ui", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe("Providers", () => {
  it("wraps children with auth and i18n providers and renders toaster", () => {
    render(
      <Providers>
        <div>page content</div>
      </Providers>,
    );

    expect(screen.getByTestId("i18n-provider")).toHaveAttribute(
      "data-locale",
      "ko",
    );
    expect(screen.getByTestId("auth-guard")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
