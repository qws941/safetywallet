import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

describe("useInstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  it("is not installable by default", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it("becomes installable after beforeinstallprompt event", async () => {
    const event = new Event("beforeinstallprompt");
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      preventDefault: vi.fn(),
    });

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(result.current.isInstallable).toBe(true);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(prompt).toHaveBeenCalled();
    expect(result.current.isInstallable).toBe(false);
  });

  it("dismisses banner and persists timestamp", () => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
      preventDefault: vi.fn(),
    });

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.dismissBanner();
    });

    expect(localStorage.getItem("safetywallet-install-dismissed")).toBeTruthy();
    expect(result.current.isInstallable).toBe(false);
  });

  it("marks as installed on appinstalled event", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current.isInstalled).toBe(true);
  });
});
