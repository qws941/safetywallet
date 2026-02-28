import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallBanner } from "@/components/install-banner";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

vi.mock("@/hooks/use-install-prompt", () => ({ useInstallPrompt: vi.fn() }));

describe("InstallBanner", () => {
  it("returns null when install is not available", () => {
    vi.mocked(useInstallPrompt).mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      promptInstall: vi.fn(),
      dismissBanner: vi.fn(),
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("calls install and dismiss handlers", () => {
    const promptInstall = vi.fn();
    const dismissBanner = vi.fn();
    vi.mocked(useInstallPrompt).mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      promptInstall,
      dismissBanner,
    });

    render(<InstallBanner />);

    fireEvent.click(screen.getByRole("button", { name: "설치" }));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(promptInstall).toHaveBeenCalled();
    expect(dismissBanner).toHaveBeenCalled();
  });
});
