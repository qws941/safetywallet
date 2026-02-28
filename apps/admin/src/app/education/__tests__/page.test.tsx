import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EducationPage from "../page";

vi.mock("@safetywallet/ui", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../components/contents-tab", () => ({
  ContentsTab: () => <div>contents-tab</div>,
}));
vi.mock("../components/quizzes-tab", () => ({
  QuizzesTab: () => <div>quizzes-tab</div>,
}));
vi.mock("../components/statutory-tab", () => ({
  StatutoryTab: () => <div>statutory-tab</div>,
}));
vi.mock("../components/tbm-tab", () => ({
  TbmTab: () => <div>tbm-tab</div>,
}));

describe("education page", () => {
  it("renders default tab and switches tabs", () => {
    render(<EducationPage />);
    expect(screen.getByText("교육 관리")).toBeInTheDocument();
    expect(screen.getByText("contents-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "퀴즈" }));
    expect(screen.getByText("quizzes-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "법정교육" }));
    expect(screen.getByText("statutory-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "TBM" }));
    expect(screen.getByText("tbm-tab")).toBeInTheDocument();
  });
});
