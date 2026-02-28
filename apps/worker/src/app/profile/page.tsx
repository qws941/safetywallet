"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useSiteInfo, useLeaveSite } from "@/hooks/use-api";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useTranslation } from "@/hooks/use-translation";

import { Header } from "@/components/header";

import { BottomNav } from "@/components/bottom-nav";
import {
  Card,
  CardContent,
  Button,
  Avatar,
  AvatarFallback,
  Skeleton,
  Switch,
  toast,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@safetywallet/ui";

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslation();
  const { logout, currentSiteId, setCurrentSite } = useAuth();
  const { data, isLoading } = useProfile();
  const { data: siteData } = useSiteInfo(currentSiteId);
  const leaveSite = useLeaveSite();
  const {
    isSupported,
    isSubscribed,
    isLoading: isPushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushSubscription();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const user = data?.data?.user;

  const site = siteData?.data?.site;

  const handlePushToggle = async (checked: boolean) => {
    if (isPushLoading) return;
    if (checked) {
      await subscribe();
      return;
    }
    await unsubscribe();
  };

  const handleLogout = () => {
    logout();
    window.location.replace("/login/");
  };

  const handleLeaveSite = () => {
    if (!currentSiteId) return;
    leaveSite.mutate(
      { siteId: currentSiteId },
      {
        onSuccess: () => {
          setLeaveOpen(false);
          toast({
            title: t("common.success"),
            description: t("profile.leaveSuccess"),
          });
          setCurrentSite(null);
          router.replace("/home");
        },
        onError: () => {
          toast({
            title: t("common.error"),
            description: t("profile.leaveFailed"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-nav">
      <Header />

      <main className="p-4 space-y-4">
        {/* Profile Card */}
        <Card>
          <CardContent className="py-6">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {user?.nameMasked?.slice(0, 1) || "👷"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">
                    {user?.nameMasked || t("profile.noName")}
                  </h2>
                  {user?.phone ? (
                    <p className="text-sm text-muted-foreground">
                      {user.phone}
                    </p>
                  ) : null}
                  {user?.companyName ? (
                    <p className="text-sm text-muted-foreground">
                      {user.companyName}
                      {user.tradeType ? ` · ${user.tradeType}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Site Info */}
        {currentSiteId && (
          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">{t("profile.currentSite")}</h3>
              <p className="text-sm font-medium">
                {site?.name || t("profile.loading")}
              </p>
              {site?.address && (
                <p className="text-xs text-muted-foreground mt-1">
                  {site.address}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">푸시 알림</h3>
                <p className="text-xs text-muted-foreground">
                  {isSupported
                    ? isSubscribed
                      ? "알림 수신이 활성화되었습니다."
                      : "중요 공지와 안내를 알림으로 받을 수 있습니다."
                    : "현재 기기에서는 푸시 알림을 지원하지 않습니다."}
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                disabled={!isSupported || isPushLoading}
                onCheckedChange={handlePushToggle}
                aria-label="푸시 알림 수신"
              />
            </div>
            {isPushLoading ? (
              <p className="text-xs text-muted-foreground">
                알림 설정을 적용하는 중입니다...
              </p>
            ) : null}
            {pushError ? (
              <p className="text-xs text-destructive">{pushError}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* Actions */}

        <div className="space-y-3">
          <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={!currentSiteId}
              >
                <span className="mr-2">📍</span>
                {t("profile.leaveSiteButton")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("profile.leaveSiteTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("profile.leaveSiteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveSite}
                  disabled={leaveSite.isPending}
                >
                  {leaveSite.isPending
                    ? t("profile.processing")
                    : t("profile.leaveSiteButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive"
            onClick={handleLogout}
          >
            <span className="mr-2">🚶</span>
            {t("profile.logout")}
          </Button>
        </div>

        {/* App Info */}
        <Card>
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 송도세브란스 SafetyWallet</p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
