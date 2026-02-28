"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Coins,
  ClipboardList,
  Megaphone,
  Settings,
  ScrollText,
  Activity,
  Menu,
  X,
  LogOut,
  Trophy,
  CheckSquare,
  Clock,
  GraduationCap,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@safetywallet/ui";
import { useAuthStore } from "@/stores/auth";
import { useMySites } from "@/hooks/use-admin-api";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/posts", label: "제보 관리", icon: FileText },
  { href: "/members", label: "회원 관리", icon: Users },
  { href: "/attendance", label: "출근 현황", icon: Clock },
  { href: "/points", label: "포인트 관리", icon: Coins },
  { href: "/approvals", label: "승인 관리", icon: CheckSquare },
  { href: "/actions", label: "조치 현황", icon: ClipboardList },
  { href: "/announcements", label: "공지사항", icon: Megaphone },
  { href: "/education", label: "안전교육", icon: GraduationCap },
  { href: "/rewards", label: "포상 관리", icon: Trophy },
  { href: "/votes/candidates", label: "투표 후보 관리", icon: Trophy },
  { href: "/settings", label: "설정", icon: Settings },
  { href: "/monitoring", label: "운영 모니터링", icon: Activity },
  { href: "/audit", label: "감사 로그", icon: ScrollText },
];

/** Shared nav content used by desktop and mobile sidebar */
function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const setSiteId = useAuthStore((s) => s.setSiteId);
  const queryClient = useQueryClient();
  const { data: sitesData } = useMySites();

  const sites = sitesData ?? [];
  const currentSite = sites.find(
    (s: { siteId: string }) => s.siteId === currentSiteId,
  );

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const handleSiteSwitch = (siteId: string) => {
    setSiteId(siteId);
    setSiteDropdownOpen(false);
    queryClient.invalidateQueries();
  };

  return (
    <>
      {/* Site Switcher — desktop expanded only */}
      {!collapsed && sites.length > 0 && (
        <div className="hidden border-b border-slate-700 px-3 py-2 md:block">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
              className="flex w-full items-center justify-between rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={16} />
                <span className="truncate">
                  {currentSite?.siteName ?? "현장 선택"}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={cn(
                  "shrink-0 transition-transform",
                  siteDropdownOpen && "rotate-180",
                )}
              />
            </button>
            {siteDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md bg-slate-800 py-1 shadow-lg">
                {sites.map((site: { siteId: string; siteName: string }) => (
                  <button
                    type="button"
                    key={site.siteId}
                    onClick={() => handleSiteSwitch(site.siteId)}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                      site.siteId === currentSiteId
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white",
                    )}
                  >
                    <span className="truncate">{site.siteName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href) ?? false;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors justify-center",
                !collapsed && "md:justify-start",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon size={20} />
              {!collapsed && (
                <span className="hidden md:inline">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-slate-300 hover:bg-slate-800 hover:text-white justify-center",
            !collapsed && "md:justify-start",
          )}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          {!collapsed && <span className="hidden md:inline">로그아웃</span>}
        </Button>
      </div>
    </>
  );
}

/** Mobile top bar — shows site name, hidden on desktop */
export function MobileHeader() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { data: sitesData, isLoading: isSitesLoading } = useMySites();
  const sites = sitesData ?? [];
  const currentSite = sites.find(
    (s: { siteId: string }) => s.siteId === currentSiteId,
  );
  const headerLabel = currentSite?.siteName
    ? currentSite.siteName
    : currentSiteId && isSitesLoading
      ? "현장 불러오는 중..."
      : "송도세브란스 관리자";

  return (
    <header className="relative z-40 flex h-14 items-center gap-3 border-b bg-slate-900 px-4 text-white md:hidden">
      <span className="text-sm font-semibold truncate">{headerLabel}</span>
    </header>
  );
}

/** Sidebar — always visible. Icon-only on mobile, full/collapsible on desktop */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white transition-all duration-300 w-16",
        !collapsed && "md:w-64",
      )}
    >
      {/* Desktop header — hidden on mobile */}
      <div className="hidden h-16 items-center justify-between border-b border-slate-700 px-4 md:flex">
        {!collapsed && (
          <span className="text-lg font-bold">송도세브란스 관리자</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800"
          data-testid="mobile-menu-toggle"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </Button>
      </div>

      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
