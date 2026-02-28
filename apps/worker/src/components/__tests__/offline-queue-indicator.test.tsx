import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineQueueIndicator } from "@/components/offline-queue-indicator";
import { flushOfflineQueue, getOfflineQueueLength } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  flushOfflineQueue: vi.fn(),
  getOfflineQueueLength: vi.fn(),
}));

describe("OfflineQueueIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(flushOfflineQueue).mockResolvedValue(undefined as never);
  });

  it("returns null when queue is empty", () => {
    vi.mocked(getOfflineQueueLength).mockReturnValue(0);
    const { container } = render(<OfflineQueueIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("shows offline disabled button", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.mocked(getOfflineQueueLength).mockReturnValue(2);

    render(<OfflineQueueIndicator />);

    expect(await screen.findByText("오프라인 대기")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오프라인" })).toBeDisabled();
  });

  it("syncs queue when online", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.mocked(getOfflineQueueLength).mockReturnValue(1);

    render(<OfflineQueueIndicator />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 동기화" }));

    await waitFor(() => {
      expect(flushOfflineQueue).toHaveBeenCalled();
    });
  });
});
