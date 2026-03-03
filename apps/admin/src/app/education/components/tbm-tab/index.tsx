"use client";

import { useState } from "react";
import { Button, useToast } from "@safetywallet/ui";
import { Plus, ChevronUp } from "lucide-react";
import {
  useCreateTbmRecord,
  useUpdateTbmRecord,
  useDeleteTbmRecord,
  useTbmRecords,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "../../education-helpers";
import type { TbmFormState, TbmRecordItem } from "../education-types";
import { TbmForm } from "./tbm-form";
import { TbmList } from "./tbm-list";

const INITIAL_FORM: TbmFormState = {
  date: "",
  topic: "",
  content: "",
  weatherCondition: "",
  specialNotes: "",
};

export function TbmTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();
  const [tbmForm, setTbmForm] = useState<TbmFormState>(INITIAL_FORM);
  const [editingTbmId, setEditingTbmId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: tbmData, isLoading } = useTbmRecords();
  const createMutation = useCreateTbmRecord();
  const updateMutation = useUpdateTbmRecord();
  const deleteMutation = useDeleteTbmRecord();

  const tbmRecords: TbmRecordItem[] = tbmData?.records ?? [];

  const onEditTbm = (item: TbmRecordItem) => {
    setEditingTbmId(item.tbm.id);
    setShowForm(true);
    setTbmForm({
      date: item.tbm.date,
      topic: item.tbm.topic,
      content: "",
      weatherCondition: item.tbm.weatherCondition || "",
      specialNotes: "",
    });
  };

  const onCreateTbm = async () => {
    if (!currentSiteId || !tbmForm.date || !tbmForm.topic) return;

    const payload = {
      siteId: currentSiteId,
      date: tbmForm.date,
      topic: tbmForm.topic,
      content: tbmForm.content || undefined,
      weatherCondition: tbmForm.weatherCondition || undefined,
      specialNotes: tbmForm.specialNotes || undefined,
    };

    try {
      if (editingTbmId) {
        await updateMutation.mutateAsync({
          id: editingTbmId,
          data: {
            date: payload.date,
            topic: payload.topic,
            content: payload.content,
            weatherCondition: payload.weatherCondition,
            specialNotes: payload.specialNotes,
          },
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setEditingTbmId(null);
      setTbmForm(INITIAL_FORM);
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onDeleteTbm = async (tbmId: string) => {
    try {
      await deleteMutation.mutateAsync(tbmId);
    } catch (error) {
      // Re-throw so tbm-list.tsx handleDeleteTbm can show error toast
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant={showForm ? "outline" : "default"}
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingTbmId(null);
              setTbmForm(INITIAL_FORM);
            }
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
              TBM 등록
            </>
          )}
        </Button>
      </div>
      {showForm && (
        <TbmForm
          tbmForm={tbmForm}
          setTbmForm={setTbmForm}
          editingTbmId={editingTbmId}
          currentSiteId={currentSiteId}
          createMutation={createMutation}
          updateMutation={updateMutation}
          onSubmit={onCreateTbm}
          onCancelEdit={() => {
            setEditingTbmId(null);
            setTbmForm(INITIAL_FORM);
            setShowForm(false);
          }}
        />
      )}
      <TbmList
        tbmRecords={tbmRecords}
        isLoading={isLoading}
        onEditTbm={onEditTbm}
        onDeleteTbm={onDeleteTbm}
        deleteMutation={deleteMutation}
      />
    </div>
  );
}
export default TbmTab;
