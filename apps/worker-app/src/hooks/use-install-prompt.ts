"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Define the BeforeInstallPromptEvent interface locally
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);

    setIsInstalled(isStandalone);

    // Check if banner was dismissed recently
    const dismissedTime = localStorage.getItem(
      "safetywallet-install-dismissed",
    );
    const isDismissed = dismissedTime
      ? Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000 // 7 days
      : false;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt.current = e as BeforeInstallPromptEvent;

      // Only show installable if not installed and not dismissed
      if (!isStandalone && !isDismissed) {
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      deferredPrompt.current = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;

    // Show the install prompt
    await deferredPrompt.current.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.current.userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
    }

    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt.current = null;
    return outcome;
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(
      "safetywallet-install-dismissed",
      Date.now().toString(),
    );
    setIsInstallable(false);
  }, []);

  return { isInstallable, isInstalled, promptInstall, dismissBanner };
}
