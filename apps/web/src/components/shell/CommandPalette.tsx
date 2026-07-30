import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgent } from "@/components/agent/AgentContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { AppTab } from "@/components/layout/types";
import { NAV_GROUPS } from "./nav-config";

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: AppTab) => void;
}) {
  const { t } = useTranslation();
  const { setPanelOpen } = useAgent();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("commandPaletteSearch")} />
      <CommandList>
        <CommandEmpty>{t("commandPaletteEmpty")}</CommandEmpty>
        {NAV_GROUPS.map((group) => (
          <CommandGroup key={group.labelKey} heading={t(group.labelKey)}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={[item.id, t(item.labelKey), ...(item.keywords ?? [])].join(
                    " "
                  )}
                  onSelect={() => {
                    onNavigate(item.id);
                    onOpenChange(false);
                  }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{t(item.labelKey)}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandGroup heading={t("commandPaletteActions")}>
          <CommandItem
            value="simulate both pricing"
            onSelect={() => {
              onNavigate("pricing");
              onOpenChange(false);
            }}
          >
            {t("commandPaletteSimulate")}
          </CommandItem>
          <CommandItem
            value="adjustments approval pending"
            onSelect={() => {
              onNavigate("adjustments");
              onOpenChange(false);
            }}
          >
            {t("commandPaletteAdjustments")}
          </CommandItem>
          <CommandItem
            value="copilot agent panel chat"
            onSelect={() => {
              setPanelOpen(true);
              onOpenChange(false);
            }}
          >
            {t("commandPaletteCopilot")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
