import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("RootPage", () => {
  it("redirects to dashboard on mount", async () => {
    const { container } = render(<RootPage />);
    expect(container.firstChild).toBeNull();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
