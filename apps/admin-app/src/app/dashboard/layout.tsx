"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileHeader, MobileSidebar } from "@/components/sidebar";
import { useAuthStore } from "@/stores/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAdmin, _hasHydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuChange = useCallback((open: boolean) => {
    setMobileMenuOpen(open);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user || !isAdmin) {
      router.push("/login");
    }
  }, [user, isAdmin, _hasHydrated, router]);

  if (!_hasHydrated || !user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <MobileSidebar
        open={mobileMenuOpen}
        onOpenChange={handleMobileMenuChange}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
