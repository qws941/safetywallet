"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
} from "@safetywallet/ui";
import { useAuth } from "@/hooks/use-auth";
import {
  useMyRecommendationHistory,
  useSubmitRecommendation,
  useTodayRecommendation,
} from "@/hooks/use-api";
import { Award, CheckCircle, Send, History } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function RecommendationsPage() {
  const router = useRouter();
  const t = useTranslation();
  const { currentSiteId } = useAuth();

  const [recommendedName, setRecommendedName] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: todayResponse, isLoading } = useTodayRecommendation();
  const todayData = todayResponse?.data;

  const { data: historyResponse } = useMyRecommendationHistory(showHistory);
  const history = historyResponse?.data ?? [];

  const submitMutation = useSubmitRecommendation();

  const handleSubmit = () => {
    if (
      recommendedName.trim() &&
      tradeType.trim() &&
      reason.trim() &&
      currentSiteId
    ) {
      submitMutation.mutate(
        {
          siteId: currentSiteId,
          recommendedName: recommendedName.trim(),
          tradeType: tradeType.trim(),
          reason: reason.trim(),
        },
        {
          onSuccess: () => {
            setRecommendedName("");
            setTradeType("");
            setReason("");
          },
        },
      );
    }
  };

  const isFormValid =
    recommendedName.trim().length > 0 &&
    tradeType.trim().length > 0 &&
    reason.trim().length > 0;

  if (!currentSiteId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {t("votes.selectSiteFirst")}
            </p>
            <Button onClick={() => router.push("/home")} className="mt-4">
              {t("votes.backHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              {t("votes.recommendWorkerTitle")}
            </CardTitle>
            <CardDescription>{t("votes.recommendWorkerDesc")}</CardDescription>
          </CardHeader>
        </Card>

        {todayData?.hasRecommendedToday ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="font-medium text-green-700">
                {t("votes.recommendedToday")}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {t("votes.canRecommendTomorrow")}
              </p>
              {todayData.recommendation && (
                <div className="mt-4 p-3 bg-white rounded-lg text-left">
                  <p className="text-sm font-medium text-gray-700">
                    {todayData.recommendation.recommendedName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {todayData.recommendation.tradeType}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {todayData.recommendation.reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="tradeType"
                  className="text-sm font-medium leading-none"
                >
                  {t("votes.tradeType")}
                </label>
                <Input
                  id="tradeType"
                  placeholder={t("votes.tradeTypePlaceholder")}
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="recommendedName"
                  className="text-sm font-medium leading-none"
                >
                  {t("votes.workerName")}
                </label>
                <Input
                  id="recommendedName"
                  placeholder={t("votes.workerNamePlaceholder")}
                  value={recommendedName}
                  onChange={(e) => setRecommendedName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reason"
                  className="text-sm font-medium leading-none"
                >
                  {t("votes.recommendationReason")}
                </label>
                <textarea
                  id="reason"
                  placeholder={t("votes.reasonPlaceholder")}
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setReason(e.target.value)
                  }
                  className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!isFormValid || submitMutation.isPending}
                onClick={handleSubmit}
              >
                {submitMutation.isPending ? (
                  t("votes.submitting")
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {t("votes.recommend")}
                  </span>
                )}
              </Button>

              {submitMutation.error && (
                <p className="text-sm text-destructive text-center">
                  {submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : t("votes.submitError")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          {showHistory ? t("votes.hideHistory") : t("votes.showHistory")}
        </Button>

        {showHistory && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("votes.noHistory")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              history.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {rec.recommendedName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rec.tradeType}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {rec.recommendationDate}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
