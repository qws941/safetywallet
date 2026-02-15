import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";
import { Badge, badgeVariants } from "../components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Input } from "../components/input";
import { Skeleton } from "../components/skeleton";

describe("Card family", () => {
  it("renders semantic card sections with class names", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">
          <CardTitle>안전 점검</CardTitle>
          <CardDescription>오늘의 점검 항목</CardDescription>
        </CardHeader>
        <CardContent data-testid="card-content">본문</CardContent>
        <CardFooter data-testid="card-footer">푸터</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId("card").className).toContain("rounded-lg");
    expect(screen.getByTestId("card-header").className).toContain(
      "space-y-1.5",
    );
    expect(screen.getByTestId("card-content").className).toContain("p-6");
    expect(screen.getByTestId("card-footer").className).toContain(
      "items-center",
    );
    expect(
      screen.getByRole("heading", { name: "안전 점검" }),
    ).toBeInTheDocument();
    expect(screen.getByText("오늘의 점검 항목")).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("renders input and supports typing with accessibility label", () => {
    render(<Input aria-label="phone-input" placeholder="01012345678" />);

    const input = screen.getByLabelText("phone-input");
    fireEvent.change(input, { target: { value: "01098765432" } });

    expect(input).toHaveValue("01098765432");
    expect(input.className).toContain("border-input");
  });
});

describe("Badge", () => {
  it("applies variant classes and renders content", () => {
    render(<Badge variant="success">완료</Badge>);

    const badge = screen.getByText("완료");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-success");
    expect(badgeVariants({ variant: "warning" })).toContain("bg-warning");
  });
});

describe("Skeleton", () => {
  it("renders loading placeholder class names", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-20" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.className).toContain("animate-pulse");
    expect(skeleton.className).toContain("bg-muted");
    expect(skeleton.className).toContain("h-4");
  });
});

describe("Avatar", () => {
  it("renders image and fallback content", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarImage alt="worker avatar" src="https://example.com/avatar.png" />
        <AvatarFallback>HK</AvatarFallback>
      </Avatar>,
    );

    const avatar = screen.getByTestId("avatar");
    const image = screen.getByRole("img", { name: "worker avatar" });
    const fallback = screen.getByText("HK");

    expect(avatar.className).toContain("rounded-full");
    expect(image).toHaveAttribute("src", "https://example.com/avatar.png");
    expect(fallback.className).toContain("bg-muted");
  });
});
