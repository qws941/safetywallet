import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

describe("Table UI primitives", () => {
  it("renders semantic table structure and content", () => {
    render(
      <Table>
        <TableCaption>테이블 설명</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>홍길동</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("테이블 설명")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "이름" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "홍길동" })).toBeInTheDocument();
  });
});
