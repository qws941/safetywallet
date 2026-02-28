import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/register/page";

describe("app/register/page", () => {
  it("redirects to login route", async () => {
    const replaceSpy = vi
      .spyOn(window.location, "replace")
      .mockImplementation(() => {});

    const { container } = render(<RegisterPage />);
    expect(container.firstChild).toBeNull();

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/login/");
    });
  });
});
