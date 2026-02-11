"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePost } from "@/hooks/use-api";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
} from "@safetywallet/ui";
import { cn } from "@/lib/utils";
import { Category, ReviewStatus, RejectReason } from "@safetywallet/types";
import { AlertCircle, HelpCircle } from "lucide-react";

const categoryLabels: Record<Category, string> = {
  [Category.HAZARD]: "위험요소",
  [Category.UNSAFE_BEHAVIOR]: "불안전행동",
  [Category.INCONVENIENCE]: "불편사항",
  [Category.SUGGESTION]: "개선제안",
  [Category.BEST_PRACTICE]: "우수사례",
};

const reviewStatusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "접수됨",
  [ReviewStatus.IN_REVIEW]: "검토 중",
  [ReviewStatus.NEED_INFO]: "추가정보 필요",
  [ReviewStatus.APPROVED]: "승인됨",
  [ReviewStatus.REJECTED]: "반려됨",
  [ReviewStatus.URGENT]: "긴급",
};

const reviewStatusColors: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "bg-gray-100 text-gray-700",
  [ReviewStatus.IN_REVIEW]: "bg-blue-100 text-blue-700",
  [ReviewStatus.NEED_INFO]: "bg-yellow-100 text-yellow-700",
  [ReviewStatus.APPROVED]: "bg-green-100 text-green-700",
  [ReviewStatus.REJECTED]: "bg-red-100 text-red-700",
  [ReviewStatus.URGENT]: "bg-red-200 text-red-800 font-semibold",
};

const rejectReasonLabels: Record<RejectReason, string> = {
  [RejectReason.DUPLICATE]: "중복 게시물",
  [RejectReason.UNCLEAR_PHOTO]: "불명확한 사진",
  [RejectReason.INSUFFICIENT]: "증거 부족",
  [RejectReason.FALSE]: "허위 신고",
  [RejectReason.IRRELEVANT]: "범위 밖",
  [RejectReason.OTHER]: "기타",
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />
      <main className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
      <BottomNav />
    </div>
  );
}

function PostDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = searchParams.get("id") || "";
  const { data, isLoading, error } = usePost(postId);

  const post = data?.data;

  // reviews가 PostDto에 없을 수 있으므로 any로 처리하여 접근
  const reviews = (post as any)?.reviews as any[];
  const latestReview = reviews?.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 pb-nav">
        <Header />
        <main className="p-4">
          <div className="text-center py-12">
            <p className="text-4xl mb-4">❌</p>
            <p className="text-muted-foreground">제보를 찾을 수 없습니다.</p>
            <Button className="mt-4" onClick={() => router.back()}>
              돌아가기
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />

      <main className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {categoryLabels[post.category as Category] || post.category}
          </Badge>
          <Badge
            className={cn(
              reviewStatusColors[post.reviewStatus as ReviewStatus],
            )}
          >
            {reviewStatusLabels[post.reviewStatus as ReviewStatus] ||
              post.reviewStatus}
          </Badge>
          {post.isUrgent && <Badge variant="destructive">긴급</Badge>}
        </div>

        {post.reviewStatus === ReviewStatus.REJECTED && latestReview && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-base">반려 사유</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="font-medium text-red-900">사유:</span>
                  <span className="text-red-800">
                    {rejectReasonLabels[
                      latestReview.reasonCode as RejectReason
                    ] || latestReview.reasonCode}
                  </span>
                </div>
                {latestReview.comment && (
                  <div className="text-sm text-red-700 bg-white/50 p-2 rounded">
                    {latestReview.comment}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {post.reviewStatus === ReviewStatus.NEED_INFO && latestReview && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-yellow-700">
                <HelpCircle className="h-5 w-5" />
                <CardTitle className="text-base">추가 정보 요청</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-800 bg-white/50 p-2 rounded">
                {latestReview.comment || "관리자가 추가 정보를 요청했습니다."}
              </div>
            </CardContent>
          </Card>
        )}

        {post.images && post.images.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-1">
                {post.images.map((img, idx) => (
                  <img
                    key={img.id || idx}
                    src={img.fileUrl}
                    alt={`사진 ${idx + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">상세 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>
          </CardContent>
        </Card>

        {(post.locationFloor || post.locationZone) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">위치</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                {post.locationFloor && <span>{post.locationFloor}</span>}
                {post.locationFloor && post.locationZone && " / "}
                {post.locationZone && <span>{post.locationZone}</span>}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                제보일:{" "}
                {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {post.author && <p>제보자: {post.author.nameMasked}</p>}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PostDetailContent />
    </Suspense>
  );
}
