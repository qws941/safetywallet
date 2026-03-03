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
  useToast,
} from "@safetywallet/ui";
import { useDeleteEducationContent } from "@/hooks/use-api";
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
  const deleteMutation = useDeleteEducationContent();
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
      render: (item) => <span className="font-medium">{item.title}</span>,
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
        <span className="text-muted-foreground">{item.description || "-"}</span>
      ),
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
