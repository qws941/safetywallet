"use client";

import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useTranslation } from "@/hooks/use-translation";

export function InstallBanner() {
  const t = useTranslation();
  const { isInstallable, promptInstall, dismissBanner } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-[80px] left-4 right-4 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="relative overflow-hidden rounded-xl bg-slate-900 p-4 text-white shadow-xl">
        <button
          type="button"
          onClick={dismissBanner}
          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
          aria-label={t("components.installBanner.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold leading-none tracking-tight">
              {t("components.installBanner.title")}
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              {t("components.installBanner.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={promptInstall}
            className="flex-shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 active:bg-blue-700"
          >
            {t("components.installBanner.install")}
          </button>
        </div>
      </div>
    </div>
  );
}
