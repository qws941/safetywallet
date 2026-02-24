"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Skeleton,
  toast,
} from "@safetywallet/ui";
import { useAdminPost, useDeleteAdminPost } from "@/hooks/use-api";
import { canReviewPost } from "./post-detail-helpers";
import { PostContentCard } from "./components/post-content-card";
import { AssignmentForm } from "./components/assignment-form";
import { ReviewHistoryCard } from "./components/review-history-card";
import { MetadataCard } from "./components/metadata-card";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { data: post, isLoading, refetch } = useAdminPost(postId);
  const deletePost = useDeleteAdminPost();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">제보를 찾을 수 없습니다</p>
        <Button variant="link" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    );
  }

  const canReview = canReviewPost(post.status);

  const handleDelete = () => {
    deletePost.mutate(
      {
        postId,
        reason: "관리자 UI에서 제보 삭제",
      },
      {
        onSuccess: () => {
          toast({ description: "제보가 삭제되었습니다." });
          router.push("/posts");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            description: `삭제 실패: ${error.message}`,
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">제보 상세</h1>
        </div>
        <Button
          variant="destructive"
          className="gap-2"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 size={16} />
          삭제
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PostContentCard
            post={post}
            postId={postId}
            canReview={canReview}
            onRefresh={() => refetch()}
          />
          {canReview && (
            <AssignmentForm postId={postId} onRefresh={() => refetch()} />
          )}
        </div>

        <div className="space-y-6">
          <ReviewHistoryCard reviews={post.reviews} />
          {post.metadata && <MetadataCard metadata={post.metadata} />}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제보 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePost.isPending}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
