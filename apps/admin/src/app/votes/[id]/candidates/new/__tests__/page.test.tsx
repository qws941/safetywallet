import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page, { generateStaticParams } from "../page";

vi.mock("../add-candidate", () => ({
  default: () => <div>add-candidate-client</div>,
}));

describe("votes add-candidate wrapper page", () => {
  it("exports placeholder static params", () => {
    expect(generateStaticParams()).toEqual([{ id: "__placeholder" }]);
  });

  it("renders client add-candidate page", () => {
    render(<Page />);
    expect(screen.getByText("add-candidate-client")).toBeInTheDocument();
  });
});
