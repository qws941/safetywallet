"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateEducationContent,
  useUpdateEducationContent,
  useYouTubeOembed,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "../../education-helpers";
import type {
  ContentFormState,
  EducationContentItem,
} from "../education-types";
import { INITIAL_CONTENT_FORM } from "./constants";
import { SourceModeButtons } from "./content-form-source-modes";
import { YouTubeSection } from "./content-form-youtube";
import { KoshaSection } from "./content-form-kosha";
import { ContentFormFields } from "./content-form-fields";

interface Props {
  editingContentId?: string | null;
  contents?: EducationContentItem[];
  onCancelEdit?: () => void;
}

export function ContentForm({
  editingContentId,
  contents,
  onCancelEdit,
}: Props) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [contentForm, setContentForm] =
    useState<ContentFormState>(INITIAL_CONTENT_FORM);
  const [sourceMode, setSourceMode] = useState<"LOCAL" | "YOUTUBE" | "KOSHA">(
    "LOCAL",
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const createMutation = useCreateEducationContent();
  const updateMutation = useUpdateEducationContent();
  const ytOembed = useYouTubeOembed();

  // Populate form when editing content changes
  useEffect(() => {
    if (editingContentId && contents) {
      const content = contents.find((c) => c.id === editingContentId);
      if (content) {
        const source = content.externalSource || "LOCAL";
        setSourceMode(source);
        if (source === "YOUTUBE") {
          setYoutubeUrl(content.contentUrl || "");
        } else {
          setYoutubeUrl("");
        }
        setContentForm({
          title: content.title,
          contentType: content.contentType,
          description: content.description || "",
          contentUrl: content.contentUrl || "",
          thumbnailUrl: content.thumbnailUrl || "",
          durationMinutes: content.durationMinutes
            ? String(content.durationMinutes)
            : "",
          externalSource: source,
          externalId: content.externalId || "",
          sourceUrl: content.sourceUrl || "",
        });
      }
    } else {
      setContentForm(INITIAL_CONTENT_FORM);
      setSourceMode("LOCAL");
      setYoutubeUrl("");
    }
  }, [editingContentId, contents]);

  const setMode = (mode: "LOCAL" | "YOUTUBE" | "KOSHA") => {
    setSourceMode(mode);
    setContentForm((prev) => ({
      ...prev,
      externalSource: mode,
      externalId: mode === "YOUTUBE" ? prev.externalId : "",
      sourceUrl: mode === "LOCAL" ? "" : prev.sourceUrl,
    }));
    if (mode !== "YOUTUBE") {
      setYoutubeUrl("");
    }
  };

  const onFetchYoutubeInfo = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        variant: "destructive",
        description: "YouTube URL을 입력해 주세요.",
      });
      return;
    }

    try {
      const data = await ytOembed.mutateAsync(youtubeUrl.trim());
      setContentForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        contentType: "VIDEO",
        thumbnailUrl: data.thumbnailUrl || prev.thumbnailUrl,
        contentUrl: youtubeUrl.trim(),
        externalSource: "YOUTUBE",
        externalId: data.videoId,
        sourceUrl: youtubeUrl.trim(),
      }));
      toast({ description: "YouTube 정보를 불러왔습니다." });
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onCreateContent = async () => {
    if (!currentSiteId || !contentForm.title) return;
    try {
      if (editingContentId) {
        await updateMutation.mutateAsync({
          id: editingContentId,
          data: {
            title: contentForm.title,
            contentType: contentForm.contentType,
            description: contentForm.description || undefined,
            contentUrl: contentForm.contentUrl || undefined,
            thumbnailUrl: contentForm.thumbnailUrl || undefined,
            durationMinutes: contentForm.durationMinutes
              ? Number(contentForm.durationMinutes)
              : undefined,
            externalSource: sourceMode,
            externalId:
              sourceMode === "YOUTUBE"
                ? contentForm.externalId || undefined
                : undefined,
            sourceUrl:
              sourceMode === "LOCAL"
                ? undefined
                : contentForm.sourceUrl || undefined,
          },
        });
        toast({ description: "교육 콘텐츠가 수정되었습니다." });
      } else {
        await createMutation.mutateAsync({
          siteId: currentSiteId,
          title: contentForm.title,
          contentType: contentForm.contentType,
          description: contentForm.description || undefined,
          contentUrl: contentForm.contentUrl || undefined,
          thumbnailUrl: contentForm.thumbnailUrl || undefined,
          durationMinutes: contentForm.durationMinutes
            ? Number(contentForm.durationMinutes)
            : undefined,
          externalSource: sourceMode,
          externalId:
            sourceMode === "YOUTUBE"
              ? contentForm.externalId || undefined
              : undefined,
          sourceUrl:
            sourceMode === "LOCAL"
              ? undefined
              : contentForm.sourceUrl || undefined,
        });
        toast({ description: "교육자료가 등록되었습니다." });
      }
      setContentForm(INITIAL_CONTENT_FORM);
      setSourceMode("LOCAL");
      setYoutubeUrl("");
      onCancelEdit?.();
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const handleCancel = () => {
    setContentForm(INITIAL_CONTENT_FORM);
    setSourceMode("LOCAL");
    setYoutubeUrl("");
    onCancelEdit?.();
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setContentForm((prev) => ({
      ...prev,
      externalSource: "YOUTUBE",
      sourceUrl: url,
      contentUrl: url,
    }));
  };

  const handleKoshaUrlChange = (url: string) => {
    setContentForm((prev) => ({
      ...prev,
      externalSource: "KOSHA",
      externalId: "",
      sourceUrl: url,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingContentId ? "교육 콘텐츠 수정" : "교육 콘텐츠 등록"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SourceModeButtons
          sourceMode={sourceMode}
          onSetMode={setMode}
          disabled={
            !!editingContentId && contentForm.externalSource !== sourceMode
          }
        />

        {sourceMode === "YOUTUBE" && (
          <YouTubeSection
            youtubeUrl={youtubeUrl}
            thumbnailUrl={contentForm.thumbnailUrl}
            onYoutubeUrlChange={handleYoutubeUrlChange}
            onFetchYoutubeInfo={onFetchYoutubeInfo}
            isPending={ytOembed.isPending}
          />
        )}

        {sourceMode === "KOSHA" && (
          <KoshaSection
            sourceUrl={contentForm.sourceUrl}
            onSourceUrlChange={handleKoshaUrlChange}
          />
        )}

        <ContentFormFields
          contentForm={contentForm}
          onContentFormChange={setContentForm}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onCreateContent}
            disabled={
              !currentSiteId ||
              !contentForm.title ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {editingContentId ? "교육 콘텐츠 수정" : "교육자료 등록"}
          </Button>
          {editingContentId && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
