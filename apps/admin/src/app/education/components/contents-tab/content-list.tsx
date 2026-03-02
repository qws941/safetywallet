"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
} from "@safetywallet/ui";
import { useDeleteEducationContent } from "@/hooks/use-api";
import { getContentTypeLabel } from "../../education-helpers";
import type { EducationContentItem } from "../education-types";

interface Props {
  isLoading: boolean;
  contents: EducationContentItem[];
  onEditContent: (content: EducationContentItem) => void;
  onDeleteContent: () => void;
}

export function ContentList({
  isLoading,
  contents,
  onEditContent,
  onDeleteContent,
}: Props) {
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const deleteMutation = useDeleteEducationContent();

  const handleDeleteContent = async () => {
    if (!deleteContentId) return;
    try {
      await deleteMutation.mutateAsync(deleteContentId);
      onDeleteContent();
    } catch (error) {
      // Error handling done in parent or can add toast here
    }
    setDeleteContentId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>교육자료 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (contents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>교육자료 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            등록된 교육자료가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>교육자료 목록</CardTitle>
        </CardHeader>
        <CardContent>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditContent(item)}
                          disabled={deleteMutation.isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteContentId(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <AlertDialogAction onClick={handleDeleteContent}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
