"use client";

import { Card, Badge } from "@safetywallet/ui";
import type { Post } from "../post-detail-helpers";
import { reviewActionLabels } from "../post-detail-helpers";

interface ReviewHistoryCardProps {
  reviews: Post["reviews"];
}

export function ReviewHistoryCard({ reviews }: ReviewHistoryCardProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-medium">검토 이력</h3>
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-l-2 border-gray-200 pl-4 py-2"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {reviewActionLabels[review.action] || review.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              {review.admin?.nameMasked && (
                <p className="text-xs text-muted-foreground mt-1">
                  처리자: {review.admin.nameMasked}
                </p>
              )}
              {review.comment && (
                <p className="text-sm mt-1">{review.comment}</p>
              )}
              {review.reasonCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  사유: {review.reasonCode}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          아직 검토 이력이 없습니다
        </p>
      )}
    </Card>
  );
}
