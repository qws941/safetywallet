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
};

export function ContentsTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [contentForm, setContentForm] =
    useState<ContentFormState>(INITIAL_FORM);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: contentsData, isLoading } = useEducationContents();
  const createMutation = useCreateEducationContent();
  const deleteMutation = useDeleteEducationContent();

  const contents: EducationContentItem[] = contentsData?.contents ?? [];

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
      });
      toast({ description: "교육자료가 등록되었습니다." });
      setContentForm(INITIAL_FORM);
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
