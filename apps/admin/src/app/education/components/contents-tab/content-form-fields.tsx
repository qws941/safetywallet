"use client";

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@safetywallet/ui";
import type { ContentFormState } from "../education-types";
import type { CreateEducationContentInput } from "@/hooks/use-api";

interface Props {
  contentForm: ContentFormState;
  onContentFormChange: (form: ContentFormState) => void;
}

export function ContentFormFields({ contentForm, onContentFormChange }: Props) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="제목"
          value={contentForm.title}
          onChange={(e) =>
            onContentFormChange({ ...contentForm, title: e.target.value })
          }
        />
        <Select
          value={contentForm.contentType}
          onValueChange={(value) =>
            onContentFormChange({
              ...contentForm,
              contentType: value as CreateEducationContentInput["contentType"],
            })
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
          onContentFormChange({ ...contentForm, description: e.target.value })
        }
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="콘텐츠 URL"
          value={contentForm.contentUrl}
          onChange={(e) =>
            onContentFormChange({ ...contentForm, contentUrl: e.target.value })
          }
        />
        <Input
          placeholder="썸네일 URL"
          value={contentForm.thumbnailUrl}
          onChange={(e) =>
            onContentFormChange({
              ...contentForm,
              thumbnailUrl: e.target.value,
            })
          }
        />
        <Input
          type="number"
          placeholder="재생 시간(분)"
          value={contentForm.durationMinutes}
          onChange={(e) =>
            onContentFormChange({
              ...contentForm,
              durationMinutes: e.target.value,
            })
          }
        />
      </div>
    </>
  );
}
