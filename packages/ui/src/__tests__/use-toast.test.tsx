import { describe, expect, it } from "vitest";
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
