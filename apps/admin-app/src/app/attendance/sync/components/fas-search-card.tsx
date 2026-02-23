"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from "@safetywallet/ui";
import { Search } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import {
  useSearchFasMariadb,
  type FasSearchResult,
} from "@/hooks/use-fas-sync";

type SearchResultRow = FasSearchResult & { index: number };

const searchColumns: Column<SearchResultRow>[] = [
  {
    key: "index",
    header: "No",
    render: (item) => (
      <span className="text-muted-foreground">{item.index}</span>
    ),
    className: "w-[60px]",
  },
  {
    key: "emplCd",
    header: "사번",
    render: (item) => <span className="font-mono text-xs">{item.emplCd}</span>,
  },
  {
    key: "name",
    header: "이름",
    sortable: true,
    render: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    key: "companyName",
    header: "업체명",
    sortable: true,
    render: (item) => <span className="text-sm">{item.companyName}</span>,
  },
  {
    key: "phone",
    header: "연락처",
    render: (item) => (
      <span className="font-mono text-xs">{item.phone || "-"}</span>
    ),
  },
  {
    key: "stateFlag",
    header: "상태",
    sortable: true,
    render: (item) => (
      <Badge variant={item.stateFlag === "W" ? "default" : "secondary"}>
        {item.stateFlag === "W" ? "재직" : item.stateFlag}
      </Badge>
    ),
  },
  {
    key: "entrDay",
    header: "입사일",
    render: (item) => <span className="text-sm">{item.entrDay || "-"}</span>,
  },
];

interface FasSearchCardProps {
  source?: string;
}

export function FasSearchCard({ source }: FasSearchCardProps) {
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [activeSearch, setActiveSearch] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const { data: searchData, isLoading: searchLoading } = useSearchFasMariadb({
    ...activeSearch,
    source,
  });

  const handleSearch = () => {
    if (!searchName && !searchPhone) return;
    setActiveSearch({
      name: searchName || undefined,
      phone: searchPhone || undefined,
    });
  };

  const searchResultsWithIndex = useMemo(
    () => (searchData?.results ?? []).map((r, i) => ({ ...r, index: i + 1 })),
    [searchData?.results],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          FAS MariaDB 검색
        </CardTitle>
        <CardDescription>
          FAS 원본 데이터베이스에서 근로자를 검색합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label htmlFor="fas-search-name" className="text-sm font-medium">
              이름
            </label>
            <Input
              id="fas-search-name"
              placeholder="근로자 이름"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-48"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="fas-search-phone" className="text-sm font-medium">
              연락처
            </label>
            <Input
              id="fas-search-phone"
              placeholder="전화번호"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-48"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={(!searchName && !searchPhone) || searchLoading}
          >
            <Search className="h-4 w-4 mr-2" />
            {searchLoading ? "검색 중..." : "검색"}
          </Button>
        </div>
        {searchData && (
          <>
            <p className="text-sm text-muted-foreground">
              검색 결과: {searchData.count}건
            </p>
            <DataTable
              columns={searchColumns}
              data={searchResultsWithIndex}
              searchable
              searchPlaceholder="이름 또는 업체 검색..."
              emptyMessage="검색 결과가 없습니다."
              pageSize={10}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
