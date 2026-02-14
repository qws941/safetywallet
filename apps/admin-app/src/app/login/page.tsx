"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@safetywallet/ui";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { UserRole } from "@safetywallet/types";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiFetch<{
        user: {
          id: string;
          phone: string;
          nameMasked: string;
          role: UserRole;
        };
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (
        result.user.role !== UserRole.SITE_ADMIN &&
        result.user.role !== UserRole.SUPER_ADMIN
      ) {
        setError("관리자 권한이 없습니다");
        return;
      }

      login(result.user, result.tokens);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error && "status" in err) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다");
      } else {
        setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && username && password) {
      handleLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">안전지갑 관리자</h1>
          <p className="mt-2 text-muted-foreground">
            관리자 계정으로 로그인하세요
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">아이디</label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">비밀번호</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!username || !password || isLoading}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
