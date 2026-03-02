"use client";

import Image from "next/image";
import { Button, Input } from "@safetywallet/ui";

interface Props {
  youtubeUrl: string;
  thumbnailUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  onFetchYoutubeInfo: () => void;
  isPending: boolean;
}

export function YouTubeSection({
  youtubeUrl,
  thumbnailUrl,
  onYoutubeUrlChange,
  onFetchYoutubeInfo,
  isPending,
}: Props) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          placeholder="YouTube URL"
          value={youtubeUrl}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onFetchYoutubeInfo}
          disabled={isPending}
        >
          정보 가져오기
        </Button>
      </div>
      {thumbnailUrl && (
        <Image
          src={thumbnailUrl}
          alt="YouTube thumbnail"
          width={224}
          height={128}
          unoptimized
          className="h-32 w-56 rounded-md border object-cover"
        />
      )}
    </div>
  );
}
