import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { AppTab } from "@/components/layout/types";
import { APP_LOGO_ICON, NAV_GROUPS } from "./nav-config";

const SIDEBAR_KEY = "mx-pricing-sidebar-collapsed";

export function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const LogoIcon = APP_LOGO_ICON;

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <div
          className={cn(
            "flex h-12 items-center border-b border-sidebar-border/80",
            collapsed ? "justify-center px-2" : "gap-2.5 px-3"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <LogoIcon className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              {t("appTitle")}
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  {t(group.labelKey)}
                </p>
              )}
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  const isCopilot = item.id === "copilot";

                  const button = (
                    <button
                      type="button"
                      data-testid={item.testId}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "group relative flex w-full items-center rounded-md text-left text-sm font-medium transition-colors",
                        collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary" : "opacity-70"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate">{t(item.labelKey)}</span>
                          {isCopilot && (
                            <span
                              className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
                              aria-hidden
                            />
                          )}
                        </>
                      )}
                    </button>
                  );

                  return (
                    <li key={item.id}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        button
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border/80 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "px-0"
            )}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t("sidebarExpand") : t("sidebarCollapse")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">{t("sidebarCollapse")}</span>
              </>
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
