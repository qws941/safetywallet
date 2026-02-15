import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog";

describe("Dialog", () => {
  it("opens and closes with trigger and close button", async () => {
    render(
      <Dialog>
        <DialogTrigger>열기</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>모달 제목</DialogTitle>
            <DialogDescription>모달 설명</DialogDescription>
          </DialogHeader>
          <DialogFooter>내용</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "열기" }));

    expect(
      screen.getByRole("heading", { name: "모달 제목" }),
    ).toBeInTheDocument();
    expect(screen.getByText("모달 설명")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "모달 제목" }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("AlertDialog", () => {
  it("renders content and supports cancel interaction", async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>삭제하기</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));

    expect(
      screen.getByRole("heading", { name: "정말 삭제하시겠습니까?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이 작업은 되돌릴 수 없습니다."),
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "취소" });
    const actionButton = screen.getByRole("button", { name: "확인" });
    expect(cancelButton.className).toContain("border");
    expect(actionButton.className).toContain("bg-primary");

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "정말 삭제하시겠습니까?" }),
      ).not.toBeInTheDocument();
    });
  });
});
