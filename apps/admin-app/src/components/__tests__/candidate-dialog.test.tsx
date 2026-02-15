import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateDialog } from "@/components/votes/candidate-dialog";

const { mockToast, mockAddCandidate, mockUseMembers, mockUseAddVoteCandidate } =
  vi.hoisted(() => ({
    mockToast: vi.fn(),
    mockAddCandidate: vi.fn(),
    mockUseMembers: vi.fn(),
    mockUseAddVoteCandidate: vi.fn(),
  }));

vi.mock("@safetywallet/ui", async () => {
  const React = await import("react");
  return {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
    toast: mockToast,
  };
});

vi.mock("@/hooks/use-api", () => ({
  useMembers: () => mockUseMembers(),
}));

vi.mock("@/hooks/use-votes", () => ({
  useAddVoteCandidate: () => mockUseAddVoteCandidate(),
}));

describe("CandidateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMembers.mockReturnValue({
      data: [
        { user: { id: "u-1", nameMasked: "홍길동", phone: "010-1111-2222" } },
      ],
    });
    mockUseAddVoteCandidate.mockReturnValue({
      mutate: mockAddCandidate,
      isPending: false,
    });
  });

  it("opens and closes dialog", () => {
    render(<CandidateDialog />);
    fireEvent.click(screen.getByRole("button", { name: "후보자 추가" }));
    expect(screen.getByText("투표 후보자 추가")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.getByRole("button", { name: "후보자 추가" }),
    ).toBeInTheDocument();
  });

  it("submits selected member and month", async () => {
    mockAddCandidate.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );
    render(<CandidateDialog />);

    fireEvent.click(screen.getByRole("button", { name: "후보자 추가" }));
    fireEvent.change(screen.getByLabelText("투표 월"), {
      target: { value: "2026-02" },
    });
    fireEvent.change(screen.getByLabelText("사용자 선택"), {
      target: { value: "u-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() => {
      expect(mockAddCandidate).toHaveBeenCalledWith(
        { userId: "u-1", month: "2026-02" },
        expect.any(Object),
      );
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "후보자가 추가되었습니다." }),
    );
  });
});
