"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateEducationContent,
  useDeleteEducationContent,
  useEducationContents,
  useYouTubeOembed,
  type CreateEducationContentInput,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getContentTypeLabel, getErrorMessage } from "../education-helpers";
import type { ContentFormState, EducationContentItem } from "./education-types";

const INITIAL_FORM: ContentFormState = {
  title: "",
  contentType: "VIDEO",
  description: "",
  contentUrl: "",
  thumbnailUrl: "",
  durationMinutes: "",
  externalSource: "LOCAL",
  externalId: "",
  sourceUrl: "",
};

export function ContentsTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [contentForm, setContentForm] =
    useState<ContentFormState>(INITIAL_FORM);
  const [sourceMode, setSourceMode] = useState<"LOCAL" | "YOUTUBE" | "KOSHA">(
    "LOCAL",
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: contentsData, isLoading } = useEducationContents();
  const createMutation = useCreateEducationContent();
  const deleteMutation = useDeleteEducationContent();
  const ytOembed = useYouTubeOembed();

  const contents: EducationContentItem[] = contentsData?.contents ?? [];

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
      setContentForm(INITIAL_FORM);
      setSourceMode("LOCAL");
      setYoutubeUrl("");
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onDeleteContent = async () => {
    if (!deleteContentId) return;
    try {
      await deleteMutation.mutateAsync(deleteContentId);
      toast({ description: "교육자료가 삭제되었습니다." });
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
    setDeleteContentId(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>교육자료 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={sourceMode === "LOCAL" ? "default" : "outline"}
              onClick={() => setMode("LOCAL")}
            >
              📝 직접 입력
            </Button>
            <Button
              type="button"
              variant={sourceMode === "YOUTUBE" ? "default" : "outline"}
              onClick={() => setMode("YOUTUBE")}
            >
              ▶️ YouTube
            </Button>
            <Button
              type="button"
              variant={sourceMode === "KOSHA" ? "default" : "outline"}
              onClick={() => setMode("KOSHA")}
            >
              🏛️ KOSHA
            </Button>
          </div>

          {sourceMode === "YOUTUBE" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="YouTube URL"
                  value={youtubeUrl}
                  onChange={(e) => {
                    const nextUrl = e.target.value;
                    setYoutubeUrl(nextUrl);
                    setContentForm((prev) => ({
                      ...prev,
                      externalSource: "YOUTUBE",
                      sourceUrl: nextUrl,
                    }));
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onFetchYoutubeInfo}
                  disabled={ytOembed.isPending}
                >
                  정보 가져오기
                </Button>
              </div>
              {contentForm.thumbnailUrl && (
                <img
                  src={contentForm.thumbnailUrl}
                  alt="YouTube thumbnail"
                  className="h-32 w-56 rounded-md border object-cover"
                />
              )}
            </div>
          )}

          {sourceMode === "KOSHA" && (
            <div className="space-y-2 rounded-md border p-3">
              <Input
                placeholder="KOSHA URL"
                value={contentForm.sourceUrl}
                onChange={(e) =>
                  setContentForm((prev) => ({
                    ...prev,
                    externalSource: "KOSHA",
                    externalId: "",
                    sourceUrl: e.target.value,
                  }))
                }
              />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="제목"
              value={contentForm.title}
              onChange={(e) =>
                setContentForm((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
            />
            <Select
              value={contentForm.contentType}
              onValueChange={(value) =>
                setContentForm((prev) => ({
                  ...prev,
                  contentType:
                    value as CreateEducationContentInput["contentType"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIDEO">동영상</SelectItem>
                <SelectItem value="IMAGE">이미지</SelectItem>
                <SelectItem value="TEXT">텍스트</SelectItem>
                <SelectItem value="DOCUMENT">문서</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="설명"
            value={contentForm.description}
            onChange={(e) =>
              setContentForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="콘텐츠 URL"
              value={contentForm.contentUrl}
              onChange={(e) =>
                setContentForm((prev) => ({
                  ...prev,
                  contentUrl: e.target.value,
                }))
              }
            />
            <Input
              placeholder="썸네일 URL"
              value={contentForm.thumbnailUrl}
              onChange={(e) =>
                setContentForm((prev) => ({
                  ...prev,
                  thumbnailUrl: e.target.value,
                }))
              }
            />
            <Input
              type="number"
              placeholder="재생 시간(분)"
              value={contentForm.durationMinutes}
              onChange={(e) =>
                setContentForm((prev) => ({
                  ...prev,
                  durationMinutes: e.target.value,
                }))
              }
            />
          </div>
          <Button
            type="button"
            onClick={onCreateContent}
            disabled={
              !currentSiteId || !contentForm.title || createMutation.isPending
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            교육자료 등록
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>교육자료 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : contents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 교육자료가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">제목</th>
                    <th className="px-2 py-2">유형</th>
                    <th className="px-2 py-2">출처</th>
                    <th className="px-2 py-2">설명</th>
                    <th className="px-2 py-2">등록일</th>
                    <th className="px-2 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {contents.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-2 py-2 font-medium">{item.title}</td>
                      <td className="px-2 py-2">
                        <Badge variant="outline">
                          {getContentTypeLabel(item.contentType)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        {item.externalSource === "YOUTUBE" && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            YouTube
                          </Badge>
                        )}
                        {item.externalSource === "KOSHA" && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            KOSHA
                          </Badge>
                        )}
                        {(item.externalSource === "LOCAL" ||
                          !item.externalSource) && (
                          <Badge variant="secondary">직접</Badge>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {item.description || "-"}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteContentId(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>교육자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 교육자료를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteContent}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
