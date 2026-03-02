"use client";

import { Button, Card, Input } from "@safetywallet/ui";

interface InfoRequestFormProps {
  note: string;
  isPending: boolean;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function InfoRequestForm({
  note,
  isPending,
  onNoteChange,
  onSubmit,
  onCancel,
}: InfoRequestFormProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium">추가 정보 요청</h3>
      <Input
        placeholder="필요한 정보를 입력하세요"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        className="mb-3"
      />
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={!note.trim() || isPending}>
          요청 보내기
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
