"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Badge,
  useToast,
} from "@safetywallet/ui";
import { DataTable, type Column } from "@/components/data-table";
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  type PointPolicy,
  type CreatePolicyBody,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";

export default function PointPoliciesPage() {
  const { currentSiteId } = useAuthStore();
  const { data: policies = [], isLoading } = usePolicies(
    currentSiteId || undefined,
  );
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PointPolicy | null>(null);

  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const deleteMutation = useDeletePolicy();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentSiteId) return;

    const formData = new FormData(e.currentTarget);
    const data: CreatePolicyBody = {
      siteId: currentSiteId,
      name: formData.get("name") as string,
      reasonCode: formData.get("reasonCode") as string,
      description: formData.get("description") as string,
      defaultAmount: Number(formData.get("defaultAmount")),
      minAmount: formData.get("minAmount")
        ? Number(formData.get("minAmount"))
        : undefined,
      maxAmount: formData.get("maxAmount")
        ? Number(formData.get("maxAmount"))
        : undefined,
      dailyLimit: formData.get("dailyLimit")
        ? Number(formData.get("dailyLimit"))
        : undefined,
      monthlyLimit: formData.get("monthlyLimit")
        ? Number(formData.get("monthlyLimit"))
        : undefined,
    };

    try {
      await createMutation.mutateAsync(data);
      toast({ title: "정책이 생성되었습니다." });
      setIsCreateOpen(false);
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "정책 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPolicy) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      defaultAmount: Number(formData.get("defaultAmount")),
      minAmount: formData.get("minAmount")
        ? Number(formData.get("minAmount"))
        : undefined,
      maxAmount: formData.get("maxAmount")
        ? Number(formData.get("maxAmount"))
        : undefined,
      dailyLimit: formData.get("dailyLimit")
        ? Number(formData.get("dailyLimit"))
        : undefined,
      monthlyLimit: formData.get("monthlyLimit")
        ? Number(formData.get("monthlyLimit"))
        : undefined,
      isActive: formData.get("isActive") === "on",
    };

    try {
      await updateMutation.mutateAsync({ id: editingPolicy.id, data });
      toast({ title: "정책이 수정되었습니다." });
      setEditingPolicy(null);
    } catch (error) {
      toast({
        title: "수정 실패",
        description: "정책 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 정책을 삭제하시겠습니까?")) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "정책이 삭제되었습니다." });
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "정책 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const columns: Column<PointPolicy>[] = [
    {
      key: "name",
      header: "정책명",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.reasonCode}</div>
        </div>
      ),
    },
    {
      key: "defaultAmount",
      header: "기본 포인트",
      sortable: true,
      render: (item) => (
        <div className="font-mono">
          {item.defaultAmount.toLocaleString()} P
          {(item.minAmount || item.maxAmount) && (
            <div className="text-xs text-muted-foreground">
              {item.minAmount ?? 0} ~ {item.maxAmount ?? "∞"}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "limits",
      header: "한도 (일/월)",
      render: (item) => (
        <div className="text-sm">
          <div>일: {item.dailyLimit ? `${item.dailyLimit}회` : "-"}</div>
          <div>월: {item.monthlyLimit ? `${item.monthlyLimit}회` : "-"}</div>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "상태",
      sortable: true,
      render: (item) => (
        <Badge variant={item.isActive ? "default" : "secondary"}>
          {item.isActive ? "활성" : "비활성"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "관리",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditingPolicy(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-8">로딩 중...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">포인트 정책 관리</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          정책 추가
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={policies}
        searchable
        searchPlaceholder="정책명 또는 코드로 검색..."
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 포인트 정책 추가</DialogTitle>
            <DialogDescription>
              새로운 포인트 지급 정책을 생성합니다. 코드는 고유해야 합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">정책명</label>
                <Input name="name" required placeholder="예: 안전모 착용" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">정책 코드</label>
                <Input
                  name="reasonCode"
                  required
                  placeholder="SAFE_HELMET"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input name="description" placeholder="정책에 대한 설명" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">기본 포인트</label>
                <Input
                  name="defaultAmount"
                  type="number"
                  required
                  defaultValue={10}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">최소 포인트</label>
                <Input name="minAmount" type="number" placeholder="선택" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">최대 포인트</label>
                <Input name="maxAmount" type="number" placeholder="선택" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">일일 제한 (회)</label>
                <Input name="dailyLimit" type="number" placeholder="무제한" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">월간 제한 (회)</label>
                <Input name="monthlyLimit" type="number" placeholder="무제한" />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">생성</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingPolicy}
        onOpenChange={(open) => !open && setEditingPolicy(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>포인트 정책 수정</DialogTitle>
            <DialogDescription>
              정책 상세 내용을 수정합니다. 코드는 수정할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {editingPolicy && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">정책명</label>
                  <Input
                    name="name"
                    required
                    defaultValue={editingPolicy.name}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">정책 코드</label>
                  <Input
                    value={editingPolicy.reasonCode}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">설명</label>
                <Input
                  name="description"
                  defaultValue={editingPolicy.description || ""}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">기본 포인트</label>
                  <Input
                    name="defaultAmount"
                    type="number"
                    required
                    defaultValue={editingPolicy.defaultAmount}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">최소 포인트</label>
                  <Input
                    name="minAmount"
                    type="number"
                    defaultValue={editingPolicy.minAmount || ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">최대 포인트</label>
                  <Input
                    name="maxAmount"
                    type="number"
                    defaultValue={editingPolicy.maxAmount || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">일일 제한 (회)</label>
                  <Input
                    name="dailyLimit"
                    type="number"
                    defaultValue={editingPolicy.dailyLimit || ""}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">월간 제한 (회)</label>
                  <Input
                    name="monthlyLimit"
                    type="number"
                    defaultValue={editingPolicy.monthlyLimit || ""}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  name="isActive"
                  defaultChecked={editingPolicy.isActive}
                />
                <label className="text-sm font-medium">활성화 상태</label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPolicy(null)}
                >
                  취소
                </Button>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
