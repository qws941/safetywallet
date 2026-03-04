"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted px-4">
      <div className="bg-background rounded-lg shadow-md p-8 max-w-sm w-full text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">500</h1>
        <p className="text-foreground mb-2">오류가 발생했습니다</p>
        <p className="text-sm text-muted-foreground mb-6">
          페이지를 새로고침하거나 다시 시도해 주세요.
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
          다시 시도
        </button>
      </div>
    </div>
  );
}
