import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@safetywallet/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "송도세브란스 안전지갑",
  description: "송도세브란스 건설현장 안전 제보 앱",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    statusBarStyle: "default",
    title: "송도세브란스 안전지갑",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
        >
          메인 콘텐츠로 건너뛰기
        </a>
        <ErrorBoundary>
          <Providers>
            <main id="main-content" className="flex flex-col min-h-screen">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
