import { describe, expect, it, vi } from "vitest";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { Toaster } from "../components/toaster";
import { reducer, toast, useToast } from "../components/use-toast";

describe("use-toast reducer", () => {
  it("supports add/update/dismiss/remove operations", () => {
    const initial = {
      toasts: [] as Array<{ id: string; title?: string; open?: boolean }>,
    };

    const added = reducer(initial, {
      type: "ADD_TOAST",
      toast: { id: "1", title: "초기", open: true },
    });
    expect(added.toasts).toHaveLength(1);
    expect(added.toasts[0]?.title).toBe("초기");

    const updated = reducer(added, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "변경됨" },
    });
    expect(updated.toasts[0]?.title).toBe("변경됨");

    const dismissed = reducer(updated, {
      type: "DISMISS_TOAST",
      toastId: "1",
    });
    expect(dismissed.toasts[0]?.open).toBe(false);

    const removed = reducer(dismissed, {
      type: "REMOVE_TOAST",
      toastId: "1",
    });
    expect(removed.toasts).toHaveLength(0);

    const dismissOneOfMany = reducer(
      {
        toasts: [
          { id: "1", title: "유지", open: true },
          { id: "2", title: "닫힘 대상", open: true },
        ],
      },
      {
        type: "DISMISS_TOAST",
        toastId: "2",
      },
    );
    expect(dismissOneOfMany.toasts.find((item) => item.id === "2")?.open).toBe(
      false,
    );
    expect(dismissOneOfMany.toasts.find((item) => item.id === "1")?.open).toBe(
      true,
    );
  });

  it("enforces toast limit and supports update miss + dismiss/remove all", () => {
    const initial = {
      toasts: [] as Array<{ id: string; title?: string; open?: boolean }>,
    };

    const withFirst = reducer(initial, {
      type: "ADD_TOAST",
      toast: { id: "1", title: "첫번째", open: true },
    });
    const withSecond = reducer(withFirst, {
      type: "ADD_TOAST",
      toast: { id: "2", title: "두번째", open: true },
    });

    expect(withSecond.toasts).toHaveLength(1);
    expect(withSecond.toasts[0]?.id).toBe("2");

    const updateMiss = reducer(withSecond, {
      type: "UPDATE_TOAST",
      toast: { id: "does-not-exist", title: "미적용" },
    });
    expect(updateMiss).toEqual(withSecond);

    const dismissAll = reducer(
      {
        toasts: [
          { id: "a", title: "하나", open: true },
          { id: "b", title: "둘", open: true },
        ],
      },
      { type: "DISMISS_TOAST" },
    );
    expect(dismissAll.toasts.every((item) => item.open === false)).toBe(true);

    const dismissOne = reducer(
      {
        toasts: [
          { id: "x", title: "유지", open: true },
          { id: "y", title: "닫힘", open: true },
        ],
      },
      { type: "DISMISS_TOAST", toastId: "y" },
    );
    expect(dismissOne.toasts.find((item) => item.id === "x")?.open).toBe(true);
    expect(dismissOne.toasts.find((item) => item.id === "y")?.open).toBe(false);

    const removeAll = reducer(dismissAll, { type: "REMOVE_TOAST" });
    expect(removeAll.toasts).toHaveLength(0);
  });
});

describe("useToast hook API", () => {
  it("creates, updates, and dismisses toast entries", () => {
    const { result } = renderHook(() => useToast());

    let id = "";
    act(() => {
      const created = result.current.toast({
        title: "생성됨",
        description: "메시지",
      });
      id = created.id;
      created.update({
        title: "업데이트됨",
        description: "수정된 메시지",
        id,
        open: true,
      });
      created.dismiss();
    });

    const current = result.current.toasts.find((item) => item.id === id);
    expect(current?.title).toBe("업데이트됨");
    expect(current?.open).toBe(false);
  });

  it("supports dismiss-by-id through hook API", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });

    let id = "";
    act(() => {
      id = result.current.toast({ title: "타이머 제거" }).id;
    });

    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.toasts.find((item) => item.id === id)?.open).toBe(
      false,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts.find((item) => item.id === id)?.open).toBe(
      false,
    );

    vi.useRealTimers();
  });

  it("cleans up subscription listeners on unmount", () => {
    const spliceSpy = vi.spyOn(Array.prototype, "splice");
    const { unmount } = renderHook(() => useToast());

    unmount();
    expect(spliceSpy).toHaveBeenCalled();
    spliceSpy.mockRestore();
  });

  it("dismisses toast when onOpenChange receives false", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });

    let id = "";
    act(() => {
      id = result.current.toast({ title: "자동 닫힘" }).id;
    });

    const created = result.current.toasts.find((item) => item.id === id);
    expect(created?.open).toBe(true);

    act(() => {
      created?.onOpenChange?.(true);
    });
    expect(result.current.toasts.find((item) => item.id === id)?.open).toBe(
      true,
    );

    act(() => {
      created?.onOpenChange?.(false);
    });
    expect(result.current.toasts.find((item) => item.id === id)?.open).toBe(
      false,
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(
      result.current.toasts.find((item) => item.id === id),
    ).toBeUndefined();

    vi.useRealTimers();
  });

  it("handles listener cleanup when listener is already missing", () => {
    const indexOfSpy = vi.spyOn(Array.prototype, "indexOf").mockReturnValue(-1);
    const spliceSpy = vi.spyOn(Array.prototype, "splice");

    const { unmount } = renderHook(() => useToast());
    unmount();

    expect(spliceSpy).not.toHaveBeenCalled();

    spliceSpy.mockRestore();
    indexOfSpy.mockRestore();
  });
});

describe("Toaster integration", () => {
  it("renders emitted toast content in UI", async () => {
    render(<Toaster />);

    act(() => {
      toast({ title: "알림", description: "정상 처리되었습니다." });
    });

    expect(await screen.findByText("알림")).toBeInTheDocument();
    expect(screen.getByText("정상 처리되었습니다.")).toBeInTheDocument();

    act(() => {
      toast({ title: "정리", description: "clean", open: false });
    });

    await waitFor(() => {
      expect(screen.queryByText("알림")).not.toBeInTheDocument();
    });
  });
});
