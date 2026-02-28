import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/hooks/use-locale";

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@/hooks/use-locale", () => ({ useLocale: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));

describe("LocaleSwitcher", () => {
  it("shows current locale in uppercase", () => {
    vi.mocked(useLocale).mockReturnValue({
      currentLocale: "ko",
      setLocale: vi.fn(),
    });

    render(<LocaleSwitcher />);
    expect(screen.getByText("KO")).toBeInTheDocument();
  });

  it("opens locale menu and changes locale on selection", () => {
    const setLocale = vi.fn();
    vi.mocked(useLocale).mockReturnValue({
      currentLocale: "ko",
      setLocale,
    });

    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "common.language" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(setLocale).toHaveBeenCalledWith("en");
    expect(
      screen.queryByRole("button", { name: "English" }),
    ).not.toBeInTheDocument();
  });

  it("closes menu when clicking outside overlay", () => {
    vi.mocked(useLocale).mockReturnValue({
      currentLocale: "ko",
      setLocale: vi.fn(),
    });

    const { container } = render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "common.language" }));
    const overlay = container.querySelector(".fixed.inset-0.z-40");
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay as Element);
    expect(
      screen.queryByRole("button", { name: "English" }),
    ).not.toBeInTheDocument();
  });
});
