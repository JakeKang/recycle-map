"use client";

import { useAdminCounts } from "@/hooks/useAdminCounts";
import { MobileWorkspaceTab, useMapStore } from "@/stores/mapStore";
import { Flag, Inbox, List, MapIcon } from "lucide-react";

interface TabItem {
  id: MobileWorkspaceTab;
  label: string;
  Icon: React.ElementType;
  badgeCount?: number;
  adminOnly?: boolean;
}

interface MobileBottomTabsProps {
  isAdmin: boolean;
  onTabChange?: (tab: MobileWorkspaceTab) => void;
}

export default function MobileBottomTabs({ isAdmin, onTabChange }: MobileBottomTabsProps) {
  const { mobileTab, setMobileTab } = useMapStore();
  const { data: counts } = useAdminCounts();

  const tabs: TabItem[] = [
    { id: "canvas", label: "지도", Icon: MapIcon },
    { id: "navigator", label: "목록", Icon: List },
    {
      id: "inbox",
      label: "검토",
      Icon: Inbox,
      badgeCount: counts?.pendingSuggestions ?? 0,
      adminOnly: true,
    },
    {
      id: "reports",
      label: "신고",
      Icon: Flag,
      badgeCount: counts?.pendingReports ?? 0,
      adminOnly: true,
    },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  function handleSelect(tab: MobileWorkspaceTab) {
    setMobileTab(tab);
    onTabChange?.(tab);
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[1300] flex items-stretch border-t border-emerald-900/10 bg-white/95 backdrop-blur-sm md:hidden"
      aria-label="하단 탭 내비게이션"
    >
      {visibleTabs.map(({ id, label, Icon, badgeCount }) => {
        const isActive = mobileTab === id;
        const showBadge = isAdmin && typeof badgeCount === "number" && badgeCount > 0;

        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(id)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              isActive ? "text-emerald-900" : "text-stone-400"
            }`}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {showBadge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
            {isActive ? (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-emerald-900" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
