"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEducationContent } from "@/hooks/use-api";
import { useTranslation } from "@/hooks/use-translation";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
} from "@safetywallet/ui";
import {
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  Calendar,
} from "lucide-react";

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />
      <main className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
      <BottomNav />
    </div>
  );
}

function toYouTubeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www\.|m\.)/, "");
    const isYouTube = host === "youtube.com" || host === "youtube-nocookie.com";
    let videoId: string | null = null;

    if (isYouTube) {
      videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/)?.[2] ||
        null;
    } else if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1).split(/[/?#]/)[0] || null;
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    // not a valid URL — fall through
  }
  return url;
}

function toYouTubeWatchUrl(url: string): string | null {
  const embedUrl = toYouTubeEmbedUrl(url);
  const match = embedUrl.match(/\/embed\/([^/?#]+)/);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
}

function EducationDetailContent() {
  const router = useRouter();
  const t = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { data, isLoading, error } = useEducationContent(id);

  const getContentTypeLabel = (contentType: string) => {
    const typeKey = `education.contentTypes.${contentType}` as const;
    return t(typeKey) || contentType;
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 pb-nav">
        <Header />
        <main className="p-4">
          <div className="text-center py-12">
            <p className="text-4xl mb-4">❌</p>
            <p className="text-muted-foreground">{t("education.notFound")}</p>
            <Button className="mt-4" onClick={() => router.back()}>
              {t("common.back")}
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />

      <main className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {getContentTypeLabel(data.contentType)}
          </Badge>
          {data.isRequired && (
            <Badge variant="destructive">
              {t("education.requiredEducation")}
            </Badge>
          )}
        </div>

        <h1 className="text-xl font-bold">{data.title}</h1>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(data.createdAt).toLocaleDateString("ko-KR")}
        </div>

        {/* Content Type Specific Display */}
        {data.contentType === "VIDEO" &&
          data.contentUrl &&
          (() => {
            const embedUrl = toYouTubeEmbedUrl(data.contentUrl);
            const watchUrl = toYouTubeWatchUrl(data.contentUrl);
            return (
              <div className="space-y-2">
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={data.title}
                  />
                </div>
                {watchUrl && (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    YouTube에서 보기
                  </a>
                )}
              </div>
            );
          })()}

        {data.contentType === "IMAGE" && data.contentUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={data.contentUrl}
              alt={data.title}
              width={1200}
              height={800}
              className="w-full h-auto object-contain"
              unoptimized
            />
          </div>
        )}

        {data.description && (
          <Card>
            <CardContent className="p-4 bg-gray-50 text-sm text-gray-600">
              {data.description}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("education.details")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {data.content}
            </div>
          </CardContent>
        </Card>

        {data.contentType === "DOCUMENT" && data.contentUrl && (
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={() => window.open(data.contentUrl, "_blank")}
          >
            <Download className="w-4 h-4" />
            {t("education.documentDownload")}
          </Button>
        )}

        <Button
          className="w-full mt-4"
          variant="secondary"
          onClick={() => router.back()}
        >
          {t("education.backToList")}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}

export default function EducationViewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EducationDetailContent />
    </Suspense>
  );
}
