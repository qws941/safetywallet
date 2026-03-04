"use client";

import { useTranslation } from "@/hooks/use-translation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslation();
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted px-4">
      <div className="bg-background rounded-lg shadow-md p-8 max-w-sm w-full text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">500</h1>
        <p className="text-foreground mb-2">{t("common.errorOccurred")}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {t("common.tryAgain")}
        </p>

        {isDev && error.message && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left">
            <p className="text-xs text-red-600 font-mibold font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}
