"use client";

import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  useToast,
} from "@safetywallet/ui";
import type { TbmFormState } from "../education-types";
import type { CreateTbmRecordInput } from "@/hooks/use-api";

interface Props {
  tbmForm: TbmFormState;
  setTbmForm: React.Dispatch<React.SetStateAction<TbmFormState>>;
  editingTbmId: string | null;
  currentSiteId: string | null;
  createMutation: {
    mutateAsync: (data: CreateTbmRecordInput) => Promise<unknown>;
    isPending: boolean;
  };
  updateMutation: {
    mutateAsync: (data: {
      id: string;
      data: Partial<CreateTbmRecordInput>;
    }) => Promise<unknown>;
    isPending: boolean;
  };
  onSubmit: () => Promise<void>;
  onCancelEdit: () => void;
}

export function TbmForm({
  tbmForm,
  setTbmForm,
  editingTbmId,
  currentSiteId,
  createMutation,
  updateMutation,
  onSubmit,
  onCancelEdit,
}: Props) {
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await onSubmit();
      toast({
        description: editingTbmId
          ? "TBM 기록이 수정되었습니다."
          : "TBM 기록이 등록되었습니다.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "오류가 발생했습니다.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingTbmId ? "TBM 기록 수정" : "TBM 등록"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="date"
            value={tbmForm.date}
            onChange={(e) =>
              setTbmForm((prev) => ({ ...prev, date: e.target.value }))
            }
          />
          <Input
            placeholder="주제"
            value={tbmForm.topic}
            onChange={(e) =>
              setTbmForm((prev) => ({ ...prev, topic: e.target.value }))
            }
          />
        </div>
        <textarea
          className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="내용"
          value={tbmForm.content}
          onChange={(e) =>
            setTbmForm((prev) => ({ ...prev, content: e.target.value }))
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="날씨"
            value={tbmForm.weatherCondition}
            onChange={(e) =>
              setTbmForm((prev) => ({
                ...prev,
                weatherCondition: e.target.value,
              }))
            }
          />
          <Input
            placeholder="특이사항"
            value={tbmForm.specialNotes}
            onChange={(e) =>
              setTbmForm((prev) => ({
                ...prev,
                specialNotes: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !currentSiteId ||
              !tbmForm.date ||
              !tbmForm.topic ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {editingTbmId ? "TBM 수정" : "TBM 등록"}
          </Button>
          {editingTbmId && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
