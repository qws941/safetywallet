import { render, screen } from "@testing-library/react";
import {
  ActionStatus,
  Category,
  ReviewStatus,
  type PostListDto,
} from "@safetywallet/types";
import { describe, expect, it, vi } from "vitest";
import { PostCard } from "@/components/post-card";

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));

const basePost: PostListDto = {
  id: "post-1",
  category: Category.HAZARD,
  content: "추락 위험이 있는 작업 구역입니다.",
  reviewStatus: ReviewStatus.PENDING,
  actionStatus: ActionStatus.NONE,
  isUrgent: false,
  createdAt: "2026-01-12T12:00:00.000Z",
  imageCount: 0,
};

describe("PostCard", () => {
  it("renders content, category label, review status, and detail link", () => {
    render(<PostCard post={basePost} />);

    expect(screen.getByText("posts.category.hazard")).toBeInTheDocument();
    expect(screen.getByText("posts.view.status.pending")).toBeInTheDocument();
    expect(screen.getByText(basePost.content)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/posts/view?id=post-1",
    );
  });

  it("shows approved point badge and urgent badge when applicable", () => {
    render(
      <PostCard
        post={{
          ...basePost,
          reviewStatus: ReviewStatus.APPROVED,
          isUrgent: true,
        }}
      />,
    );

    expect(screen.getByText("posts.view.status.approved")).toBeInTheDocument();
    expect(screen.getByText("+100P")).toBeInTheDocument();
    expect(screen.getByText("posts.pageList.urgent")).toBeInTheDocument();
  });

  it("shows action status badge when action is assigned", () => {
    render(
      <PostCard
        post={{
          ...basePost,
          actionStatus: ActionStatus.ASSIGNED,
        }}
      />,
    );

    expect(screen.getByText("actions.status.assigned")).toBeInTheDocument();
  });

  it("does not render action badge when action status is NONE", () => {
    render(
      <PostCard post={{ ...basePost, actionStatus: ActionStatus.NONE }} />,
    );
    expect(
      screen.queryByText("actions.status.assigned"),
    ).not.toBeInTheDocument();
  });

  it("falls back to raw values for unknown category, reviewStatus, and actionStatus", () => {
    const unknownValuePost = {
      ...basePost,
      category: "CUSTOM_CATEGORY",
      reviewStatus: "CUSTOM_REVIEW",
      actionStatus: "CUSTOM_ACTION",
    } as unknown as PostListDto;

    render(<PostCard post={unknownValuePost} />);

    expect(screen.getByText("CUSTOM_CATEGORY")).toBeInTheDocument();
    expect(screen.getByText("CUSTOM_REVIEW")).toBeInTheDocument();
    expect(screen.getByText("CUSTOM_ACTION")).toBeInTheDocument();
  });

  it("does not render action badge when action status is missing", () => {
    const postWithoutActionStatus = {
      ...basePost,
      actionStatus: undefined,
    } as unknown as PostListDto;

    render(<PostCard post={postWithoutActionStatus} />);

    expect(screen.queryByText("CUSTOM_ACTION")).not.toBeInTheDocument();
    expect(
      screen.queryByText("actions.status.assigned"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("actions.status.inProgress"),
    ).not.toBeInTheDocument();
  });
});
