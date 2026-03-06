"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { usePoints } from "@/hooks/use-api";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@safetywallet/ui";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  AlertTriangle,
  ThumbsUp,
  Megaphone,
  Wallet,
} from "lucide-react";

export default function HomePage() {
  const { currentSiteId, isAuthenticated, _hasHydrated, user } = useAuth();
  const isReady = _hasHydrated && isAuthenticated;
  const activeSiteId = isReady ? currentSiteId : "";
  const t = useTranslation();

  const { data: pointsData } = usePoints(activeSiteId || "");
  const pointsBalance = pointsData?.data?.balance || 0;

  if (!currentSiteId) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] dark:bg-background pb-nav">
        <header className="flex items-center justify-between px-6 py-5 bg-[#1a1a2e] text-white rounded-b-2xl shadow-sm">
          <div className="leading-[1.05] tracking-tight text-blue-400">
            <p className="text-xl font-semibold italic">MIRAE</p>
            <p className="text-xl font-semibold italic">DOSI</p>
          </div>
          <button className="relative p-2" aria-label="Notifications">
            <Bell className="w-6 h-6 text-white" />
          </button>
        </header>
        <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="text-4xl">🏗️</div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("auth.noSitesAvailable")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("home.pleaseWait")}
          </p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-background pb-nav">
      <header className="flex items-center justify-between px-6 py-5 bg-[#1a1a2e] text-white rounded-b-2xl shadow-sm mb-6">
        <div className="leading-[1.05] tracking-tight text-blue-400">
          <p className="text-xl font-semibold italic">MIRAE</p>
          <p className="text-xl font-semibold italic">DOSI</p>
        </div>
        <Link
          href="/notifications"
          className="relative p-2"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-white" />
        </Link>
      </header>

      <main className="px-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            {t("home.greetingName", {
              name: user?.nameMasked || t("profile.noName"),
            })}
          </h2>
          <Link
            href="/points"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center hover:underline"
          >
            {t("home.myPointsCount", { count: pointsBalance })}{" "}
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/posts/new">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-6 flex flex-col items-center justify-center h-36">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <span className="text-base font-bold text-foreground">
                  {t("home.safetyReport")}
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/votes">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-6 flex flex-col items-center justify-center h-36">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <ThumbsUp className="w-7 h-7 text-blue-500" />
                </div>
                <span className="text-base font-bold text-foreground">
                  {t("home.recommendation")}
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/announcements">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-6 flex flex-col items-center justify-center h-36">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                  <Megaphone className="w-7 h-7 text-orange-500" />
                </div>
                <span className="text-base font-bold text-foreground">
                  {t("home.notices")}
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/points">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-6 flex flex-col items-center justify-center h-36">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <Wallet className="w-7 h-7 text-emerald-500" />
                </div>
                <span className="text-base font-bold text-foreground">
                  {t("home.safetyWallet")}
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
