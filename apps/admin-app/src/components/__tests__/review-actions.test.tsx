import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReviewAction, RejectReason, ReviewStatus } from "@safetywallet/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewActions } from "@/components/review-actions";

const mockMutate = vi.fn();
const mockUseReviewPost = vi.fn();

vi.mock("@safetywallet/ui", async () => {
  const React = await import("react");
  return {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Card: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
  };
});

vi.mock("@/hooks/use-api", () => ({
  useReviewPost: () => mockUseReviewPost(),
}));

describe("ReviewActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReviewPost.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("approves post and calls completion callback", async () => {
    const onComplete = vi.fn();
    mockMutate.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<ReviewActions postId="post-1" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: "post-1", action: ReviewAction.APPROVE },
        expect.any(Object),
      );
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it("submits reject reason and comment", async () => {
    render(<ReviewActions postId="post-1" />);
    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    fireEvent.click(screen.getByRole("button", { name: /중복 제보/ }));
    fireEvent.change(screen.getByPlaceholderText("추가 설명 (선택)"), {
      target: { value: "중복 확인" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          postId: "post-1",
          action: ReviewAction.REJECT,
          reason: RejectReason.DUPLICATE,
          comment: "중복 확인",
        },
        expect.any(Object),
      );
    });
  });

  it("requests more info and handles urgent flow", async () => {
    render(
      <ReviewActions postId="post-1" currentStatus={ReviewStatus.IN_REVIEW} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "추가 정보 요청" }));
    fireEvent.change(screen.getByPlaceholderText("필요한 정보를 입력하세요"), {
      target: { value: "작업 위치를 추가로 기입해주세요" },
    });
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          postId: "post-1",
          action: ReviewAction.REQUEST_MORE,
          comment: "작업 위치를 추가로 기입해주세요",
        },
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "긴급 지정" }));
    fireEvent.click(screen.getByRole("button", { name: "긴급 지정" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { postId: "post-1", action: ReviewAction.MARK_URGENT },
        expect.any(Object),
      );
    });
  });

  it("sets note from template when reject reason has template", () => {
    render(<ReviewActions postId="post-1" />);
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    // Click a reason with a template string ("사진 불명확" has template)
    fireEvent.click(screen.getByRole("button", { name: /사진 불명확/ }));

    // The note input should be populated with the template
    const noteInput = screen.getByPlaceholderText(
      "추가 설명 (선택)",
    ) as HTMLInputElement;
    expect(noteInput.value).toBeTruthy();
  });

  it("cancels reject flow", () => {
    render(<ReviewActions postId="post-1" />);
    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    const cancelButton = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelButton);

    // After cancel, should go back to main view with approve/reject buttons
    expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
  });

  it("cancels info request flow", () => {
    render(
      <ReviewActions postId="post-1" currentStatus={ReviewStatus.IN_REVIEW} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "추가 정보 요청" }));

    const cancelButton = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelButton);

    expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
  });

  it("cancels urgent confirm flow", async () => {
    mockMutate.mockImplementation(
      (_payload: unknown, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(
      <ReviewActions postId="post-1" currentStatus={ReviewStatus.IN_REVIEW} />,
    );
    // Go through info request to get to urgent flow
    fireEvent.click(screen.getByRole("button", { name: "추가 정보 요청" }));
    fireEvent.change(screen.getByPlaceholderText("필요한 정보를 입력하세요"), {
      target: { value: "테스트 요청 내용입니다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    // Now in urgent confirm view
    fireEvent.click(screen.getByRole("button", { name: "긴급 지정" }));
    const cancelButton = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelButton);

    expect(screen.getByRole("button", { name: "승인" })).toBeInTheDocument();
  });
});
