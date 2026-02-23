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
import { Button, Sheet, SheetContent, SheetTitle } from "@safetywallet/ui";
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

/** Shared nav content used by both desktop sidebar and mobile sheet */
function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
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
      {/* Site Switcher */}
      {!collapsed && sites.length > 0 && (
        <div className="border-b border-slate-700 px-3 py-2">
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
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center",
          )}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          {!collapsed && <span>로그아웃</span>}
        </Button>
      </div>
    </>
  );
}

/** Mobile top bar with hamburger menu */
export function MobileHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { data: sitesData } = useMySites();
  const sites = sitesData ?? [];
  const currentSite = sites.find(
    (s: { siteId: string }) => s.siteId === currentSiteId,
  );

  return (
    <header className="relative z-40 flex h-14 items-center gap-3 border-b bg-slate-900 px-4 text-white md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        aria-label="메뉴 열기"
        data-testid="mobile-menu-toggle"
        className="shrink-0 touch-manipulation text-white hover:bg-slate-800"
      >
        <Menu size={20} />
      </Button>
      <span className="text-sm font-semibold truncate">
        {currentSite?.siteName ?? "송도세브란스 관리자"}
      </span>
    </header>
  );
}

/** Desktop sidebar - hidden on mobile */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!collapsed && (
          <span className="text-lg font-bold">송도세브란스 관리자</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </Button>
      </div>

      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}

/** Mobile sidebar sheet drawer */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-72 flex-col bg-slate-900 p-0 text-white border-slate-700 [&>button]:text-white"
      >
        <SheetTitle className="sr-only">메뉴</SheetTitle>
        <div className="flex h-14 items-center border-b border-slate-700 px-4">
          <span className="text-lg font-bold">송도세브란스 관리자</span>
        </div>
        <SidebarNav collapsed={false} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
