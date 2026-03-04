"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@safetywallet/ui";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import type {
  ApiResponse,
  AuthResponseDto,
  MeResponseDto,
} from "@safetywallet/types";

const ERROR_CODES: Record<string, string> = {
  USER_NOT_FOUND: "auth.error.accountNotFound",
  NAME_MISMATCH: "auth.error.invalidCredentials",
  ATTENDANCE_NOT_VERIFIED: "auth.error.accountLocked",
  ACCOUNT_LOCKED: "auth.error.accountLocked",
  RATE_LIMIT_EXCEEDED: "auth.error.tooManyAttempts",
};

function parseErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      const code = parsed?.error?.code;
      if (code && ERROR_CODES[code]) {
        switch (ERROR_CODES[code]) {
          case "auth.error.accountNotFound":
            return t("auth.error.accountNotFound");
          case "auth.error.invalidCredentials":
            return t("auth.error.invalidCredentials");
          case "auth.error.accountLocked":
            return t("auth.error.accountLocked");
          case "auth.error.tooManyAttempts":
            return t("auth.error.tooManyAttempts");
          default:
            return t("auth.success.loginFailed");
        }
      }
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      return t("auth.success.loginFailed");
    }
  }
  return t("auth.success.loginFailed");
}

export default function LoginClient() {
  const t = useTranslation();
  const { login, setCurrentSite, isAuthenticated, _hasHydrated } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !loading) {
      window.location.replace("/home/");
    }
  }, [_hasHydrated, isAuthenticated, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginResponse = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          dob: dob.trim(),
        }),
      });
      if (!loginResponse.ok) {
        throw new Error(await loginResponse.text());
      }
      const response =
        (await loginResponse.json()) as ApiResponse<AuthResponseDto>;

      login(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken,
      );

      try {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${response.data.accessToken}` },
        });
        if (!meRes.ok) {
          throw new Error("failed to fetch me");
        }
        const meResponse = (await meRes.json()) as ApiResponse<MeResponseDto>;
        if (meResponse.data.siteId) {
          setCurrentSite(meResponse.data.siteId);
        }
      } catch {
        setCurrentSite(null);
      }

      window.location.replace("/home/");
    } catch (err) {
      setError(parseErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const phoneClean = phone.trim().replace(/-/g, "");
  const dobClean = dob.trim().replace(/-/g, "");
  const isPhoneValid = /^\d{10,11}$/.test(phoneClean);
  const isDobValid = /^\d{6,8}$/.test(dobClean);
  const isFormValid = isPhoneValid && name.trim().length > 0 && isDobValid;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("auth.login")}</CardTitle>
          <CardDescription>{t("auth.loginAttendanceOnly")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                {t("auth.phoneNumber")}
              </label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                className="h-11"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t("auth.name")}
              </label>
              <Input
                id="name"
                type="text"
                className="h-11"
                placeholder={t("auth.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dob" className="text-sm font-medium">
                {t("auth.dateOfBirth")}
              </label>
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
                className="h-11"
                placeholder="19900101"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={loading}
                autoComplete="bday"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !isFormValid}
            >
              {loading ? t("auth.success.loggingIn") : t("auth.login")}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("auth.loginFieldLoginOnly")}
              <br />
              {t("auth.loginFieldGuide")}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
