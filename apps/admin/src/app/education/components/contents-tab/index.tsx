"use client";

import { useState } from "react";
import { Button } from "@safetywallet/ui";
import { Plus, ChevronUp } from "lucide-react";
import { useEducationContents } from "@/hooks/use-api";
import { ContentForm } from "./content-form";
import { ContentList } from "./content-list";
import type { EducationContentItem } from "../education-types";
import { ContentCompletions } from "../content-completions";

export function ContentsTab() {
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: contentsData, isLoading } = useEducationContents();
  const contents: EducationContentItem[] = contentsData?.contents ?? [];

  const onEditContent = (content: EducationContentItem) => {
    setEditingContentId(content.id);
    setShowForm(true);
  };

  const onCancelEdit = () => {
    setEditingContentId(null);
    setShowForm(false);
  };

  const onDeleteContent = () => {
    // Delete is handled internally by ContentList
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant={showForm ? "outline" : "default"}
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingContentId(null);
          }}
        >
          {showForm ? (
            <>
              <ChevronUp className="mr-1 h-4 w-4" />
              접기
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" />
              자료 등록
            </>
          )}
        </Button>
      </div>
      {showForm && (
        <ContentForm
          editingContentId={editingContentId}
          contents={contents}
          onCancelEdit={onCancelEdit}
        />
      )}
      <ContentList
        isLoading={isLoading}
        contents={contents}
        onEditContent={onEditContent}
        onDeleteContent={onDeleteContent}
      />
      {contents.length > 0 && <ContentCompletions contents={contents} />}
    </div>
  );
}

export default ContentsTab;
