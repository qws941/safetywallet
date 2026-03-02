"use client";

import { Button } from "@safetywallet/ui";

interface Props {
  sourceMode: "LOCAL" | "YOUTUBE" | "KOSHA";
  onSetMode: (mode: "LOCAL" | "YOUTUBE" | "KOSHA") => void;
  disabled?: boolean;
}

export function SourceModeButtons({ sourceMode, onSetMode, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={sourceMode === "LOCAL" ? "default" : "outline"}
        onClick={() => onSetMode("LOCAL")}
        disabled={disabled}
      >
        📝 직접 입력
      </Button>
      <Button
        type="button"
        variant={sourceMode === "YOUTUBE" ? "default" : "outline"}
        onClick={() => onSetMode("YOUTUBE")}
        disabled={disabled}
      >
        ▶️ YouTube
      </Button>
      <Button
        type="button"
        variant={sourceMode === "KOSHA" ? "default" : "outline"}
        onClick={() => onSetMode("KOSHA")}
        disabled={disabled}
      >
        🏛️ KOSHA
      </Button>
    </div>
  );
}
