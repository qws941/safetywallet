"use client";

import { useState } from "react";
import { useToast } from "@safetywallet/ui";
import {
  useCreateStatutoryTraining,
  useStatutoryTrainings,
  useUpdateStatutoryTraining,
  useDeleteStatutoryTraining,
  type CreateStatutoryTrainingInput,
  type UpdateStatutoryTrainingInput,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "../../education-helpers";
import type { TrainingFormState, TrainingItem } from "../education-types";
import { TrainingForm } from "./training-form";
import { TrainingList } from "./training-list";

const INITIAL_FORM: TrainingFormState = {
  userId: "",
  trainingType: "NEW_WORKER",
  trainingName: "",
  trainingDate: "",
  expirationDate: "",
  provider: "",
  hoursCompleted: "0",
  status: "SCHEDULED",
  notes: "",
};

export function StatutoryTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [trainingForm, setTrainingForm] =
    useState<TrainingFormState>(INITIAL_FORM);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(
    null,
  );
  const [deleteTrainingId, setDeleteTrainingId] = useState<string | null>(null);

  const { data: trainingsData, isLoading } = useStatutoryTrainings();
  const createMutation = useCreateStatutoryTraining();
  const updateMutation = useUpdateStatutoryTraining();
  const deleteMutation = useDeleteStatutoryTraining();

  const trainings: TrainingItem[] = trainingsData?.trainings ?? [];

  const toDateInputValue = (v: string | number | null | undefined): string => {
    if (!v) return "";
    if (typeof v === "number" || /^\d{5,}$/.test(String(v))) {
      return new Date(Number(v) * 1000).toISOString().split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
    return "";
  };

  const onSubmitTraining = async () => {
    if (!currentSiteId || !trainingForm.userId || !trainingForm.trainingName)
      return;
    if (!trainingForm.trainingDate) return;

    const payload: CreateStatutoryTrainingInput = {
      siteId: currentSiteId,
      userId: trainingForm.userId,
      trainingType: trainingForm.trainingType,
      trainingName: trainingForm.trainingName,
      trainingDate: trainingForm.trainingDate,
      expirationDate: trainingForm.expirationDate || undefined,
      provider: trainingForm.provider || undefined,
      hoursCompleted: Number(trainingForm.hoursCompleted || 0),
      status: trainingForm.status,
      notes: trainingForm.notes || undefined,
    };

    try {
      if (editingTrainingId) {
        const updatePayload: UpdateStatutoryTrainingInput = {
          trainingType: payload.trainingType,
          trainingName: payload.trainingName,
          trainingDate: payload.trainingDate,
          expirationDate: payload.expirationDate,
          provider: payload.provider,
          hoursCompleted: payload.hoursCompleted,
          status: payload.status,
          notes: payload.notes,
        };
        await updateMutation.mutateAsync({
          id: editingTrainingId,
          data: updatePayload,
        });
        toast({ description: "법정교육이 수정되었습니다." });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ description: "법정교육이 등록되었습니다." });
      }
      setEditingTrainingId(null);
      setTrainingForm(INITIAL_FORM);
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onEditTraining = (item: TrainingItem) => {
    setEditingTrainingId(item.training.id);
    setTrainingForm({
      userId: item.training.userId,
      trainingType: item.training.trainingType,
      trainingName: item.training.trainingName,
      trainingDate: toDateInputValue(item.training.trainingDate),
      expirationDate: toDateInputValue(item.training.expirationDate),
      provider: item.training.provider || "",
      hoursCompleted: String(item.training.hoursCompleted ?? 0),
      status: item.training.status,
      notes: item.training.notes || "",
    });
  };

  const onDeleteTraining = async () => {
    if (!deleteTrainingId) return;
    try {
      await deleteMutation.mutateAsync(deleteTrainingId);
      toast({ description: "법정교육이 삭제되었습니다." });
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
    setDeleteTrainingId(null);
  };

  return (
    <div className="space-y-4">
      <TrainingForm
        trainingForm={trainingForm}
        setTrainingForm={setTrainingForm}
        editingTrainingId={editingTrainingId}
        onSubmitTraining={onSubmitTraining}
        onCancel={() => {
          setEditingTrainingId(null);
          setTrainingForm(INITIAL_FORM);
        }}
      />
      <TrainingList
        isLoading={isLoading}
        trainings={trainings}
        deleteMutation={deleteMutation}
        onEditTraining={onEditTraining}
        onDeleteTraining={setDeleteTrainingId}
        deleteTrainingId={deleteTrainingId}
        onDeleteConfirm={onDeleteTraining}
        onDeleteCancel={() => setDeleteTrainingId(null)}
      />
    </div>
  );
}

export default StatutoryTab;
