import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";

vi.mock("@safetywallet/ui", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

function QueryClientConsumer() {
  const client = useQueryClient();
  return <div data-testid="query-client">{client ? "ready" : "missing"}</div>;
}

describe("Providers", () => {
  it("renders children and toaster with query context", () => {
    render(
      <Providers>
        <QueryClientConsumer />
      </Providers>,
    );

    expect(screen.getByTestId("query-client")).toHaveTextContent("ready");
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
