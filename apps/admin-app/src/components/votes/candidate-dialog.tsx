"use client";

import { useState } from "react";
import { Button, Input } from "@safetywallet/ui";
import { useMembers } from "@/hooks/use-api";
import { useAddVoteCandidate } from "@/hooks/use-votes";

export function CandidateDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const { data: members } = useMembers();
  const { mutate: addCandidate, isPending } = useAddVoteCandidate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !month) {
      alert("사용자와 월을 선택해주세요.");
      return;
    }

    addCandidate(
      { userId, month },
      {
        onSuccess: () => {
          alert("후보자가 추가되었습니다.");
          setOpen(false);
          setUserId("");
        },
        onError: (error) => {
          alert("후보자 추가 실패: " + error.message);
        },
      },
    );
  };

  if (!open) {
    return <Button onClick={() => setOpen(true)}>후보자 추가</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">투표 후보자 추가</h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="month" className="text-sm font-medium">
              투표 월
            </label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="user" className="text-sm font-medium">
              사용자 선택
            </label>
            <select
              id="user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">사용자를 선택하세요</option>
              {members?.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.nameMasked} ({member.user.phone})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
