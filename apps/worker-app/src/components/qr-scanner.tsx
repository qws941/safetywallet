"use client";

import { useEffect, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@safetywallet/ui";
import { X } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
}

export function QRScanner({ open, onOpenChange, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white h-[100dvh] w-screen sm:h-auto sm:w-full sm:rounded-lg flex flex-col">
        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-white">QR 코드 스캔</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300">
            현장에 비치된 QR 코드를 비춰주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative flex items-center justify-center bg-black">
          {error ? (
            <div className="text-center p-6 space-y-4">
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-gray-400">
                카메라 권한이 거부되었거나 장치를 찾을 수 없습니다.
                <br />
                설정에서 카메라 권한을 허용해주세요.
              </p>
              <Button
                variant="outline"
                className="bg-white text-black hover:bg-gray-200 border-none"
                onClick={() => {
                  setError(null);
                  onOpenChange(false);
                  setTimeout(() => onOpenChange(true), 100);
                }}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            open && (
              <div className="w-full h-full relative">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      onScan(result[0].rawValue);
                      onOpenChange(false);
                    }
                  }}
                  onError={(err) => {
                    console.error("QR Scan Error:", err);
                    setError("카메라에 접근할 수 없습니다.");
                  }}
                  components={{
                    onOff: false,
                    torch: true,
                    zoom: true,
                    finder: true,
                  }}
                  styles={{
                    container: {
                      width: "100%",
                      height: "100%",
                      backgroundColor: "black",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                />
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
