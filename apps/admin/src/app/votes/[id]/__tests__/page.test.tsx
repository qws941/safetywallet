import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page, { generateStaticParams } from "../page";

vi.mock("../vote-detail", () => ({
  default: () => <div>vote-detail-client</div>,
}));

describe("votes [id] wrapper page", () => {
  it("exports placeholder static params", () => {
    expect(generateStaticParams()).toEqual([{ id: "__placeholder" }]);
  });

  it("renders client page", () => {
    render(<Page />);
    expect(screen.getByText("vote-detail-client")).toBeInTheDocument();
  });
});
