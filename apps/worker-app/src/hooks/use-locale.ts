"use client";

import { useCallback, useContext } from "react";
import { I18nContext } from "@/i18n/context";
import type { Locale } from "@/i18n/config";

export function useLocale() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useLocale must be used within I18nProvider");
  }

  const { locale, setLocale } = context;

  const handleSetLocale = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("i18n-locale", newLocale);
      }
    },
    [setLocale],
  );

  return {
    currentLocale: locale,
    setLocale: handleSetLocale,
  };
}
