"use client";

import { useState } from "react";
import { useEducationContents } from "@/hooks/use-api";
import { ContentForm } from "./content-form";
import { ContentList } from "./content-list";
import type { EducationContentItem } from "../education-types";

export function ContentsTab() {
  const [editingContentId, setEditingContentId] = useState<string | null>(null);

  const { data: contentsData, isLoading } = useEducationContents();
  const contents: EducationContentItem[] = contentsData?.contents ?? [];

  const onEditContent = (content: EducationContentItem) => {
    setEditingContentId(content.id);
  };

  const onCancelEdit = () => {
    setEditingContentId(null);
  };

  const onDeleteContent = () => {
    // Delete is handled internally by ContentList
  };

  return (
    <div className="space-y-4">
      <ContentForm
        editingContentId={editingContentId}
        contents={contents}
        onCancelEdit={onCancelEdit}
      />
      <ContentList
        isLoading={isLoading}
        contents={contents}
        onEditContent={onEditContent}
        onDeleteContent={onDeleteContent}
      />
    </div>
  );
}

export default ContentsTab;
