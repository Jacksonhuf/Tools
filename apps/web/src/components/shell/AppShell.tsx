import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { CommandBar } from "./CommandBar";
import { CommandPalette } from "./CommandPalette";
import type { AppTab } from "@/components/layout/types";

export function AppShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background" data-testid="app-shell">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CommandBar onOpenCommandPalette={() => setPaletteOpen(true)} />
        <motion.main
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 overflow-auto p-5 md:p-6"
        >
          {children}
        </motion.main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={onTabChange}
      />
    </div>
  );
}
