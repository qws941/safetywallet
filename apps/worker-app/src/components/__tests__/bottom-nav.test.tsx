import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/bottom-nav";
import { setMockPathname } from "@/__tests__/mocks";

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => `translated:${key}`,
}));

describe("BottomNav", () => {
  it("renders translated nav labels and center action button", () => {
    setMockPathname("/home");
    render(<BottomNav />);

    expect(screen.getByText("translated:nav.home")).toBeInTheDocument();
    expect(screen.getByText("translated:nav.education")).toBeInTheDocument();
    expect(screen.getByText("translated:nav.actions")).toBeInTheDocument();
    expect(screen.getByText("translated:nav.profile")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    const centerLink = links.find(
      (link) => link.getAttribute("href") === "/posts/new",
    );
    expect(centerLink).toBeDefined();
    expect(centerLink?.textContent).toBe("");
  });

  it("applies active class for current path", () => {
    setMockPathname("/education/quiz");
    render(<BottomNav />);

    const educationText = screen.getByText("translated:nav.education");
    const educationLink = educationText.closest("a");

    expect(educationLink).toHaveClass("text-primary");
    expect(educationLink).not.toHaveClass("text-muted-foreground");
  });
});
