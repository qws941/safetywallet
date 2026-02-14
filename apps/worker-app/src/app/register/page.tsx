"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@safetywallet/ui";
import { apiFetch } from "@/lib/api";
import type { ApiResponse } from "@safetywallet/types";

const ERROR_MESSAGES: Record<string, string> = {
  USER_EXISTS: "이미 등록된 사용자입니다. 로그인 페이지로 이동해주세요.",
  DEVICE_LIMIT: "이 기기에서 더 이상 계정을 만들 수 없습니다.",
  MISSING_FIELDS: "모든 항목을 입력해주세요.",
  RATE_LIMIT_EXCEEDED: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
};

function parseErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      const code = parsed?.error?.code;
      if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
      }
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      return err.message || "회원가입에 실패했습니다.";
    }
  }
  return "회원가입에 실패했습니다.";
}

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch<ApiResponse<{ userId: string }>>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          dob: dob.trim(),
        }),
        skipAuth: true,
      });

      setSuccess(true);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    phone.trim().length > 0 && name.trim().length > 0 && dob.trim().length > 0;

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">가입 완료</CardTitle>
            <CardDescription>
              회원가입이 완료되었습니다. 로그인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">로그인하기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>신규 사용자 등록</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                이름
              </label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                전화번호
              </label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dob" className="text-sm font-medium">
                생년월일
              </label>
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
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
              className="w-full"
              disabled={loading || !isFormValid}
            >
              {loading ? "처리 중..." : "가입하기"}
            </Button>

            <p className="text-sm text-muted-foreground text-center mt-4">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary underline">
                로그인
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
