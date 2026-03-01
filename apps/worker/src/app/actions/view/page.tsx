"use client";

import { Suspense } from "react";
import { ActionDetailContent } from "./action-detail-content";
import { LoadingState } from "./loading-state";

export default function ActionDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ActionDetailContent />
    </Suspense>
  );
}
