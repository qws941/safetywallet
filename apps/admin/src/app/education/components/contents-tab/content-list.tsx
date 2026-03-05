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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@safetywallet/ui";
import { useDeleteEducationContent } from "@/hooks/use-api";
import { useEducationCompletions } from "@/hooks/use-education-completions";
import { DataTable, type Column } from "@/components/data-table";
import { getContentTypeLabel, getErrorMessage } from "../../education-helpers";
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
  const [selectedContent, setSelectedContent] =
    useState<EducationContentItem | null>(null);
  const deleteMutation = useDeleteEducationContent();
  const { data: completionsData, isLoading: completionsLoading } =
    useEducationCompletions(selectedContent?.id);
  const { toast } = useToast();
  const handleDeleteContent = async () => {
    if (!deleteContentId) return;
    try {
      await deleteMutation.mutateAsync(deleteContentId);
      onDeleteContent();
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    } finally {
      setDeleteContentId(null);
    }
  };

  const columns: Column<EducationContentItem>[] = [
    {
      key: "title",
      header: "제목",
      sortable: true,
      render: (item) => (
        <span className="font-medium break-words">{item.title}</span>
      ),
    },
    {
      key: "contentType",
      header: "유형",
      sortable: true,
      render: (item) => (
        <Badge variant="outline">{getContentTypeLabel(item.contentType)}</Badge>
      ),
    },
    {
      key: "externalSource",
      header: "출처",
      render: (item) => {
        if (item.externalSource === "YOUTUBE") {
          return (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              YouTube
            </Badge>
          );
        }
        if (item.externalSource === "KOSHA") {
          return (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              KOSHA
            </Badge>
          );
        }
        return <Badge variant="secondary">직접</Badge>;
      },
    },
    {
      key: "description",
      header: "설명",
      render: (item) => (
        <span className="text-muted-foreground break-words">
          {item.description || "-"}
        </span>
      ),
    },
    {
      key: "viewCount",
      header: "조회수",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">{item.viewCount ?? 0}</span>
      ),
    },
    {
      key: "completionCount",
      header: "이수자수",
      sortable: true,
      render: (item) => {
        const count = item.completionCount ?? 0;
        return count > 0 ? (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedContent(item);
            }}
          >
            {count}명
          </button>
        ) : (
          <span className="text-muted-foreground">0명</span>
        );
      },
    },
    {
      key: "createdAt",
      header: "등록일",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "_actions",
      header: "관리",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEditContent(item);
            }}
            disabled={deleteMutation.isPending}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteContentId(item.id);
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">로딩 중...</p>;
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={contents}
        searchable
        searchPlaceholder="교육자료 검색..."
        emptyMessage="등록된 교육자료가 없습니다."
      />

      <Dialog
        open={!!selectedContent}
        onOpenChange={(open) => !open && setSelectedContent(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title} - 이수자 목록</DialogTitle>
            <DialogDescription>
              총 {selectedContent?.completionCount ?? 0}명 이수
            </DialogDescription>
          </DialogHeader>
          {completionsLoading ? (
            <p className="text-sm text-muted-foreground py-4">로딩 중...</p>
          ) : completionsData?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              이수자가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">소속</th>
                    <th className="py-2">이수일시</th>
                  </tr>
                </thead>
                <tbody>
                  {completionsData?.items.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-4">{c.userName || "-"}</td>
                      <td className="py-2 pr-4">{c.userCompany || "-"}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(c.signedAt).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
