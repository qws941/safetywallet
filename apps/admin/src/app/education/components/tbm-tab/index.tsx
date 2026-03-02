"use client";

import { useState } from "react";
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
  const [tbmForm, setTbmForm] = useState<TbmFormState>(INITIAL_FORM);
  const [editingTbmId, setEditingTbmId] = useState<string | null>(null);

  const { data: tbmData, isLoading } = useTbmRecords();
  const createMutation = useCreateTbmRecord();
  const updateMutation = useUpdateTbmRecord();
  const deleteMutation = useDeleteTbmRecord();

  const tbmRecords: TbmRecordItem[] = tbmData?.records ?? [];

  const onEditTbm = (item: TbmRecordItem) => {
    setEditingTbmId(item.tbm.id);
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
      // Error handled by caller
    }
  };

  const onDeleteTbm = async (tbmId: string) => {
    try {
      await deleteMutation.mutateAsync(tbmId);
    } catch (error) {
      // Error handled by caller
    }
  };

  return (
    <div className="space-y-4">
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
        }}
      />
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
