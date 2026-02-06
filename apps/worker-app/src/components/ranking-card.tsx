"use client";

import { Card, CardContent, Skeleton } from "@safetywallet/ui";
import { Trophy } from "lucide-react";
import Link from "next/link";

interface RankingCardProps {
  myRank: number | null;
  totalParticipants?: number;
  isLoading?: boolean;
}

export function RankingCard({
  myRank,
  totalParticipants,
  isLoading,
}: RankingCardProps) {
  if (isLoading) {
    return <Skeleton className="h-full w-full min-h-[120px]" />;
  }

  return (
    <Link href="/points" className="block h-full">
      <Card className="h-full bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-200 hover:shadow-md transition-all cursor-pointer overflow-hidden relative">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Trophy className="w-24 h-24 text-amber-600 transform rotate-12" />
        </div>

        <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-500 rounded-full text-white shadow-sm">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="font-bold text-amber-800 text-sm tracking-tight">
              이번 달 순위
            </span>
          </div>

          <div className="flex flex-col items-start">
            {myRank ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-amber-900 leading-none">
                    #{myRank}
                  </span>
                  {totalParticipants && (
                    <span className="text-xs text-amber-700 font-medium">
                      / {totalParticipants}명
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  더 모아서 1등 도전!
                </p>
              </>
            ) : (
              <div className="text-amber-800 font-medium text-sm">
                아직 순위가 없어요
                <span className="block text-xs text-amber-600 mt-0.5 font-normal">
                  포인트를 모아보세요!
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
