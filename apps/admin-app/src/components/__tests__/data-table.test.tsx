import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "@/components/data-table";

interface Row {
  name: string;
  status: string;
}

const columns: Column<Row>[] = [
  { key: "name", header: "이름", sortable: true },
  { key: "status", header: "상태" },
];

const rows: Row[] = [
  { name: "홍길동", status: "대기" },
  { name: "김철수", status: "승인" },
  { name: "이영희", status: "거절" },
];

describe("DataTable", () => {
  it("renders and filters by search input", () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder="검색"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("검색"), {
      target: { value: "김철수" },
    });

    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.queryByText("홍길동")).not.toBeInTheDocument();
  });

  it("sorts by sortable column when header clicked", () => {
    render(<DataTable columns={columns} data={rows} pageSize={10} />);
    fireEvent.click(screen.getByText("이름"));

    const cells = screen
      .getAllByRole("cell")
      .filter((cell) =>
        ["김철수", "이영희", "홍길동"].includes(cell.textContent ?? ""),
      );
    expect(cells[0]).toHaveTextContent("김철수");
  });

  it("calls row click and selection callbacks", () => {
    const onRowClick = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows.slice(0, 2)}
        onRowClick={onRowClick}
        selectable
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByText("홍길동"));
    expect(onRowClick).toHaveBeenCalled();

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(onSelectionChange).toHaveBeenCalledWith(rows.slice(0, 2));
  });
});
