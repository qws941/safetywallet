import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page, { generateStaticParams } from "./page";

vi.mock("./member-detail", () => ({
  default: () => <div>member-detail-client</div>,
}));

describe("Members detail wrapper page", () => {
  it("returns placeholder static params", () => {
    expect(generateStaticParams()).toEqual([{ id: "__placeholder" }]);
  });

  it("renders the client page", () => {
    render(<Page />);
    expect(screen.getByText("member-detail-client")).toBeInTheDocument();
  });
});
