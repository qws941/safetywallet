"use client";

import {
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
} from "@safetywallet/ui";
import type { CreateStatutoryTrainingInput } from "@/hooks/use-api";
import type { TrainingFormState } from "../education-types";

interface TrainingFormProps {
  trainingForm: TrainingFormState;
  setTrainingForm: React.Dispatch<React.SetStateAction<TrainingFormState>>;
  editingTrainingId: string | null;
  onSubmitTraining: () => void;
  onCancel: () => void;
}

export function TrainingForm({
  trainingForm,
  setTrainingForm,
  editingTrainingId,
  onSubmitTraining,
  onCancel,
}: TrainingFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingTrainingId ? "법정교육 수정" : "법정교육 등록"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="대상자 사용자 ID"
            value={trainingForm.userId}
            onChange={(e) =>
              setTrainingForm((prev) => ({
                ...prev,
                userId: e.target.value,
              }))
            }
            disabled={!!editingTrainingId}
          />
          <Select
            value={trainingForm.trainingType}
            onValueChange={(value) =>
              setTrainingForm((prev) => ({
                ...prev,
                trainingType:
                  value as CreateStatutoryTrainingInput["trainingType"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="교육 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW_WORKER">신규채용</SelectItem>
              <SelectItem value="SPECIAL">특별교육</SelectItem>
              <SelectItem value="REGULAR">정기교육</SelectItem>
              <SelectItem value="CHANGE_OF_WORK">작업변경</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="교육명"
          value={trainingForm.trainingName}
          onChange={(e) =>
            setTrainingForm((prev) => ({
              ...prev,
              trainingName: e.target.value,
            }))
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            type="date"
            value={trainingForm.trainingDate}
            onChange={(e) =>
              setTrainingForm((prev) => ({
                ...prev,
                trainingDate: e.target.value,
              }))
            }
          />
          <Input
            type="date"
            value={trainingForm.expirationDate}
            onChange={(e) =>
              setTrainingForm((prev) => ({
                ...prev,
                expirationDate: e.target.value,
              }))
            }
          />
          <Input
            type="number"
            placeholder="이수시간"
            value={trainingForm.hoursCompleted}
            onChange={(e) =>
              setTrainingForm((prev) => ({
                ...prev,
                hoursCompleted: e.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="교육기관"
            value={trainingForm.provider}
            onChange={(e) =>
              setTrainingForm((prev) => ({
                ...prev,
                provider: e.target.value,
              }))
            }
          />
          <Select
            value={trainingForm.status}
            onValueChange={(value) =>
              setTrainingForm((prev) => ({
                ...prev,
                status: value as CreateStatutoryTrainingInput["status"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">예정</SelectItem>
              <SelectItem value="COMPLETED">완료</SelectItem>
              <SelectItem value="EXPIRED">만료</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="비고"
          value={trainingForm.notes}
          onChange={(e) =>
            setTrainingForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
        />
        <div className="flex gap-2">
          <Button type="button" onClick={onSubmitTraining}>
            {editingTrainingId ? "수정 저장" : "법정교육 등록"}
          </Button>
          {editingTrainingId && (
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
